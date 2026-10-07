import assert from 'node:assert/strict';
import test from 'node:test';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from '../services/api/src/handler.ts';

test('API boundary returns explicit unimplemented JSON with request correlation', async () => {
  // Only requestContext.requestId is consumed by the placeholder boundary.
  const event = { requestContext: { requestId: 'test-request' } } as APIGatewayProxyEventV2;
  const response = await handler(event);
  assert.equal(response.statusCode, 501);
  assert.equal(response.headers?.['content-type'], 'application/json');
  assert.equal(response.headers?.['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(response.body ?? '{}'), {
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Waste2Watt API is a scaffold; this operation is not implemented.',
      requestId: 'test-request',
    },
  });
});
