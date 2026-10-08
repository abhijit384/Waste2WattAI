import assert from 'node:assert/strict';
import test from 'node:test';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { type DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  createHandler,
  extractIdentity,
  type ScanRecord,
  type ScanRepository,
} from '../services/api/src/scans.ts';
import { DynamoScanRepository, signUpload } from '../services/api/src/aws.ts';
import { createStatusHandler } from '../services/api/src/status.ts';
import { MAX_IMAGE_BYTES } from '@waste2watt/shared';
const owner = '10000000-0000-4000-8000-000000000001',
  other = '10000000-0000-4000-8000-000000000002',
  scanId = '10000000-0000-4000-8000-000000000003',
  uploadId = '10000000-0000-4000-8000-000000000004';
const now = '2026-10-08T00:00:00.000Z',
  objectKey = `private/${owner}/${scanId}/${uploadId}.png`;
function event(routeKey: string, body?: unknown, userId = owner): APIGatewayProxyEventV2 {
  return {
    routeKey,
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    pathParameters: { scanId },
    requestContext: {
      requestId: 'test-request',
      authorizer: {
        jwt: {
          claims: {
            sub: userId,
            client_id: 'test-client',
            token_use: 'access',
            scope: 'aws.cognito.signin.user.admin',
          },
        },
      },
    },
  } as unknown as APIGatewayProxyEventV2;
}
function claims(e: APIGatewayProxyEventV2) {
  return (
    e.requestContext as unknown as { authorizer: { jwt: { claims: Record<string, string> } } }
  ).authorizer.jwt.claims;
}
function record(): ScanRecord {
  return {
    scanId,
    ownerId: owner,
    userId: owner,
    quantityKg: 2,
    unit: 'kg',
    status: 'CREATED',
    createdAt: now,
    updatedAt: now,
    createdAtScanId: `${now}#${scanId}`,
  };
}
function fixture() {
  const rows = new Map<string, ScanRecord>(),
    logs: unknown[] = [],
    signed: string[] = [];
  const repository: ScanRepository = {
    create: async (scan) => {
      rows.set(`${scan.ownerId}:${scan.scanId}`, scan);
    },
    get: async (user, id) => rows.get(`${user}:${id}`),
    list: async (user) => ({ items: [...rows.values()].filter((scan) => scan.ownerId === user) }),
    prepareUpload: async (scan, key, input, date) => {
      Object.assign(scan, { objectKey: key, ...input, status: 'UPLOADING', updatedAt: date });
    },
    transition: async (scan, from, status, date, failureCode) => {
      assert.ok(from.includes(scan.status));
      Object.assign(scan, { status, updatedAt: date, ...(failureCode ? { failureCode } : {}) });
    },
  };
  const handler = createHandler({
    repository,
    clientId: 'test-client',
    now: () => now,
    uuid: () => scanId,
    signUpload: async (key) => {
      signed.push(key);
      return {
        url: 'https://test-only-bucket.s3.us-east-1.amazonaws.com',
        fields: { key },
        expiresAt: now,
      };
    },
    log: (entry) => logs.push(entry),
  });
  return { rows, repository, handler, logs, signed };
}
test('extracts Cognito identity from trusted access claims', () =>
  assert.equal(extractIdentity(event('GET /scans'), 'test-client').userId, owner));
