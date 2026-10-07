import type { AnalysisJob, AnalysisRequestedEvent, WasteSample } from '@waste2watt/shared';

export interface SampleRepository {
  get(sampleId: string, ownerId: string): Promise<WasteSample | null>;
  save(sample: WasteSample): Promise<void>;
}

export interface AnalysisRepository {
  get(analysisId: string, ownerId: string): Promise<AnalysisJob | null>;
  save(job: AnalysisJob): Promise<void>;
}

export interface AnalysisEventPublisher {
  publish(event: AnalysisRequestedEvent): Promise<void>;
}

export interface UploadSigner {
  createUpload(ownerId: string, contentType: string): Promise<{ url: string; key: string }>;
}
