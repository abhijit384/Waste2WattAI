import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { ApiError } from '@waste2watt/shared';

/** HTTP API Lambda boundary only. No routes, persistence, auth, or cloud calls yet. */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const body: ApiError = {
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Waste2Watt API is a scaffold; this operation is not implemented.',
      requestId: event.requestContext.requestId,
    },
  };
  return {
    statusCode: 501,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}
