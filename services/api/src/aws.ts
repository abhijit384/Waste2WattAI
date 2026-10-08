import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { type UploadRequest, type WasteScan } from '@waste2watt/shared';
import { HttpError, type ScanRecord, type ScanRepository } from './scans.ts';

const cursorSchema = z
  .object({ ownerId: z.uuid(), scanId: z.uuid(), createdAtScanId: z.string().max(100) })
  .strict();
export class DynamoScanRepository implements ScanRepository {
  readonly client: DynamoDBDocumentClient;
  readonly tableName: string;
  constructor(client: DynamoDBDocumentClient, tableName: string) {
    this.client = client;
    this.tableName = tableName;
  }
  async create(scan: ScanRecord) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: scan,
        ConditionExpression: 'attribute_not_exists(ownerId) AND attribute_not_exists(scanId)',
      }),
    );
  }
  async get(ownerId: string, scanId: string) {
    const result = await this.client.send(
      new GetCommand({ TableName: this.tableName, Key: { ownerId, scanId }, ConsistentRead: true }),
    );
    return result.Item as ScanRecord | undefined;
  }
  async list(ownerId: string, limit: number, cursor?: string) {
    let key: z.infer<typeof cursorSchema> | undefined;
    if (cursor) {
      try {
        key = cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
      } catch {
        throw new HttpError(400, 'INVALID_CURSOR', 'Invalid pagination cursor.');
      }
      if (key.ownerId !== ownerId)
        throw new HttpError(400, 'INVALID_CURSOR', 'Invalid pagination cursor.');
    }
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'OwnerCreatedAt',
        KeyConditionExpression: 'ownerId = :owner',
        ExpressionAttributeValues: { ':owner': ownerId },
        ScanIndexForward: false,
        Limit: limit,
        ...(key ? { ExclusiveStartKey: key } : {}),
      }),
    );
    return {
      items: (result.Items ?? []) as ScanRecord[],
      ...(result.LastEvaluatedKey
        ? { nextCursor: Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url') }
        : {}),
    };
  }
  async prepareUpload(scan: ScanRecord, key: string, input: UploadRequest, now: string) {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { ownerId: scan.ownerId, scanId: scan.scanId },
          UpdateExpression:
            'SET #s = :uploading, objectKey = :key, contentType = :type, sizeBytes = :size, updatedAt = :now',
          ConditionExpression:
            '#s = :expected AND (attribute_not_exists(objectKey) OR objectKey = :key)',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: {
            ':uploading': 'UPLOADING',
            ':expected': scan.status,
            ':key': key,
            ':type': input.contentType,
            ':size': input.sizeBytes,
            ':now': now,
          },
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
        throw new HttpError(409, 'INVALID_STATE', 'Scan changed. Reload before retrying.');
      throw error;
    }
  }
  async transition(
    scan: ScanRecord,
    from: string[],
    to: WasteScan['status'],
    now: string,
    failureCode?: WasteScan['failureCode'],
  ) {
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { ownerId: scan.ownerId, scanId: scan.scanId },
        UpdateExpression:
          'SET #s = :next, updatedAt = :now' + (failureCode ? ', failureCode = :failure' : ''),
        ConditionExpression: `objectKey = :key AND #s IN (${from.map((_, i) => `:from${i}`).join(', ')})`,
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':next': to,
          ':now': now,
          ':key': scan.objectKey,
          ...Object.fromEntries(from.map((status, i) => [`:from${i}`, status])),
          ...(failureCode ? { ':failure': failureCode } : {}),
        },
      }),
    );
  }
}
export function signUpload(s3: S3Client, bucket: string) {
  return async (key: string, input: UploadRequest) => {
    const signed = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Expires: 300,
      Fields: {
        'Content-Type': input.contentType,
        'x-amz-server-side-encryption': 'AES256',
        success_action_status: '204',
      },
      Conditions: [
        ['content-length-range', input.sizeBytes, input.sizeBytes],
        ['eq', '$Content-Type', input.contentType],
        ['eq', '$key', key],
        { 'x-amz-server-side-encryption': 'AES256' },
        { success_action_status: '204' },
      ],
    });
    return { ...signed, expiresAt: new Date(Date.now() + 300_000).toISOString() };
  };
}
export function runtimeClients() {
  const region = process.env.AWS_REGION;
  if (!region || !process.env.WASTE_SCANS_TABLE || !process.env.IMAGE_BUCKET)
    throw new Error('Missing service configuration');
  return {
    repository: new DynamoScanRepository(
      DynamoDBDocumentClient.from(new DynamoDBClient({ region, maxAttempts: 3 }), {
        marshallOptions: { removeUndefinedValues: true },
      }),
      process.env.WASTE_SCANS_TABLE,
    ),
    s3: new S3Client({ region, maxAttempts: 3 }),
    bucket: process.env.IMAGE_BUCKET,
  };
}