test('rejects absent claims, ID token, wrong client, invalid sub and missing scope', async () => {
  const f = fixture();
  assert.equal(
    (
      await f.handler({
        requestContext: { requestId: 'id' },
        routeKey: 'GET /scans',
      } as APIGatewayProxyEventV2)
    ).statusCode,
    401,
  );
  for (const mutation of [
    { token_use: 'id' },
    { client_id: 'other' },
    { scope: 'other' },
    { sub: 'invalid' },
  ]) {
    const e = event('GET /scans');
    Object.assign(claims(e), mutation);
    assert.equal((await f.handler(e)).statusCode, 401);
  }
});
test('create persists owned secure ID, timestamps, index key and CREATED status', async () => {
  const f = fixture();
  const response = await f.handler(
    event('POST /scans', { quantityKg: 2, unit: 'kg', sourceLabel: 'Canteen' }),
  );
  assert.equal(response.statusCode, 201);
  assert.deepEqual(JSON.parse(response.body!), { scanId, status: 'CREATED' });
  assert.equal(f.rows.get(`${owner}:${scanId}`)?.userId, owner);
  assert.equal(f.rows.get(`${owner}:${scanId}`)?.createdAtScanId, `${now}#${scanId}`);
});
test('rejects body user/org identity and invalid quantities/units', async () => {
  for (const body of [
    { quantityKg: 2, unit: 'kg', userId: other },
    { quantityKg: 2, unit: 'kg', organizationId: 'client-org' },
    { quantityKg: -1, unit: 'kg' },
    { quantityKg: 2, unit: 'tonnes' },
  ]) {
    const f = fixture();
    assert.equal((await f.handler(event('POST /scans', body))).statusCode, 400);
    assert.equal(f.rows.size, 0);
  }
});
test('organization is accepted only from validated claims', async () => {
  const f = fixture(),
    e = event('POST /scans', { quantityKg: 2, unit: 'kg' });
  claims(e)['custom:organizationId'] = 'trusted-org';
  await f.handler(e);
  assert.equal(f.rows.get(`${owner}:${scanId}`)?.organizationId, 'trusted-org');
});
test('malformed and oversized JSON returns safe validation errors', async () => {
  for (const body of ['{bad', 'x'.repeat(4097)]) {
    const e = event('POST /scans');
    e.body = body;
    assert.equal((await fixture().handler(e)).statusCode, 400);
  }
});
test('get checks ownership and omits internal object keys', async () => {
  const f = fixture();
  f.rows.set(`${owner}:${scanId}`, { ...record(), objectKey });
  assert.equal((await f.handler(event('GET /scans/{scanId}', undefined, other))).statusCode, 404);
  const response = await f.handler(event('GET /scans/{scanId}'));
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body!).objectKey, undefined);
});
test('checks ownership before issuing upload credentials', async () => {
  const f = fixture();
  f.rows.set(`${owner}:${scanId}`, record());
  assert.equal(
    (
      await f.handler(
        event(
          'POST /scans/{scanId}/upload-url',
          { contentType: 'image/png', sizeBytes: 10 },
          other,
        ),
      )
    ).statusCode,
    404,
  );
  assert.equal(f.signed.length, 0);
});
test('rejects unsupported MIME, oversized/empty uploads, and client keys', async () => {
  for (const body of [
    { contentType: 'image/svg+xml', sizeBytes: 10 },
    { contentType: 'image/png', sizeBytes: MAX_IMAGE_BYTES + 1 },
    { contentType: 'image/png', sizeBytes: 0 },
    { contentType: 'image/png', sizeBytes: 10, key: 'attacker' },
  ]) {
    const f = fixture();
    f.rows.set(`${owner}:${scanId}`, record());
    assert.equal((await f.handler(event('POST /scans/{scanId}/upload-url', body))).statusCode, 400);
    assert.equal(f.signed.length, 0);
  }
});
test('generates private key server-side and records UPLOADING before returning policy', async () => {
  const f = fixture();
  f.rows.set(`${owner}:${scanId}`, record());
  const response = await f.handler(
    event('POST /scans/{scanId}/upload-url', { contentType: 'image/jpeg', sizeBytes: 10 }),
  );
  assert.equal(response.statusCode, 200);
  assert.equal(f.signed[0], `private/${owner}/${scanId}/${scanId}.jpg`);
  assert.equal(f.rows.get(`${owner}:${scanId}`)?.status, 'UPLOADING');
});
test('retry reuses exact existing key and terminal scans reject re-upload', async () => {
  const f = fixture(),
    scan: ScanRecord = {
      ...record(),
      objectKey,
      contentType: 'image/png',
      sizeBytes: 10,
      status: 'UPLOADING',
    };
  f.rows.set(`${owner}:${scanId}`, scan);
  assert.equal(
    (
      await f.handler(
        event('POST /scans/{scanId}/upload-url', { contentType: 'image/png', sizeBytes: 10 }),
      )
    ).statusCode,
    200,
  );
  assert.equal(f.signed[0], objectKey);
  assert.equal(
    (
      await f.handler(
        event('POST /scans/{scanId}/upload-url', { contentType: 'image/png', sizeBytes: 11 }),
      )
    ).statusCode,
    409,
  );
  scan.status = 'FAILED';
  assert.equal(
    (
      await f.handler(
        event('POST /scans/{scanId}/upload-url', { contentType: 'image/png', sizeBytes: 10 }),
      )
    ).statusCode,
    409,
  );
});
test('lists only owner rows and validates limits', async () => {
  const f = fixture();
  f.rows.set(`${owner}:${scanId}`, record());
  f.rows.set(`${other}:${scanId}`, { ...record(), ownerId: other, userId: other });
  assert.equal(JSON.parse((await f.handler(event('GET /scans'))).body!).items.length, 1);
  for (const limit of ['0', '51', '-5', 'bad']) {
    const e = event('GET /scans');
    e.queryStringParameters = { limit };
    assert.equal((await f.handler(e)).statusCode, 400);
  }
});
test('returns safe internal errors and logs no JWT/user headers', async () => {
  const f = fixture();
  f.repository.create = async () => {
    throw new Error('secret trace');
  };
  const response = await f.handler(event('POST /scans', { quantityKg: 2, unit: 'kg' }));
  assert.equal(response.statusCode, 500);
  assert.ok(!response.body!.includes('secret'));
  assert.ok(!JSON.stringify(f.logs).includes(owner));
});
test('adapter uses descending owner-index Query and owner-bound pagination, never Scan', async () => {
  const commands: unknown[] = [];
  const client = {
    send: async (command: unknown) => {
      commands.push(command);
      return {
        Items: [],
        LastEvaluatedKey: { ownerId: owner, scanId, createdAtScanId: `${now}#${scanId}` },
      };
    },
  } as unknown as DynamoDBDocumentClient;
  const repository = new DynamoScanRepository(client, 'TestOnlyTable'),
    page = await repository.list(owner, 12);
  const command = commands[0] as QueryCommand;
  assert.ok(command instanceof QueryCommand);
  assert.equal(command.input.IndexName, 'OwnerCreatedAt');
  assert.deepEqual(command.input.ExpressionAttributeValues, { ':owner': owner });
  assert.equal(command.input.ScanIndexForward, false);
  await repository.list(owner, 12, page.nextCursor);
  assert.ok((commands[1] as QueryCommand).input.ExclusiveStartKey);
  await assert.rejects(
    repository.list(
      owner,
      12,
      Buffer.from(JSON.stringify({ ownerId: other, scanId, createdAtScanId: now })).toString(
        'base64url',
      ),
    ),
  );
  await assert.rejects(repository.list(owner, 12, 'broken'));
  assert.equal(commands.length, 2);
});
test('adapter gets by owner key with strong consistency', async () => {
  let captured: unknown;
  const client = {
    send: async (command: unknown) => {
      captured = command;
      return {};
    },
  } as unknown as DynamoDBDocumentClient;
  await new DynamoScanRepository(client, 'TestOnlyTable').get(owner, scanId);
  assert.ok(captured instanceof GetCommand);
  assert.deepEqual(captured.input.Key, { ownerId: owner, scanId });
  assert.equal(captured.input.ConsistentRead, true);
});
test('SDK presigned POST enforces key/type/exact byte count/encryption with no network calls', async () => {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'TESTONLYACCESSKEY',
      secretAccessKey: 'test-only-not-a-real-secret',
    },
  });
  const signed = await signUpload(client, 'test-only-bucket')(objectKey, {
    contentType: 'image/png',
    sizeBytes: 10,
  });
  const policy = JSON.parse(Buffer.from(signed.fields.Policy!, 'base64').toString());
  for (const condition of [
    ['content-length-range', 10, 10],
    ['eq', '$Content-Type', 'image/png'],
    ['eq', '$key', objectKey],
  ])
    assert.ok(
      policy.conditions.some((c: unknown) => JSON.stringify(c) === JSON.stringify(condition)),
    );
  assert.equal(signed.fields['x-amz-server-side-encryption'], 'AES256');
  assert.ok(Date.parse(signed.expiresAt) - Date.now() <= 300_000);
  client.destroy();
});
function imageEvent(key = objectKey) {
  return {
    source: 'aws.s3',
    'detail-type': 'Object Created',
    detail: { bucket: { name: 'test-only-bucket' }, object: { key } },
  };
}
test('status confirms metadata, persists processing then explicit unimplemented failure; duplicates cannot regress', async () => {
  const f = fixture(),
    scan: ScanRecord = {
      ...record(),
      status: 'UPLOADING',
      objectKey,
      contentType: 'image/png',
      sizeBytes: 10,
    };
  f.rows.set(`${owner}:${scanId}`, scan);
  const handler = createStatusHandler({
    repository: f.repository,
    bucket: 'test-only-bucket',
    head: async () => ({ contentType: 'image/png', sizeBytes: 10 }),
  });
  await handler({ action: 'uploaded', event: imageEvent() });
  assert.equal(scan.status, 'PROCESSING');
  await handler({
    action: 'failed',
    event: imageEvent(),
    failure: { Error: 'Phase3NotImplemented' },
  });
  assert.equal(scan.status, 'FAILED');
  assert.equal(scan.failureCode, 'ANALYSIS_NOT_IMPLEMENTED');
  assert.deepEqual(await handler({ action: 'uploaded', event: imageEvent() }), { ignored: true });
});
test('status rejects foreign objects and metadata mismatches', async () => {
  const f = fixture(),
    scan: ScanRecord = {
      ...record(),
      status: 'UPLOADING',
      objectKey,
      contentType: 'image/png',
      sizeBytes: 10,
    };
  f.rows.set(`${owner}:${scanId}`, scan);
  const handler = createStatusHandler({
    repository: f.repository,
    bucket: 'test-only-bucket',
    head: async () => ({ contentType: 'image/jpeg', sizeBytes: 10 }),
  });
  await assert.rejects(
    handler({ action: 'uploaded', event: imageEvent(objectKey.replace(owner, other)) }),
  );
  await assert.rejects(handler({ action: 'uploaded', event: imageEvent() }));
  assert.equal(scan.failureCode, 'UPLOAD_REJECTED');
});
