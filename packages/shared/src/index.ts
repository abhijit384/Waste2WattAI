/** IDs are opaque strings; timestamps are ISO 8601 UTC strings at the wire boundary. */
export type AnalysisStatus = 'queued' | 'running' | 'completed' | 'failed';
export type EnergyPathway = 'anaerobic-digestion' | 'combustion' | 'gasification' | 'pyrolysis';

export interface ObjectReference {
  bucket: string;
  key: string;
  versionId?: string;
}

export interface WasteSample {
  sampleId: string;
  ownerId: string;
  createdAt: string;
  source: ObjectReference;
  measuredMassKg?: number;
  description?: string;
}

/** Null means unknown, not zero. Evidence must identify a traceable source. */
export interface EvidenceReference {
  sourceId: string;
  uri: string;
  version: string;
}

export interface EnergyEstimate {
  pathway: EnergyPathway;
  energyKwh: number | null;
  methodology: string | null;
  evidence: EvidenceReference[];
  limitations: string[];
}

export interface AnalysisRequest {
  analysisId: string;
  sampleId: string;
  ownerId: string;
}

export interface AnalysisResult {
  analysisId: string;
  sampleId: string;
  status: AnalysisStatus;
  estimates: EnergyEstimate[];
  limitations: string[];
}

export interface AnalysisJob extends AnalysisRequest {
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
  result?: AnalysisResult;
}

export interface DecisionRequest {
  analysisId: string;
  ownerId: string;
  question: string;
}

export interface DecisionResponse {
  analysisId: string;
  summary: string;
  evidence: EvidenceReference[];
  limitations: string[];
}

export interface ApiError {
  error: { code: string; message: string; requestId: string };
}

export interface AnalysisRequestedEvent {
  schemaVersion: '1';
  request: AnalysisRequest;
}

export * from './scans.js';
