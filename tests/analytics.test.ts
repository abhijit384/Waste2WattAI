import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveOwnerAnalytics,
  groupActivityByPeriod,
  simulateEnergy,
  wasteScanSchema,
} from '../packages/shared/dist/index.js';

const OWNER = '10000000-0000-4000-8000-000000000002';
function scan(overrides: Record<string, unknown> = {}) {
  return wasteScanSchema.parse({
    scanId: '10000000-0000-4000-8000-000000000001',
    userId: OWNER,
    status: 'FAILED',
    createdAt: '2026-10-08T00:00:00.000Z',
    updatedAt: '2026-10-08T00:01:00.000Z',
    quantityKg: 2,
    unit: 'kg',
    ...overrides,
  });
}
function analysis(energyKwh: number, carbonBenefitKgCo2e: number) {
  return {
    schemaVersion: '1',
    classification: {
      outcome: 'CLASSIFIED',
      primaryCategory: 'PAPER_CARDBOARD',
      otherMaterials: [],
      description: 'Paper packaging',
      confidenceBand: 'HIGH',
      contamination: 'UNKNOWN',
      separationConcerns: [],
      safetyConcerns: [],
      humanReviewRecommended: false,
      materialProportions: null,
    },
    recovery: {
      recommendedPathway: 'RECYCLING',
      alternativePathways: [],
      explanation: 'Assess accepted recycling',
      eligibilityConstraints: [],
      warnings: [],
      actionable: false,
      facilityStatus: 'UNVERIFIED',
    },
    impact: {
      energyKwh,
      energyBasis: 'NET_OUTPUT',
      carbonBenefitKgCo2e,
      baseline: 'landfill',
      explanation: 'Evidence-backed scenario',
      sources: [{ title: 'Source', url: 'https://example.org/factor', version: '1' }],
      assumptions: ['same geography'],
    },
    modelId: 'fixture',
    modelVersion: 'test',
    processedAt: '2026-10-08T00:01:00.000Z',
    quantityKg: 2,
    factorCatalogVersion: '2026-10-08.1',
  };
}

test('owner analytics use recorded mass and expose no fabricated impacts', () => {
  const result = deriveOwnerAnalytics([
    scan({ sourceLabel: 'Site A', quantityKg: 2 }),
    scan({
      scanId: '10000000-0000-4000-8000-000000000003',
      sourceLabel: 'Site A',
      quantityKg: 3,
      failureCode: 'ANALYSIS_UNAVAILABLE',
    }),
  ]);
  assert.equal(result.rowCount, 2);
  assert.equal(result.approximateMassKg, 5);
  assert.equal(result.analysisUnavailable, 1);
  assert.equal(result.siteActivity[0]?.approximateMassKg, 5);
  assert.equal(result.evidenceEnergyKwh, null);
  assert.equal(result.evidenceCarbonBenefitKgCo2e, null);
  assert.equal(result.impactAvailability, 'UNAVAILABLE');
});

test('impact totals require complete comparable evidence for every recorded scan', () => {
  const result = deriveOwnerAnalytics([
    scan({ status: 'COMPLETED', analysis: analysis(1.2, 0.4) }),
    scan({
      scanId: '10000000-0000-4000-8000-000000000003',
      status: 'COMPLETED',
      analysis: analysis(2.3, 0.6),
    }),
  ]);
  assert.equal(result.evidenceEnergyKwh, 3.5);
  assert.equal(result.evidenceEnergyBasis, 'NET_OUTPUT');
  assert.equal(result.evidenceCarbonBenefitKgCo2e, 1);
  assert.equal(result.impactAvailability, 'COMPLETE');
  assert.equal(result.categoryCounts.PAPER_CARDBOARD, 2);
  assert.equal(result.recoveryPathwayCounts.RECYCLING, 2);
  assert.equal(
    deriveOwnerAnalytics([scan({ status: 'COMPLETED', analysis: analysis(1.2, 0.4) }), scan()])
      .evidenceEnergyKwh,
    null,
  );
});

test('activity trends group by UTC day, week start and month', () => {
  const scans = [
    scan({ createdAt: '2026-10-07T22:00:00.000Z', quantityKg: 1 }),
    scan({
      scanId: '10000000-0000-4000-8000-000000000003',
      createdAt: '2026-10-08T01:00:00.000Z',
      quantityKg: 2,
    }),
  ];
  assert.equal(groupActivityByPeriod(scans, 'DAY').length, 2);
  assert.deepEqual(groupActivityByPeriod(scans, 'WEEK'), [
    { period: '2026-10-05', scans: 2, approximateMassKg: 3 },
  ]);
  assert.deepEqual(groupActivityByPeriod(scans, 'MONTH'), [
    { period: '2026-10-01', scans: 2, approximateMassKg: 3 },
  ]);
});

test('scenario calculator requires cited inputs and clearly remains a simulation', () => {
  const result = simulateEnergy({
    quantityKg: 2,
    currentDisposalPathway: 'LANDFILL',
    diversionPercent: 50,
    pathway: 'ANAEROBIC_DIGESTION',
    lowerKwhPerKg: 0.1,
    typicalKwhPerKg: 0.2,
    upperKwhPerKg: 0.3,
    evidenceUrl: 'https://example.org/study',
    evidenceVersion: 'Table 4, 2025',
    energyBasis: 'NET_OUTPUT',
  });
  assert.equal(result.typicalKwh, 0.2);
  assert.equal(result.divertedMassKg, 1);
  assert.equal(result.remainingMassKg, 1);
  assert.equal(result.facilityAcceptance, 'UNVERIFIED');
  assert.equal(result.status, 'SIMULATED');
  assert.equal(result.verified, false);
  assert.throws(() =>
    simulateEnergy({
      quantityKg: 2,
      currentDisposalPathway: 'LANDFILL',
      diversionPercent: 101,
      pathway: 'ANAEROBIC_DIGESTION',
      lowerKwhPerKg: 0.1,
      typicalKwhPerKg: 0.2,
      upperKwhPerKg: 0.3,
      evidenceUrl: 'https://example.org/study',
      evidenceVersion: '1',
      energyBasis: 'NET_OUTPUT',
    }),
  );
  assert.throws(() =>
    simulateEnergy({
      quantityKg: 2,
      currentDisposalPathway: 'LANDFILL',
      diversionPercent: 50,
      pathway: 'ANAEROBIC_DIGESTION',
      lowerKwhPerKg: 0.3,
      typicalKwhPerKg: 0.2,
      upperKwhPerKg: 0.4,
      evidenceUrl: 'https://example.org/study',
      evidenceVersion: '1',
      energyBasis: 'NET_OUTPUT',
    }),
  );
  assert.throws(() =>
    simulateEnergy({
      quantityKg: 2,
      currentDisposalPathway: 'LANDFILL',
      diversionPercent: 50,
      pathway: 'ANAEROBIC_DIGESTION',
      lowerKwhPerKg: 0.1,
      typicalKwhPerKg: 0.2,
      upperKwhPerKg: 0.4,
      evidenceUrl: 'http://example.org/study',
      evidenceVersion: '1',
      energyBasis: 'NET_OUTPUT',
    }),
  );
});
