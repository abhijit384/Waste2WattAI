import { z } from 'zod';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const imageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
// Cognito subjects have a GUID shape but do not promise RFC UUID version/variant bits.
// Ownership still comes exclusively from API Gateway's validated access-token claims.
export const cognitoSubjectSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const scanStatusSchema = z.enum([
  'CREATED',
  'UPLOADING',
  'UPLOADED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);
export type ScanStatus = z.infer<typeof scanStatusSchema>;
export const createScanRequestSchema = z
  .object({
    quantityKg: z.number().finite().positive().max(1_000_000),
    unit: z.literal('kg'),
    sourceLabel: z.string().trim().min(1).max(80).optional(),
  })
  .strict();
export const createScanResponseSchema = z.object({
  scanId: z.uuid(),
  status: z.literal('CREATED'),
});
export const uploadRequestSchema = z
  .object({
    contentType: z.enum(imageTypes),
    sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
  })
  .strict();
export const uploadResponseSchema = z.object({
  url: z.url().refine((url) => new URL(url).protocol === 'https:'),
  fields: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
});
export const wasteScanSchema = z.object({
  scanId: z.uuid(),
  userId: cognitoSubjectSchema,
  organizationId: z.string().max(128).optional(),
  status: scanStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  quantityKg: z.number().positive(),
  unit: z.literal('kg'),
  sourceLabel: z.string().max(80).optional(),
  contentType: z.enum(imageTypes).optional(),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES).optional(),
  failureCode: z
    .enum(['ANALYSIS_NOT_IMPLEMENTED', 'UPLOAD_REJECTED', 'PROCESSING_FAILED'])
    .optional(),
});
export const paginatedScanListSchema = z.object({
  items: z.array(wasteScanSchema),
  nextCursor: z.string().optional(),
});
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});
export type WasteScan = z.infer<typeof wasteScanSchema>;
export type CreateScanRequest = z.infer<typeof createScanRequestSchema>;
export type CreateScanResponse = z.infer<typeof createScanResponseSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type PaginatedScanList = z.infer<typeof paginatedScanListSchema>;
