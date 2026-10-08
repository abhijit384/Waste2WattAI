import type { WasteAnalysisResult } from '@waste2watt/shared';

export function AnalysisResult({ result }: { result: WasteAnalysisResult | undefined }) {
  if (!result) return <p>No validated analysis result is available.</p>;
  const { classification: c, recovery: r, impact: i } = result;
  return (
    <section aria-label="Waste intelligence results" className="panel">
      <h2>Waste intelligence</h2>
      <dl>
        <dt>Outcome</dt>
        <dd>{c.outcome.replaceAll('_', ' ')}</dd>
        <dt>Category</dt>
        <dd>{c.primaryCategory?.replaceAll('_', ' ') ?? 'No waste category identified'}</dd>
        <dt>Visual evidence</dt>
        <dd>{c.description}</dd>
        <dt>Other materials</dt>
        <dd>{c.otherMaterials.join(', ') || 'None identified'}</dd>
        <dt>Confidence band</dt>
        <dd>{c.confidenceBand} — qualitative, not a calibrated probability</dd>
        <dt>User-supplied quantity</dt>
        <dd>{result.quantityKg} kg, approximate</dd>
        <dt>Material proportions</dt>
        <dd>Unknown</dd>
        <dt>Possible contamination</dt>
        <dd>{c.contamination.replaceAll('_', ' ')}</dd>
        <dt>Recommended pathway</dt>
        <dd>{r.recommendedPathway?.replaceAll('_', ' ') ?? 'Human review required'}</dd>
        <dt>Why</dt>
        <dd>{r.explanation}</dd>
        <dt>Alternatives</dt>
        <dd>
          {r.alternativePathways.map((p) => p.replaceAll('_', ' ')).join(', ') || 'None verified'}
        </dd>
        <dt>Facility readiness</dt>
        <dd>
          {r.actionable ? 'Verified for action' : 'Verify local facility acceptance before acting'}
        </dd>
        <dt>Energy scenario</dt>
        <dd>
          {i.energyKwh === null
            ? 'Estimate unavailable — verified conversion factor required.'
            : `${i.energyKwh} kWh (${i.energyBasis?.replaceAll('_', ' ')}) — estimated potential, not electricity actually generated`}
        </dd>
        <dt>Carbon benefit scenario</dt>
        <dd>
          {i.carbonBenefitKgCo2e === null
            ? 'Estimate unavailable — verified conversion factor and baseline required.'
            : `${i.carbonBenefitKgCo2e} kg CO₂e relative to ${i.baseline}`}
        </dd>
      </dl>
      <p>{i.explanation}</p>
      {c.humanReviewRecommended && <p role="note">Human review recommended.</p>}
      <ul>
        {[
          ...c.separationConcerns,
          ...c.safetyConcerns,
          ...r.warnings,
          ...r.eligibilityConstraints,
          ...i.assumptions,
        ].map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>
      <ul>
        {i.sources.map((source, index) => (
          <li key={index}>
            <a href={source.url} rel="noopener noreferrer" target="_blank">
              {source.title}
            </a>{' '}
            ({source.version})
          </li>
        ))}
      </ul>
      <p className="muted">
        Model {result.modelVersion} · {new Date(result.processedAt).toLocaleString()} · Factors{' '}
        {result.factorCatalogVersion}
      </p>
    </section>
  );
}
