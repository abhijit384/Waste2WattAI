import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { createHandler } from './scans.ts';
import { runtimeClients, signUpload } from './aws.ts';

let application: ReturnType<typeof createHandler> | undefined;
export async function handler(event: APIGatewayProxyEventV2) {
  try {
    if (!application) {
      const clients = runtimeClients();
      const clientId = process.env.COGNITO_CLIENT_ID;
      if (!clientId) throw new Error('Missing authentication configuration');
      application = createHandler({
        repository: clients.repository,
        clientId,
        signUpload: signUpload(clients.s3, clients.bucket),
        log: (entry) => console.error(JSON.stringify(entry)),
      });
    }
    return await application(event);
  } catch {
    const requestId = event.requestContext.requestId;
    console.error(
      JSON.stringify({ requestId, route: event.routeKey, errorCode: 'SERVICE_UNAVAILABLE' }),
    );
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: JSON.stringify({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The service is unavailable. Please retry.',
          requestId,
        },
      }),
    };
  }
}
