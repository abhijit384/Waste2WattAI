import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { runtimeClients } from './aws.ts';
import { createStatusHandler } from './status.ts';
import { z } from 'zod';

let application: ReturnType<typeof createStatusHandler> | undefined;
export async function handler(
  input:
    | { action: 'uploaded' | 'failed'; event: unknown; failure?: { Error?: string } }
    | { source: string; detail: unknown },
) {
  if (!application) {
    const clients = runtimeClients();
    application = createStatusHandler({
      ...clients,
      head: async (key, version) => {
        const object = await clients.s3.send(
          new HeadObjectCommand({
            Bucket: clients.bucket,
            Key: key,
            ...(version ? { VersionId: version } : {}),
          }),
        );
        return {
          ...(object.ContentType ? { contentType: object.ContentType } : {}),
          ...(object.ContentLength !== undefined ? { sizeBytes: object.ContentLength } : {}),
        };
      },
    });
  }
  try {
    if ('source' in input) {
      const detail = z
        .object({ input: z.string(), status: z.enum(['FAILED', 'TIMED_OUT', 'ABORTED']) })
        .parse(input.detail);
      return await application({ action: 'failed', event: JSON.parse(detail.input) as unknown });
    }
    return await application(input);
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
      return { ignored: true };
    console.error(JSON.stringify({ errorCode: 'STATUS_UPDATE_FAILED' }));
    throw error;
  }
}
