import type { WasteAnalysisResult } from '@waste2watt/shared';

const label = (value: string | null | undefined) =>
  value
    ? value
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null;

function ListOrEmpty({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="report-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="report-empty">{empty}</p>
  );
}

export function AnalysisResult({ result }: { result: WasteAnalysisResult | undefined }) {
  if (!result || result.classification.outcome === 'ANALYSIS_UNAVAILABLE') {
    return (
      <section
        className="analysis-report panel analysis-report-unavailable"
        aria-label="Waste analysis report"
      >
        <div className="unavailable-orbit" aria-hidden="true">
          <span />
          <span />
          <b>?</b>
        </div>
        <div className="report-unavailable-content">
          <p className="eyebrow">REPORT STATUS · UNRESOLVED</p>
          <h2>We couldn’t validate this analysis</h2>
          <p className="report-unavailable-copy">
            No structured result passed the application checks, so no category, sorting decision, or
            recovery estimate was saved. The uploaded scan remains available in your history.
          </p>
          <div className="unavailable-diagnostic" role="note">
            <span className="diagnostic-pulse" aria-hidden="true" />
            <div>
              <strong>What this status tells us</strong>
              <p>
                The scan record stores a safe failure code, not a provider-specific error. Inference
                may be disabled for the deployment, a configured provider may be unavailable, or a
                response may fail the required report format. Service diagnostics are needed to
                distinguish those causes.
              </p>
            </div>
          </div>
          <div className="report-unavailable-flow" aria-label="Analysis handling">
            <article>
              <span>01 · RECORD</span>
              <h3>Image stored</h3>
              <p>Your scan and its approximate quantity remain in your account history.</p>
            </article>
            <article>
              <span>02 · SERVER</span>
              <h3>Analysis gate</h3>
              <p>The server controls whether inference is enabled and which providers can run.</p>
            </article>
            <article>
              <span>03 · RESULT</span>
              <h3>No result assumed</h3>
              <p>No category or recovery estimate is displayed until a response is validated.</p>
            </article>
          </div>
        </div>
      </section>
    );
  }

  const { classification, recovery, impact } = result;
  const hasEstimate = impact.energyKwh !== null || impact.carbonBenefitKgCo2e !== null;
  const category = label(classification.primaryCategory);
  const outcome = label(classification.outcome);
  const facilityLabel =
    recovery.actionable && recovery.facilityStatus === 'VERIFIED'
      ? 'Facility acceptance verified'
      : 'Confirm local facility acceptance';

  return (
    <section className="analysis-report panel" aria-label="Waste intelligence report">
      <header className="report-header">
        <div>
          <p className="eyebrow">WASTE INTELLIGENCE · {outcome}</p>
          <h2>Material analysis</h2>
          <p className="report-lede">
            A structured visual assessment for review. Confirm the material before sorting or acting
            on this result.
          </p>
        </div>
        <span
          className={`report-confidence confidence-${classification.confidenceBand.toLowerCase()}`}
        >
          <span aria-hidden="true" />
          {classification.confidenceBand.toLowerCase()} confidence
          <small>qualitative signal</small>
        </span>
      </header>

      <div className="report-hero">
        <div className="report-hero-copy">
          <span className="report-card-kicker">PRIMARY MATERIAL</span>
          <h3>{category ?? 'No category identified'}</h3>
          <p>{classification.description}</p>
          <div className="report-tags" aria-label="Other materials identified">
            {classification.otherMaterials.length ? (
              classification.otherMaterials.map((material) => (
                <span className="report-tag" key={material}>
                  {label(material)}
                </span>
              ))
            ) : (
              <span className="report-tag report-tag-muted">
                No additional materials identified
              </span>
            )}
          </div>
        </div>
        <div className="material-orbit" aria-hidden="true">
          <span className="material-orbit-ring material-orbit-ring-one" />
          <span className="material-orbit-ring material-orbit-ring-two" />
          <span className="material-orbit-ring material-orbit-ring-three" />
          <span className="material-core">
            <i />
          </span>
          <span className="material-orbit-caption">IMAGE SIGNAL</span>
        </div>
        <div className="report-hero-aside">
          <span className="report-card-kicker">RECORDED QUANTITY</span>
          <strong>
            {result.quantityKg.toLocaleString(undefined, { maximumSignificantDigits: 5 })}
            <small> kg</small>
          </strong>
          <p>User-provided approximate mass. Material proportions were not measured.</p>
          <span className="report-data-origin">RECORDED · APPROXIMATE</span>
        </div>
      </div>

      {classification.humanReviewRecommended && (
        <p className="report-review-note" role="note">
          <span aria-hidden="true">↗</span>
          Human review recommended before sorting or acting on this result.
        </p>
      )}

      <div className="report-sections">
        <article className="report-section">
          <div className="report-section-heading">
            <span className="report-icon" aria-hidden="true">
              ◉
            </span>
            <div>
              <span className="report-card-kicker">IMAGE OBSERVATIONS</span>
              <h3>Evidence &amp; handling</h3>
            </div>
          </div>
          <dl className="report-facts">
            <div>
              <dt>Visible contamination</dt>
              <dd>{label(classification.contamination)}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{classification.confidenceBand.toLowerCase()} · not a calibrated probability</dd>
            </div>
            <div>
              <dt>Material proportions</dt>
              <dd>Unknown — not measured from the image</dd>
            </div>
          </dl>
          <ListOrEmpty
            items={classification.separationConcerns}
            empty="No separation concerns were recorded."
          />
          {classification.safetyConcerns.length > 0 && (
            <div className="report-caution">
              <strong>Safety notes</strong>
              <ListOrEmpty items={classification.safetyConcerns} empty="" />
            </div>
          )}
        </article>

        <article className="report-section">
          <div className="report-section-heading">
            <span className="report-icon report-icon-coral" aria-hidden="true">
              ↗
            </span>
            <div>
              <span className="report-card-kicker">POSSIBLE NEXT STEP</span>
              <h3>Sorting &amp; recovery</h3>
            </div>
          </div>
          <p className="report-pathway">
            {label(recovery.recommendedPathway) ?? 'No pathway recommendation'}
          </p>
          <p className="report-copy">{recovery.explanation}</p>
          <span
            className={`facility-status ${recovery.facilityStatus === 'VERIFIED' && recovery.actionable ? 'facility-verified' : ''}`}
          >
            <span aria-hidden="true" />
            {facilityLabel}
          </span>
          {recovery.alternativePathways.length > 0 && (
            <div className="report-subsection">
              <h4>Alternatives to review</h4>
              <div className="report-tags">
                {recovery.alternativePathways.map((pathway) => (
                  <span className="report-tag" key={pathway}>
                    {label(pathway)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <ListOrEmpty
            items={[...recovery.eligibilityConstraints, ...recovery.warnings]}
            empty="No additional pathway constraints were recorded."
          />
        </article>

        <article className="report-section report-impact-section">
          <div className="report-section-heading">
            <span className="report-icon report-icon-blue" aria-hidden="true">
              ✳
            </span>
            <div>
              <span className="report-card-kicker">EVIDENCE-BASED ONLY</span>
              <h3>Potential impact</h3>
            </div>
          </div>
          <p className="report-copy">{impact.explanation}</p>
          <div className="impact-opportunity" role="note" aria-label="Qualitative impact pathway">
            <span className="report-card-kicker">QUALITATIVE PATHWAY</span>
            <strong>
              {recovery.recommendedPathway
                ? `${label(recovery.recommendedPathway)} opportunity`
                : 'No verified pathway'}
            </strong>
            <p>
              {recovery.recommendedPathway
                ? recovery.explanation
                : 'Material identity, separation, or safety needs review before a recovery opportunity can be described.'}
            </p>
            <small>
              Candidate only. Local facility acceptance and actual material recovery are not
              verified; this is not a quantified environmental benefit.
            </small>
          </div>
          <div className="impact-metrics">
            <div
              className={impact.energyKwh === null ? 'impact-metric is-unknown' : 'impact-metric'}
            >
              <span>Energy potential</span>
              <strong>
                {impact.energyKwh === null
                  ? 'Not estimated'
                  : `${impact.energyKwh.toLocaleString()} kWh`}
              </strong>
              <small>
                {impact.energyKwh === null
                  ? 'No reviewed factor matches this material, pathway, and region.'
                  : `${label(impact.energyBasis)} · estimated potential, not generated electricity`}
              </small>
            </div>
            <div
              className={
                impact.carbonBenefitKgCo2e === null ? 'impact-metric is-unknown' : 'impact-metric'
              }
            >
              <span>Carbon scenario</span>
              <strong>
                {impact.carbonBenefitKgCo2e === null
                  ? 'Not estimated'
                  : `${impact.carbonBenefitKgCo2e.toLocaleString()} kg CO₂e`}
              </strong>
              <small>
                {impact.carbonBenefitKgCo2e === null
                  ? 'A reviewed comparative factor and named baseline are required.'
                  : `Compared with ${impact.baseline}`}
              </small>
            </div>
          </div>
          {!hasEstimate && (
            <p className="report-integrity-note">
              No energy yield or emissions benefit is claimed for this scan.
            </p>
          )}
        </article>
      </div>

      <details className="report-method-details">
        <summary>Sources, assumptions &amp; model details</summary>
        {impact.sources.length > 0 && (
          <div className="report-subsection">
            <h4>Sources</h4>
            <ul className="report-list">
              {impact.sources.map((source) => (
                <li key={`${source.url}-${source.version}`}>
                  <a href={source.url} rel="noopener noreferrer" target="_blank">
                    {source.title}
                  </a>{' '}
                  <span>({source.version})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ListOrEmpty items={impact.assumptions} empty="No additional assumptions were recorded." />
        <p className="muted report-metadata">
          {result.modelVersion} · {new Date(result.processedAt).toLocaleString()} · factor catalog{' '}
          {result.factorCatalogVersion}
        </p>
      </details>
    </section>
  );
}
