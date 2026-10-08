import { randomUUID } from 'node:crypto';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { z } from 'zod';
import {
  createScanRequestSchema,
  cognitoSubjectSchema,
  uploadRequestSchema,
  wasteScanSchema,
  type WasteScan,
  type UploadResponse,
  type UploadRequest,
} from '@waste2watt/shared';

export interface ScanRecord extends WasteScan {
  ownerId: string;
  createdAtScanId: string;
  objectKey?: string;
}
export interface ScanRepository {
  create(scan: ScanRecord): Promise<void>;
  get(ownerId: string, scanId: string): Promise<ScanRecord | undefined>;
  list(
    ownerId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: ScanRecord[]; nextCursor?: string }>;
  prepareUpload(scan: ScanRecord, key: string, input: UploadRequest, now: string): Promise<void>;
  transition(
    scan: ScanRecord,
    from: string[],
    to: WasteScan['status'],
    now: string,
    failureCode?: WasteScan['failureCode'],
  ): Promise<void>;
}
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function extractIdentity(event: APIGatewayProxyEventV2, clientId: string) {
  const claims = (event as APIGatewayProxyEventV2WithJWTAuthorizer).requestContext.authorizer?.jwt
    ?.claims;
  const sub = cognitoSubjectSchema.safeParse(claims?.sub);
  if (
    !sub.success ||
    claims?.token_use !== 'access' ||
    claims.client_id !== clientId ||
    typeof claims.scope !== 'string' ||
    !claims.scope.split(' ').includes('aws.cognito.signin.user.admin')
  ) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in again.');
  }
  const org = claims['custom:organizationId'];
  return {
    userId: sub.data,
    ...(typeof org === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(org)
      ? { organizationId: org }
      : {}),
  };
}
export interface HandlerDependencies {
  repository: ScanRepository;
  clientId: string;
  signUpload(key: string, input: UploadRequest): Promise<UploadResponse>;
  now?: () => string;
  uuid?: () => string;
  log?: (entry: Record<string, unknown>) => void;
}
export function createHandler(deps: HandlerDependencies) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const requestId = event.requestContext.requestId;
    const respond = (statusCode: number, body: unknown) => {
      if (statusCode < 400) deps.log?.({ requestId, route: event.routeKey, statusCode });
      return {
        statusCode,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        body: JSON.stringify(body),
      };
    };
    try {
      const identity = extractIdentity(event, deps.clientId);
      const now = (deps.now ?? (() => new Date().toISOString()))();
      const id = deps.uuid ?? randomUUID;
      const body = () => {
        if (!event.body || event.body.length > 4096 || event.isBase64Encoded)
          throw new HttpError(400, 'INVALID_REQUEST', 'Provide a valid JSON request.');
        try {
          return JSON.parse(event.body) as unknown;
        } catch {
          throw new HttpError(400, 'INVALID_REQUEST', 'Provide a valid JSON request.');
        }
      };
      const ownScan = async () => {
        const scanId = z.uuid().parse(event.pathParameters?.scanId);
        const scan = await deps.repository.get(identity.userId, scanId);
        if (!scan || scan.ownerId !== identity.userId || scan.userId !== identity.userId)
          throw new HttpError(404, 'NOT_FOUND', 'Scan not found.');
        return scan;
      };
      switch (event.routeKey) {
        case 'POST /scans': {
          const input = createScanRequestSchema.parse(body());
          const scanId = id();
          const scan: ScanRecord = {
            ...input,
            ...identity,
            ownerId: identity.userId,
            scanId,
            status: 'CREATED',
            createdAt: now,
            updatedAt: now,
            createdAtScanId: `${now}#${scanId}`,
          };
          await deps.repository.create(scan);
          return respond(201, { scanId, status: scan.status });
        }
        case 'POST /scans/{scanId}/upload-url': {
          const input = uploadRequestSchema.parse(body());
          const scan = await ownScan();
          if (!['CREATED', 'UPLOADING'].includes(scan.status))
            throw new HttpError(409, 'INVALID_STATE', 'This scan no longer accepts uploads.');
          if (
            scan.status === 'UPLOADING' &&
            (scan.contentType !== input.contentType ||
              scan.sizeBytes !== input.sizeBytes ||
              !scan.objectKey)
          )
            throw new HttpError(409, 'INVALID_STATE', 'Retry with the same image type and size.');
          const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[
            input.contentType
          ];
          const key =
            scan.objectKey ?? `private/${identity.userId}/${scan.scanId}/${id()}.${extension}`;
          const upload = await deps.signUpload(key, input);
          await deps.repository.prepareUpload(scan, key, input, now);
          return respond(200, upload);
        }
        case 'GET /scans': {
          const query = z
            .object({
              limit: z.coerce.number().int().min(1).max(50).default(20),
              cursor: z.string().min(1).max(2048).optional(),
            })
            .strict()
            .parse(event.queryStringParameters ?? {});
          const page = await deps.repository.list(identity.userId, query.limit, query.cursor);
          if (
            page.items.some(
              (scan) => scan.ownerId !== identity.userId || scan.userId !== identity.userId,
            )
          )
            throw new Error('Ownership invariant failed');
          return respond(200, {
            ...page,
            items: page.items.map((scan) => wasteScanSchema.parse(scan)),
          });
        }
        case 'GET /scans/{scanId}':
          return respond(200, wasteScanSchema.parse(await ownScan()));
        default:
          return respond(501, {
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'This feature is available in a future phase.',
              requestId,
            },
          });
      }
    } catch (error) {
      const safe =
        error instanceof HttpError
          ? error
          : error instanceof z.ZodError
            ? new HttpError(
                400,
                'INVALID_REQUEST',
                'Check the request fields, image type, and size.',
              )
            : new HttpError(
                500,
                'INTERNAL_ERROR',
                'The request could not be completed. Please retry.',
              );
      deps.log?.({
        requestId,
        route: event.routeKey,
        statusCode: safe.status,
        errorCode: safe.code,
      });
      return respond(safe.status, { error: { code: safe.code, message: safe.message, requestId } });
    }
  };
}
