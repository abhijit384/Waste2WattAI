import type { ScanStatus } from '@waste2watt/shared';

const stageCopy: Partial<Record<ScanStatus, { eyebrow: string; title: string; detail: string }>> = {
  CREATED: {
    eyebrow: 'SECURE WORKFLOW',
    title: 'Preparing your scan',
    detail: 'Your private scan record is being prepared.',
  },
  UPLOADED: {
    eyebrow: 'IMAGE RECEIVED',
    title: 'Your image is in the pipeline',
    detail:
      'The secure upload is complete. Waiting for the analysis workflow to report its status.',
  },
  UPLOADING: {
    eyebrow: 'SECURE UPLOAD',
    title: 'Sending your image securely',
    detail: 'Upload progress below reflects the bytes transferred by your browser.',
  },
  PROCESSING: {
    eyebrow: 'ANALYSIS IN PROGRESS',
    title: 'Reading the visible evidence',
    detail:
      'The analysis service is processing this scan. Results appear only after server validation.',
  },
};

export function AnalysisLoading({
  status,
  paused = false,
}: {
  status: ScanStatus;
  paused?: boolean;
}) {
  const copy = stageCopy[status] ?? stageCopy.PROCESSING!;
  return (
    <div
      className={`analysis-loader${paused ? ' analysis-loader-paused' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="loader-stage-visual" data-stage={status.toLowerCase()} aria-hidden="true">
        <div className="loader-halo loader-halo-back" />
        <div className="loader-halo loader-halo-front" />
        <div className="loader-sweep" />
        <div className="loader-prism">
          <span>W</span>
        </div>
        <span className="loader-particle particle-one" />
        <span className="loader-particle particle-two" />
        <span className="loader-particle particle-three" />
      </div>
      <div className="loader-copy">
        <p className="eyebrow">{paused ? 'STATUS CHECK PAUSED' : copy.eyebrow}</p>
        <h3>{paused ? 'Still waiting for an update' : copy.title}</h3>
        <p>
          {paused
            ? 'Automatic polling paused before a terminal result. Refresh status or visit scan history to check again.'
            : copy.detail}
        </p>
        <span className="loader-state">
          <span aria-hidden="true" />
          {paused ? 'No result assumed' : status.toLowerCase()}
        </span>
      </div>
    </div>
  );
}
