import { z } from 'zod';
import { cognitoSubjectSchema } from '@waste2watt/shared';
import type { ScanRepository } from './scans.ts';

export const imageEventSchema = z.object({
  source: z.literal('aws.s3'),
  'detail-type': z.literal('Object Created'),
  detail: z.object({
    bucket: z.object({ name: z.string() }),
    object: z.object({ key: z.string(), 'version-id': z.string().optional() }),
  }),
});
export function createStatusHandler(deps: {
  repository: ScanRepository;
  bucket: string;
  head: (key: string, version?: string) => Promise<{ contentType?: string; sizeBytes?: number }>;
  analysisEnabled?: boolean;
  now?: () => string;
}) {
  return async (input: {
    action: 'uploaded' | 'unavailable' | 'failed';
    event: unknown;
    failure?: { Error?: string };
  }) => {
    const event = imageEventSchema.parse(input.event);
    const key = event.detail.object.key;
    const match =
      /^private\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(key);
    if (event.detail.bucket.name !== deps.bucket || !match)
      throw new Error('Unrecognized image event');
    const ownerId = cognitoSubjectSchema.parse(match[1]);
    const scanId = z.uuid().parse(match[2]);
    const scan = await deps.repository.get(ownerId, scanId);
    if (!scan || scan.ownerId !== ownerId || scan.userId !== ownerId || scan.objectKey !== key)
      throw new Error('Image does not match scan');
    if (input.action === 'unavailable' && deps.analysisEnabled === true)
      throw new Error('Analysis is enabled');
    if (scan.status === 'COMPLETED' || scan.status === 'FAILED')
      return { ignored: true, analysisEnabled: deps.analysisEnabled === true };
    const now = (deps.now ?? (() => new Date().toISOString()))();
    if (input.action === 'failed') {
      await deps.repository.transition(
        scan,
        ['UPLOADING', 'UPLOADED', 'PROCESSING'],
        'FAILED',
        now,
        input.failure?.Error === 'Phase3NotImplemented'
          ? 'ANALYSIS_NOT_IMPLEMENTED'
          : 'PROCESSING_FAILED',
      );
      return { status: 'FAILED' };
    }
    const metadata = await deps.head(key, event.detail.object['version-id']);
    if (metadata.contentType !== scan.contentType || metadata.sizeBytes !== scan.sizeBytes) {
      await deps.repository.transition(
        scan,
        ['UPLOADING', 'UPLOADED', 'PROCESSING'],
        'FAILED',
        now,
        'UPLOAD_REJECTED',
      );
      throw new Error('Uploaded image metadata rejected');
    }
    if (scan.status === 'UPLOADING')
      await deps.repository.transition(scan, ['UPLOADING'], 'UPLOADED', now);
    if (scan.status === 'UPLOADING' || scan.status === 'UPLOADED')
      await deps.repository.transition(scan, ['UPLOADED'], 'PROCESSING', now);
    if (input.action === 'unavailable') {
      await deps.repository.transition(scan, ['PROCESSING'], 'FAILED', now, 'ANALYSIS_UNAVAILABLE');
      return { status: 'FAILED', analysisEnabled: false };
    }
    return { status: 'PROCESSING', analysisEnabled: deps.analysisEnabled === true };
  };
}
