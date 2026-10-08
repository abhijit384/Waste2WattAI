import assert from 'node:assert/strict';
import test from 'node:test';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { createHandler, type ScanRepository } from '../services/api/src/scans.ts';
const handler = createHandler({
  repository: {} as ScanRepository,
  clientId: 'test-client',
  signUpload: async () => {
    throw new Error('Not used');
  },
});

test('API boundary returns explicit unimplemented JSON with request correlation', async () => {
  // Only requestContext.requestId is consumed by the placeholder boundary.
  const event = {
    routeKey: 'POST /simulate',
    requestContext: {
      requestId: 'test-request',
      authorizer: {
        jwt: {
          claims: {
            sub: '10000000-0000-4000-8000-000000000001',
            client_id: 'test-client',
            token_use: 'access',
            scope: 'aws.cognito.signin.user.admin',
          },
        },
      },
    },
  } as unknown as APIGatewayProxyEventV2;
  const response = await handler(event);
  assert.equal(response.statusCode, 501);
  assert.equal(response.headers?.['content-type'], 'application/json');
  assert.equal(response.headers?.['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(response.body ?? '{}'), {
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'This feature is available in a future phase.',
      requestId: 'test-request',
    },
  });
});
