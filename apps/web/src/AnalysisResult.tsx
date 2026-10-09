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
        <div className="report-unavailable-mark" aria-hidden="true">
          ?
        </div>
        <div>
          <p className="eyebrow">RESULT STATUS</p>
          <h2>Analysis unavailable</h2>
          <p>
            This scan has no validated analysis result. No category, sorting decision, or recovery
            estimate has been inferred.
          </p>
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
          <p className="eyebrow">VALIDATED REPORT · {outcome}</p>
          <h2>Waste intelligence</h2>
          <p className="report-lede">
            Visual interpretation for review. Treat the image classification as a starting point,
            not a verified material audit.
          </p>
        </div>
        <span
          className={`report-confidence confidence-${classification.confidenceBand.toLowerCase()}`}
        >
          <span aria-hidden="true" />
          {classification.confidenceBand.toLowerCase()} confidence
          <small>qualitative</small>
        </span>
      </header>

      <div className="report-overview">
        <article className="report-feature-card report-category-card">
          <span className="report-card-kicker">PRIMARY CATEGORY</span>
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
        </article>
        <article className="report-feature-card report-mass-card">
          <span className="report-card-kicker">RECORDED QUANTITY</span>
          <strong>
            {result.quantityKg.toLocaleString(undefined, { maximumSignificantDigits: 5 })}
            <small> kg</small>
          </strong>
          <p>Approximate mass supplied with this scan. Material proportions were not measured.</p>
          <span className="report-data-origin">USER-PROVIDED · APPROXIMATE</span>
        </article>
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
                  ? 'A verified conversion factor is required.'
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
                  ? 'A verified factor and baseline are required.'
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
