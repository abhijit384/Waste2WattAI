import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { analysisResultSchema } from '@waste2watt/shared';
import { AnalysisResult } from './AnalysisResult';
import { failureMessage } from './pages';
afterEach(cleanup);
it('renders unavailable analysis honestly', () => {
  render(<AnalysisResult result={undefined} />);
  expect(screen.getByRole('heading', { name: 'We couldn’t validate this analysis' })).toBeTruthy();
  expect(screen.getByText(/No structured result passed the application checks/)).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Image stored' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Analysis gate' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'No result assumed' })).toBeTruthy();
});
it('renders qualitative evidence, user mass, unknown factors and human review', () => {
  const result = analysisResultSchema.parse({
    schemaVersion: '1',
    classification: {
      outcome: 'LOW_CONFIDENCE',
      primaryCategory: 'MIXED',
      otherMaterials: ['PLASTIC'],
      description: 'Uncertain mixed materials',
      confidenceBand: 'LOW',
      contamination: 'UNKNOWN',
      separationConcerns: ['Separate materials'],
      safetyConcerns: [],
      humanReviewRecommended: true,
      materialProportions: null,
    },
    recovery: {
      recommendedPathway: null,
      alternativePathways: [],
      explanation: 'Review before acting',
      eligibilityConstraints: ['Check facility acceptance'],
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
      assumptions: ['Mass supplied by user'],
    },
    modelId: 'amazon.nova-lite-v1:0',
    modelVersion: 'amazon.nova-lite-v1:0',
    processedAt: '2026-10-08T00:00:00Z',
    quantityKg: 2,
    factorCatalogVersion: '2026-10-08.1',
  });
  render(<AnalysisResult result={result} />);
  expect(screen.getByText('low confidence')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Evidence & handling' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Sorting & recovery' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Material analysis' })).toBeTruthy();
  expect(document.querySelector('.material-orbit')).toBeTruthy();
  expect(
    screen.getByText('RECORDED QUANTITY').parentElement?.querySelector('strong')?.textContent,
  ).toBe('2 kg');
  expect(screen.getByText(/RECORDED · APPROXIMATE/)).toBeTruthy();
  expect(screen.getByText(/Human review recommended before sorting/)).toBeTruthy();
  expect(screen.getByText('A verified conversion factor is required.')).toBeTruthy();
  expect(screen.getByText(/not a calibrated probability/)).toBeTruthy();

  cleanup();
  const unavailable = analysisResultSchema.parse({
    ...result,
    classification: {
      ...result.classification,
      outcome: 'ANALYSIS_UNAVAILABLE',
      primaryCategory: null,
      otherMaterials: [],
    },
  });
  render(<AnalysisResult result={unavailable} />);
  expect(screen.getByRole('heading', { name: 'We couldn’t validate this analysis' })).toBeTruthy();
  expect(screen.queryByText('Mixed')).toBeNull();
});
it('describes explicit provider, validation and budget failures without automatic paid retries', () => {
  expect(failureMessage({ failureCode: 'AI_LIMIT_EXCEEDED' })).toContain(
    'Automatic retries are disabled',
  );
  expect(failureMessage({ failureCode: 'INVALID_MODEL_OUTPUT' })).toContain(
    'No analysis result was accepted',
  );
  expect(failureMessage({ failureCode: 'ANALYSIS_UNAVAILABLE' })).toContain(
    'did not return a validated result',
  );
});
