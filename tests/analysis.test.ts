import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { z } from 'zod';
import { analysisResultSchema, classificationSchema } from '../packages/shared/src/analysis.ts';

const classification = {
  outcome: 'CLASSIFIED',
  primaryCategory: 'ORGANIC',
  otherMaterials: [],
  description: 'Visible organics',
  confidenceBand: 'HIGH',
  contamination: 'UNKNOWN',
  separationConcerns: [],
  safetyConcerns: [],
  humanReviewRecommended: false,
  materialProportions: null,
};
test('Python schemas stay synchronized with shared TypeScript contracts', () => {
  const exported = JSON.parse(
    readFileSync('services/analysis/src/waste2watt_analysis/schemas.json', 'utf8'),
  );
  assert.deepEqual(exported, {
    classification: z.toJSONSchema(classificationSchema),
    analysis: z.toJSONSchema(analysisResultSchema),
  });
});
test('classification semantics reject inconsistent and invented measurements', () => {
  assert.equal(classificationSchema.safeParse(classification).success, true);
  for (const update of [
    { primaryCategory: 'BATTERY' },
    { primaryCategory: null },
    { outcome: 'NO_WASTE_DETECTED' },
    { confidenceBand: 'LOW' },
    { materialProportions: { organic: 80 } },
    { weightKg: 4 },
  ]) {
    assert.equal(classificationSchema.safeParse({ ...classification, ...update }).success, false);
  }
});
test('environmental estimates require a basis, baseline and HTTPS evidence links', () => {
  const result = {
    schemaVersion: '1',
    classification,
    recovery: {
      recommendedPathway: 'COMPOSTING',
      alternativePathways: [],
      explanation: 'Separated organics',
      eligibilityConstraints: [],
      warnings: [],
      actionable: false,
      facilityStatus: 'UNVERIFIED',
    },
    impact: {
      energyKwh: null,
      energyBasis: null,
      carbonBenefitKgCo2e: null,
      baseline: null,
      explanation: 'No applicable factor',
      sources: [],
      assumptions: [],
    },
    modelId: 'amazon.nova-lite-v1:0',
    modelVersion: 'amazon.nova-lite-v1:0',
    processedAt: '2026-10-08T00:00:00Z',
    quantityKg: 2,
    factorCatalogVersion: '2026-10-08.1',
  };
  assert.equal(analysisResultSchema.safeParse(result).success, true);
  for (const update of [
    { energyKwh: 2 },
    { carbonBenefitKgCo2e: 2 },
    { sources: [{ title: 'unsafe', url: 'javascript:alert(1)', version: '1' }] },
  ])
    assert.equal(
      analysisResultSchema.safeParse({ ...result, impact: { ...result.impact, ...update } })
        .success,
      false,
    );
});
