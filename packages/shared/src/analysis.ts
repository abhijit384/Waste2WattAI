import { z } from 'zod';

export const wasteCategorySchema = z.enum([
  'ORGANIC',
  'PLASTIC',
  'PAPER_CARDBOARD',
  'METAL',
  'GLASS',
  'TEXTILE',
  'E_WASTE',
  'MIXED',
  'OTHER',
]);
export const analysisOutcomeSchema = z.enum([
  'CLASSIFIED',
  'NO_WASTE_DETECTED',
  'LOW_CONFIDENCE',
  'MULTIPLE_MATERIALS',
  'INVALID_IMAGE',
  'ANALYSIS_UNAVAILABLE',
]);
const note = z.string().trim().min(1).max(500);
export const classificationSchema = z
  .object({
    outcome: analysisOutcomeSchema,
    primaryCategory: wasteCategorySchema.nullable(),
    otherMaterials: z.array(wasteCategorySchema).max(9),
    description: note,
    confidenceBand: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    contamination: z.enum(['VISIBLE', 'NONE_VISIBLE', 'UNKNOWN']),
    separationConcerns: z.array(note).max(8),
    safetyConcerns: z.array(note).max(8),
    humanReviewRecommended: z.boolean(),
    materialProportions: z.null(),
  })
  .strict()
  .superRefine((value, context) => {
    const empty = ['NO_WASTE_DETECTED', 'INVALID_IMAGE', 'ANALYSIS_UNAVAILABLE'].includes(
      value.outcome,
    );
    if (empty !== (value.primaryCategory === null))
      context.addIssue({ code: 'custom', message: 'Outcome and category must agree' });
    if (
      !empty &&
      value.confidenceBand === 'LOW' &&
      (value.outcome !== 'LOW_CONFIDENCE' || !value.humanReviewRecommended)
    )
      context.addIssue({
        code: 'custom',
        message: 'Low confidence requires explicit review outcome',
      });
    if (value.outcome === 'MULTIPLE_MATERIALS' && !value.humanReviewRecommended)
      context.addIssue({ code: 'custom', message: 'Mixed materials require review' });
  });
export const pathwaySchema = z.enum([
  'REUSE',
  'RECYCLING',
  'COMPOSTING',
  'ANAEROBIC_DIGESTION',
  'WASTE_TO_ENERGY',
  'SPECIALIZED_EWASTE_RECYCLING',
  'LANDFILL',
]);
export const recoverySchema = z
  .object({
    recommendedPathway: pathwaySchema.nullable(),
    alternativePathways: z.array(pathwaySchema).max(7),
    explanation: note,
    eligibilityConstraints: z.array(note).max(10),
    warnings: z.array(note).max(10),
    actionable: z.boolean(),
    facilityStatus: z.enum(['UNVERIFIED', 'VERIFIED']),
  })
  .strict();
export const impactSchema = z
  .object({
    energyKwh: z.number().finite().nullable(),
    energyBasis: z
      .enum([
        'THEORETICAL_POTENTIAL',
        'GROSS_OUTPUT',
        'USABLE_ELECTRICITY',
        'USEFUL_HEAT',
        'NET_OUTPUT',
      ])
      .nullable(),
    carbonBenefitKgCo2e: z.number().finite().nullable(),
    baseline: note.nullable(),
    explanation: note,
    sources: z
      .array(z.object({ title: note, url: z.url({ protocol: /^https$/ }), version: note }).strict())
      .max(10),
    assumptions: z.array(note).max(10),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.energyKwh !== null && value.energyBasis === null)
      context.addIssue({ code: 'custom', message: 'Energy basis required' });
    if (value.carbonBenefitKgCo2e !== null && value.baseline === null)
      context.addIssue({ code: 'custom', message: 'Carbon baseline required' });
  });
export const analysisResultSchema = z
  .object({
    schemaVersion: z.literal('1'),
    classification: classificationSchema,
    recovery: recoverySchema,
    impact: impactSchema,
    modelId: z.string().min(1).max(150),
    modelVersion: z.string().min(1).max(150),
    processedAt: z.iso.datetime(),
    quantityKg: z.number().finite().positive().max(1_000_000),
    factorCatalogVersion: z.literal('2026-10-08.1'),
  })
  .strict();
export type WasteAnalysisResult = z.infer<typeof analysisResultSchema>;
