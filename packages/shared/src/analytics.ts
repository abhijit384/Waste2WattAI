import type { WasteScan } from './scans.js';

export const MAX_ANALYTICS_ROWS = 100;
export type ActivityGranularity = 'DAY' | 'WEEK' | 'MONTH';

export interface ActivityBucket {
  period: string;
  scans: number;
  approximateMassKg: number;
}

export interface OwnerAnalytics {
  rowCount: number;
  approximateMassKg: number;
  completedScans: number;
  analysisUnavailable: number;
  statusCounts: Record<WasteScan['status'], number>;
  categoryCounts: Record<string, number>;
  recoveryPathwayCounts: Record<string, number>;
  siteActivity: Array<{ label: string; scans: number; approximateMassKg: number }>;
  dailyActivity: Array<{ date: string; scans: number; approximateMassKg: number }>;
  evidenceEnergyKwh: number | null;
  evidenceEnergyBasis: string | null;
  evidenceCarbonBenefitKgCo2e: number | null;
  evidenceCarbonBaseline: string | null;
  impactAvailability: 'UNAVAILABLE' | 'COMPLETE' | 'PARTIAL';
}

/** Derive owner-scoped descriptive analytics; mass remains a user estimate. */
export function deriveOwnerAnalytics(scans: readonly WasteScan[]): OwnerAnalytics {
  if (scans.length > MAX_ANALYTICS_ROWS) throw new RangeError('Too many analytics rows');
  const statusCounts: OwnerAnalytics['statusCounts'] = {
    CREATED: 0,
    UPLOADING: 0,
    UPLOADED: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
  const sites = new Map<string, { scans: number; approximateMassKg: number }>();
  const days = new Map<string, { scans: number; approximateMassKg: number }>();
  let approximateMassKg = 0;
  let analysisUnavailable = 0;
  const completed = scans.filter((scan) => scan.status === 'COMPLETED' && scan.analysis);
  const categoryCounts: Record<string, number> = {};
  const recoveryPathwayCounts: Record<string, number> = {};
  for (const scan of scans) {
    statusCounts[scan.status] += 1;
    approximateMassKg += scan.quantityKg;
    if (scan.failureCode === 'ANALYSIS_UNAVAILABLE') analysisUnavailable += 1;
    if (scan.status === 'COMPLETED' && scan.analysis) {
      const category = scan.analysis.classification.primaryCategory;
      if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      const pathway = scan.analysis.recovery.recommendedPathway;
      if (pathway) recoveryPathwayCounts[pathway] = (recoveryPathwayCounts[pathway] ?? 0) + 1;
    }
    const label = scan.sourceLabel?.trim();
    if (label) {
      const current = sites.get(label) ?? { scans: 0, approximateMassKg: 0 };
      current.scans += 1;
      current.approximateMassKg += scan.quantityKg;
      sites.set(label, current);
    }
    const date = scan.createdAt.slice(0, 10);
    const current = days.get(date) ?? { scans: 0, approximateMassKg: 0 };
    current.scans += 1;
    current.approximateMassKg += scan.quantityKg;
    days.set(date, current);
  }

  const energy = completed.map((scan) => scan.analysis!.impact);
  const energyBasis = energy[0]?.energyBasis ?? null;
  const carbonBaseline = energy[0]?.baseline ?? null;
  const energyComplete =
    energy.length === scans.length &&
    energy.length > 0 &&
    energyBasis !== null &&
    energy.every((impact) => impact.energyKwh !== null && impact.energyBasis === energyBasis);
  const carbonComplete =
    energy.length === scans.length &&
    energy.length > 0 &&
    carbonBaseline !== null &&
    energy.every(
      (impact) => impact.carbonBenefitKgCo2e !== null && impact.baseline === carbonBaseline,
    );
  const analysesMissing = scans.some((scan) => scan.status !== 'COMPLETED' || !scan.analysis);
  const hasPartialImpact = energy.length > 0 && (!energyComplete || !carbonComplete);

  return {
    rowCount: scans.length,
    approximateMassKg,
    completedScans: statusCounts.COMPLETED,
    analysisUnavailable,
    statusCounts,
    categoryCounts,
    recoveryPathwayCounts,
    siteActivity: [...sites.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((a, b) => b.approximateMassKg - a.approximateMassKg || a.label.localeCompare(b.label)),
    dailyActivity: [...days.entries()]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    evidenceEnergyKwh: energyComplete
      ? energy.reduce((sum, item) => sum + item.energyKwh!, 0)
      : null,
    evidenceEnergyBasis: energyComplete ? energyBasis : null,
    evidenceCarbonBenefitKgCo2e: carbonComplete
      ? energy.reduce((sum, item) => sum + item.carbonBenefitKgCo2e!, 0)
      : null,
    evidenceCarbonBaseline: carbonComplete ? carbonBaseline : null,
    impactAvailability:
      energy.length === 0 || analysesMissing
        ? 'UNAVAILABLE'
        : hasPartialImpact
          ? 'PARTIAL'
          : 'COMPLETE',
  };
}

/** Group loaded owner scans by a UTC calendar day, ISO week start, or month. */
export function groupActivityByPeriod(
  scans: readonly WasteScan[],
  granularity: ActivityGranularity,
): ActivityBucket[] {
  if (scans.length > MAX_ANALYTICS_ROWS) throw new RangeError('Too many analytics rows');
  const buckets = new Map<string, ActivityBucket>();
  for (const scan of scans) {
    const date = scan.createdAt.slice(0, 10);
    let period: string;
    if (granularity === 'MONTH') {
      period = `${date.slice(0, 7)}-01`;
    } else if (granularity === 'WEEK') {
      const start = new Date(`${date}T00:00:00.000Z`);
      const daysSinceMonday = (start.getUTCDay() + 6) % 7;
      start.setUTCDate(start.getUTCDate() - daysSinceMonday);
      period = start.toISOString().slice(0, 10);
    } else {
      period = date;
    }
    const bucket = buckets.get(period) ?? {
      period,
      scans: 0,
      approximateMassKg: 0,
    };
    bucket.scans += 1;
    bucket.approximateMassKg += scan.quantityKg;
    buckets.set(period, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export interface SimulationInput {
  quantityKg: number;
  currentDisposalPathway: 'LANDFILL' | 'RECYCLING' | 'COMPOSTING' | 'OTHER';
  diversionPercent: number;
  pathway: 'ANAEROBIC_DIGESTION' | 'COMBUSTION' | 'GASIFICATION' | 'PYROLYSIS';
  typicalKwhPerKg: number;
  lowerKwhPerKg: number;
  upperKwhPerKg: number;
  evidenceUrl: string;
  evidenceVersion: string;
  energyBasis:
    'THEORETICAL_POTENTIAL' | 'GROSS_OUTPUT' | 'USABLE_ELECTRICITY' | 'USEFUL_HEAT' | 'NET_OUTPUT';
}

/** User-driven what-if math. It never writes records or promotes assumptions to estimates. */
export function simulateEnergy(input: SimulationInput) {
  const values = [
    input.quantityKg,
    input.typicalKwhPerKg,
    input.lowerKwhPerKg,
    input.upperKwhPerKg,
  ];
  if (values.some((value) => !Number.isFinite(value) || value <= 0))
    throw new RangeError('Scenario inputs must be finite and greater than zero');
  if (input.quantityKg > 1_000_000)
    throw new RangeError('Scenario quantity exceeds the supported limit');
  if (
    !Number.isFinite(input.diversionPercent) ||
    input.diversionPercent < 0 ||
    input.diversionPercent > 100
  )
    throw new RangeError('Scenario diversion must be between zero and 100 percent');
  if (input.lowerKwhPerKg > input.typicalKwhPerKg || input.typicalKwhPerKg > input.upperKwhPerKg)
    throw new RangeError('Scenario factor bounds must contain the typical value');
  const url = new URL(input.evidenceUrl);
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password)
    throw new TypeError('Evidence must use a public HTTPS URL');
  if (!input.evidenceVersion.trim()) throw new TypeError('Evidence version is required');
  const divertedMassKg = (input.quantityKg * input.diversionPercent) / 100;
  const remainingMassKg = input.quantityKg - divertedMassKg;
  const lowerKwh = divertedMassKg * input.lowerKwhPerKg;
  const typicalKwh = divertedMassKg * input.typicalKwhPerKg;
  const upperKwh = divertedMassKg * input.upperKwhPerKg;
  if (![lowerKwh, typicalKwh, upperKwh].every(Number.isFinite))
    throw new RangeError('Scenario output is outside the supported numeric range');
  return {
    status: 'SIMULATED' as const,
    pathway: input.pathway,
    quantityKg: input.quantityKg,
    currentDisposalPathway: input.currentDisposalPathway,
    diversionPercent: input.diversionPercent,
    divertedMassKg,
    remainingMassKg,
    facilityAcceptance: 'UNVERIFIED' as const,
    energyBasis: input.energyBasis,
    lowerKwh,
    typicalKwh,
    upperKwh,
    evidenceUrl: url.toString(),
    evidenceVersion: input.evidenceVersion.trim(),
    verified: false as const,
    limitations: [
      'This is a hypothetical calculation from a user-entered factor, not a measured or verified outcome.',
      'Facility efficiency, feedstock composition, contamination, transport and local acceptance are not modeled.',
      'Do not interpret the output as guaranteed energy, carbon benefit or operational advice.',
    ],
  };
}
