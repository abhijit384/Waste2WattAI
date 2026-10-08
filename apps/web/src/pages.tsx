import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import type { FrontendConfig } from './config';
import {
  Brand,
  EmptyState,
  ErrorNotice,
  ScanRows,
  Skeleton,
  StatusBadge,
  ThemeToggle,
} from './components';
import type { ScanApi } from './api';
import { uploadImage } from './api';
import { validateImage } from './file-validation';
import { AnalysisResult } from './AnalysisResult';
import {
  createScanRequestSchema,
  deriveOwnerAnalytics,
  groupActivityByPeriod,
  simulateEnergy,
  type SimulationInput,
  type ActivityGranularity,
  type WasteScan,
  type ScanStatus,
} from '@waste2watt/shared';
const CognitoForm = lazy(() => import('./AuthenticatorPanel'));

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ConfigurationNotice({ config }: { config: FrontendConfig }) {
  return !config.configured ? (
    <section className="configuration-notice" role="alert">
      <p className="eyebrow">DEVELOPER SETUP</p>
      <h2>Connect your AWS workspace.</h2>
      <p>
        The local shell is ready. Authentication and scan APIs need real deployed AWS configuration;
        no demo account is substituted.
      </p>
      <p>Set these values in apps/web/.env.local:</p>
      <ul>
        {config.errors.map((key) => (
          <li key={key}>
            <code>{key}</code>
          </li>
        ))}
      </ul>
      <p>See docs/DEPLOYMENT.md. Deployment is a separate, explicitly authorized step.</p>
    </section>
  ) : null;
}
export function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <ThemeToggle />
          <Link to="/auth" className="button secondary">
            Enter workspace <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> A NEW PERSPECTIVE ON WASTE
            </p>
            <h1>
              See waste.
              <br />
              Think <span>possibility.</span>
            </h1>
            <p className="hero-tagline">
              Turning Waste Intelligence
              <br />
              into Energy Decisions.
            </p>
            <p className="hero-description">
              A clearer path from what you discard to what you can recover. Capture waste, build a
              trusted record, and prepare for evidence-led decisions.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/auth">
                Start your workspace <span aria-hidden="true">↗</span>
              </Link>
              <a className="text-link" href="#how-it-works">
                Explore the platform ↓
              </a>
            </div>
            <p className="hero-footnote">
              AWS-native foundation · Private by design · Evidence first
            </p>
          </div>
          <div className="hero-visual" aria-label="Platform workflow illustration">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-label">WASTE INTELLIGENCE ENGINE</div>
            <div className="visual-core">
              <span>W2W</span>
              <small>
                FROM CAPTURE
                <br />
                TO CONTEXT
              </small>
            </div>
            <div className="orbit-card orbit-capture">
              <span>01 / CAPTURE</span>
              <strong>A photo. A starting point.</strong>
              <div className="mini-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="orbit-card orbit-evidence">
              <span>02 / EVIDENCE</span>
              <strong>Clarity before calculation.</strong>
              <p>Analysis integration in development</p>
            </div>
            <div className="visual-caption">
              <span className="live-dot" /> A connected system for better decisions
            </div>
          </div>
        </section>
        <section id="how-it-works" className="landing-features">
          <div>
            <p className="eyebrow">BUILT FOR THE NEXT STEP</p>
            <h2>
              From a waste stream
              <br />
              to a decision workflow.
            </h2>
          </div>
          {[
            [
              '01',
              'Capture with context',
              'Add a photo, approximate mass, and source. Each scan becomes a private, traceable record.',
            ],
            [
              '02',
              'Build your intelligence',
              'Follow scan status and revisit your history. Future analysis will keep evidence and uncertainty visible.',
            ],
            [
              '03',
              'Plan what comes next',
              'Explore owner-scoped activity, cited what-if scenarios, and deterministic guidance—without unsupported savings claims.',
            ],
          ].map(([number, title, body]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>Turning Waste Intelligence into Energy Decisions</p>
        <Link to="/auth">Open workspace ↗</Link>
      </footer>
    </div>
  );
}
export function AuthPage({ config }: { config: FrontendConfig }) {
  const auth = useAuth();
  const location = useLocation();
  const requested = (location.state as { from?: unknown } | null)?.from;
  const destination =
    typeof requested === 'string' &&
    [
      '/dashboard',
      '/scan',
      '/history',
      '/digital-twin',
      '/simulator',
      '/advisor',
      '/settings',
    ].includes(requested)
      ? requested
      : '/dashboard';
  if (auth.status === 'authenticated') return <Navigate to={destination} replace />;
  return (
    <div className="auth-page">
      <header>
        <Brand />
        <div className="auth-header-actions">
          <ThemeToggle />
          <Link to="/">Back to home</Link>
        </div>
      </header>
      <main id="main-content" className="auth-grid">
        <section className="auth-intro">
          <p className="eyebrow">YOUR WASTE INTELLIGENCE WORKSPACE</p>
          <h1>
            Better decisions
            <br />
            start with <span>clarity.</span>
          </h1>
          <p>Capture your first scan. Build a record you can trust.</p>
          <div className="auth-benefit">
            <span>01</span>Private image storage
          </div>
          <div className="auth-benefit">
            <span>02</span>Secure Cognito authentication
          </div>
          <div className="auth-benefit">
            <span>03</span>Transparent analysis status
          </div>
        </section>
        <section className="auth-panel">
          <ConfigurationNotice config={config} />
          {config.configured && (
            <>
              <h2>Welcome to Waste2Watt</h2>
              <p className="muted">Sign in or create your workspace.</p>
              <Suspense fallback={<p role="status">Loading secure sign-in…</p>}>
                <CognitoForm />
              </Suspense>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
function useScans(api: ScanApi) {
  const [scans, setScans] = useState<WasteScan[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void api
      .list(undefined, controller.signal)
      .then((page) => {
        setScans(page.items);
        setCursor(page.nextCursor);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load scans.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, version]);
  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError('');
    try {
      const page = await api.list(cursor);
      setScans((current) => [
        ...current,
        ...page.items.filter((scan) => !current.some((old) => old.scanId === scan.scanId)),
      ]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load scans.');
    } finally {
      setLoading(false);
    }
  };
  return {
    scans,
    cursor,
    loading,
    error,
    loadMore,
    refresh: useCallback(() => setVersion((value) => value + 1), []),
  };
}
export function Dashboard({ api }: { api: ScanApi }) {
  const data = useScans(api);
  const analytics = deriveOwnerAnalytics(data.scans);
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE OVERVIEW"
        title="Make every scan a starting point."
        description="A clear view of your waste intelligence journey."
        action={
          <Link className="button primary" to="/scan">
            + Analyze waste
          </Link>
        }
      />
      <div className="metric-grid">
        {[
          ['Scans loaded', analytics.rowCount.toString(), 'Most recent API page'],
          [
            'Approximate mass',
            `${analytics.approximateMassKg.toLocaleString()} kg`,
            'User-entered; not measured',
          ],
          [
            'Energy outcome',
            analytics.evidenceEnergyKwh === null
              ? 'Unavailable'
              : `${analytics.evidenceEnergyKwh.toLocaleString()} kWh`,
            analytics.evidenceEnergyBasis ?? 'Needs complete comparable analysis evidence',
          ],
          [
            'CO₂e benefit',
            analytics.evidenceCarbonBenefitKgCo2e === null
              ? 'Unavailable'
              : `${analytics.evidenceCarbonBenefitKgCo2e.toLocaleString()} kg CO₂e`,
            analytics.evidenceCarbonBaseline ?? 'Needs complete comparable baseline evidence',
          ],
        ].map(([label, value, detail]) => (
          <article className="metric-card" key={label}>
            <p>
              {label}
              <span aria-hidden="true">↗</span>
            </p>
            <h2>{value}</h2>
            <small>{detail}</small>
          </article>
        ))}
      </div>
      <section className="insight-banner">
        <div>
          <p className="eyebrow">A FOUNDATION FOR BETTER DECISIONS</p>
          <h2>Start with what you can see.</h2>
          <p>
            These totals cover the most recent {analytics.rowCount} loaded scans. Mass is
            user-entered; impact totals appear only when every loaded scan has comparable cited
            evidence.
          </p>
        </div>
        <Link to="/scan" className="button secondary">
          Create your first scan ↗
        </Link>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR ACTIVITY</p>
            <h2>Recent analyses</h2>
          </div>
          <Link className="text-link" to="/history">
            View history ↗
          </Link>
        </div>
        {data.error ? (
          <ErrorNotice message={data.error} retry={data.refresh} />
        ) : data.loading ? (
          <Skeleton />
        ) : data.scans.length ? (
          <ScanRows scans={data.scans.slice(0, 5)} />
        ) : (
          <EmptyState />
        )}
      </section>
    </>
  );
}

export function DigitalTwin({ api }: { api: ScanApi }) {
  const data = useScans(api);
  const analytics = deriveOwnerAnalytics(data.scans);
  const [trendGranularity, setTrendGranularity] = useState<ActivityGranularity>('DAY');
  const trendActivity = groupActivityByPeriod(data.scans, trendGranularity);
  return (
    <>
      <PageHeading
        eyebrow="DIGITAL WASTE TWIN"
        title="Your recorded waste, in context."
        description={`Descriptive view of ${analytics.rowCount} recently loaded owner-scoped scans. This is not a geospatial or facility model.`}
      />
      {data.error && <ErrorNotice message={data.error} retry={data.refresh} />}
      {data.loading && !data.scans.length ? (
        <Skeleton />
      ) : (
        <>
          <div className="metric-grid">
            <article className="metric-card">
              <p>Approximate mass</p>
              <h2>{analytics.approximateMassKg.toLocaleString()} kg</h2>
              <small>Recorded user inputs</small>
            </article>
            <article className="metric-card">
              <p>Completed analyses</p>
              <h2>{analytics.completedScans}</h2>
              <small>Only records with analysis results</small>
            </article>
            <article className="metric-card">
              <p>Energy evidence</p>
              <h2>
                {analytics.evidenceEnergyKwh === null
                  ? 'Unavailable'
                  : `${analytics.evidenceEnergyKwh.toLocaleString()} kWh`}
              </h2>
              <small>
                {analytics.evidenceEnergyBasis ?? 'No comparable evidence for all loaded scans'}
              </small>
            </article>
            <article className="metric-card">
              <p>Analysis unavailable</p>
              <h2>{analytics.analysisUnavailable}</h2>
              <small>Controlled disabled-analysis status</small>
            </article>
          </div>
          <div className="twin-breakdowns">
            <section className="panel analytics-panel">
              <h2>Recorded material categories</h2>
              <p className="muted">Only completed, validated analysis results are counted.</p>
              {Object.keys(analytics.categoryCounts).length ? (
                <ul>
                  {Object.entries(analytics.categoryCounts).map(([category, count]) => (
                    <li key={category}>
                      <strong>{category.replaceAll('_', ' ')}</strong>
                      <span>
                        {count} scans
                        <progress
                          max={Math.max(1, analytics.completedScans)}
                          value={count}
                          aria-label={`${category.replaceAll('_', ' ')}: ${count} of ${analytics.completedScans} completed scans`}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No completed classifications are available.</p>
              )}
            </section>
            <section className="panel analytics-panel">
              <h2>Recorded recovery pathways</h2>
              <p className="muted">Analysis suggestions are not verified facility acceptance.</p>
              {Object.keys(analytics.recoveryPathwayCounts).length ? (
                <ul>
                  {Object.entries(analytics.recoveryPathwayCounts).map(([pathway, count]) => (
                    <li key={pathway}>
                      <strong>{pathway.replaceAll('_', ' ')}</strong>
                      <span>{count} scans</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No analyzed recovery pathways are available.</p>
              )}
            </section>
          </div>
          <section className="panel analytics-panel">
            <h2>Highest recorded source activity</h2>
            <p className="muted">
              A descriptive hotspot ranking by user-entered source label. It is not a geospatial
              hotspot or verified facility location.
            </p>
            {analytics.siteActivity.length ? (
              <ul>
                {analytics.siteActivity.map((site) => (
                  <li key={site.label}>
                    <strong>{site.label}</strong>
                    <span>
                      {site.scans} scans · {site.approximateMassKg.toLocaleString()} kg approximate
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No source labels are recorded yet.</p>
            )}
          </section>
          <section className="panel analytics-panel">
            <div className="section-heading trend-heading">
              <div>
                <h2>Recorded activity trends</h2>
                <p className="muted">UTC periods across the recently loaded scans.</p>
              </div>
              <label>
                Trend interval
                <select
                  value={trendGranularity}
                  onChange={(event) =>
                    setTrendGranularity(event.target.value as ActivityGranularity)
                  }
                >
                  <option value="DAY">Daily</option>
                  <option value="WEEK">Weekly</option>
                  <option value="MONTH">Monthly</option>
                </select>
              </label>
            </div>
            {trendActivity.length ? (
              <ol>
                {trendActivity.map((period) => (
                  <li key={period.period}>
                    <time dateTime={period.period}>{period.period}</time>
                    <span>
                      {period.scans} scans · {period.approximateMassKg.toLocaleString()} kg
                      approximate
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No scans are available.</p>
            )}
            {data.cursor && (
              <button
                className="button secondary"
                disabled={data.loading}
                onClick={() => void data.loadMore()}
              >
                Load more scans
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}

export function ScenarioSimulator() {
  const [result, setResult] = useState<ReturnType<typeof simulateEnergy> | null>(null);
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const input: SimulationInput = {
        quantityKg: Number(fields.get('quantityKg')),
        currentDisposalPathway: fields.get(
          'currentDisposalPathway',
        ) as SimulationInput['currentDisposalPathway'],
        diversionPercent: Number(fields.get('diversionPercent')),
        pathway: fields.get('pathway') as SimulationInput['pathway'],
        lowerKwhPerKg: Number(fields.get('lower')),
        typicalKwhPerKg: Number(fields.get('typical')),
        upperKwhPerKg: Number(fields.get('upper')),
        evidenceUrl: String(fields.get('evidenceUrl')),
        evidenceVersion: String(fields.get('evidenceVersion')),
        energyBasis: fields.get('energyBasis') as SimulationInput['energyBasis'],
      };
      setResult(simulateEnergy(input));
      setError('');
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'Check the scenario inputs.');
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="SCENARIO SIMULATOR"
        title="Explore a cited what-if."
        description="Enter a published factor range to calculate a transparent scenario. No factor is prefilled or presented as a Waste2Watt recommendation."
      />
      <form className="panel simulator-form" onSubmit={submit}>
        <p className="eyebrow">USER-ENTERED ASSUMPTIONS</p>
        <label>
          Quantity (kg)
          <input name="quantityKg" type="number" min="0.001" max="1000000" step="any" required />
        </label>
        <label>
          Current disposal pathway (user-reported)
          <select name="currentDisposalPathway">
            <option value="LANDFILL">Landfill</option>
            <option value="RECYCLING">Recycling</option>
            <option value="COMPOSTING">Composting</option>
            <option value="OTHER">Other or unknown</option>
          </select>
        </label>
        <label>
          Proposed diversion (%)
          <input
            name="diversionPercent"
            type="number"
            min="0"
            max="100"
            step="1"
            defaultValue="100"
            required
          />
        </label>
        <label>
          Recovery pathway
          <select name="pathway">
            <option value="ANAEROBIC_DIGESTION">Anaerobic digestion</option>
            <option value="COMBUSTION">Combustion</option>
            <option value="GASIFICATION">Gasification</option>
            <option value="PYROLYSIS">Pyrolysis</option>
          </select>
        </label>
        <div className="simulator-range">
          <label>
            Lower kWh/kg
            <input name="lower" type="number" min="0.000001" step="any" required />
          </label>
          <label>
            Typical kWh/kg
            <input name="typical" type="number" min="0.000001" step="any" required />
          </label>
          <label>
            Upper kWh/kg
            <input name="upper" type="number" min="0.000001" step="any" required />
          </label>
        </div>
        <label>
          Energy basis
          <select name="energyBasis">
            <option value="THEORETICAL_POTENTIAL">Theoretical potential</option>
            <option value="GROSS_OUTPUT">Gross output</option>
            <option value="USABLE_ELECTRICITY">Usable electricity</option>
            <option value="USEFUL_HEAT">Useful heat</option>
            <option value="NET_OUTPUT">Net output</option>
          </select>
        </label>
        <label>
          Public evidence URL
          <input name="evidenceUrl" type="url" placeholder="https://…" required />
        </label>
        <label>
          Evidence version, table or date
          <input name="evidenceVersion" required />
        </label>
        <p className="field-help">
          Use a source whose scope matches the selected pathway and basis. Calculations are not
          independently validated.
        </p>
        <button className="button primary" type="submit">
          Calculate scenario
        </button>
        {error && (
          <p className="error-notice" role="alert">
            {error}
          </p>
        )}
      </form>
      {result && (
        <section className="panel scenario-result" aria-live="polite">
          <p className="eyebrow">SIMULATED · NOT A MEASURED RESULT</p>
          <h2>
            {result.lowerKwh.toLocaleString()}–{result.upperKwh.toLocaleString()} kWh
          </h2>
          <p>
            {result.divertedMassKg.toLocaleString()} kg scenario-diverted from{' '}
            {result.quantityKg.toLocaleString()} kg recorded;{' '}
            {result.remainingMassKg.toLocaleString()} kg remains on the user-reported{' '}
            {result.currentDisposalPathway.toLowerCase()} route.
          </p>
          <p>
            Typical input: {result.typicalKwh.toLocaleString()} kWh ·{' '}
            {result.energyBasis.replaceAll('_', ' ')}
          </p>
          <p>
            Evidence:{' '}
            <a href={result.evidenceUrl} target="_blank" rel="noreferrer">
              {result.evidenceVersion} ↗
            </a>
          </p>
          <ul>
            {result.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>Carbon benefit: unavailable; no verified baseline was supplied.</p>
          <p>
            Facility acceptance: unverified. The diversion percentage and current route are
            user-entered assumptions.
          </p>
        </section>
      )}
    </>
  );
}

export function Advisor({ api }: { api: ScanApi }) {
  const data = useScans(api);
  const analytics = deriveOwnerAnalytics(data.scans);
  const suggestions =
    analytics.rowCount === 0
      ? ['Create a scan record to begin a private activity log.']
      : [
          `Review ${analytics.analysisUnavailable} records with analysis unavailable before treating them as categorized waste.`,
          'Check user-entered source labels and quantities against site records before planning collection.',
          'Use the scenario simulator only with a cited factor that matches the feedstock and energy basis.',
        ];
  return (
    <>
      <PageHeading
        eyebrow="SUSTAINABILITY WORKSPACE"
        title="Practical prompts, grounded in records."
        description="Deterministic, read-only guidance from your recently loaded scans. No language model is connected and no action is taken for you."
      />
      {data.error && <ErrorNotice message={data.error} retry={data.refresh} />}
      <section className="panel advisor-panel" aria-live="polite">
        <p className="eyebrow">READ-ONLY · {analytics.rowCount} RECENT RECORDS</p>
        <h2>Questions to consider</h2>
        <ul>
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
        <p className="muted">
          This tool cannot verify materials, facility acceptance, energy yield, emissions savings or
          local regulations. It does not send data to an external model.
        </p>
      </section>
    </>
  );
}
export function History({ api }: { api: ScanApi }) {
  const data = useScans(api);
  const [selected, setSelected] = useState<WasteScan | null>(null);
  const [detailError, setDetailError] = useState('');
  const [reading, setReading] = useState(false);
  const select = async (scan: WasteScan) => {
    setReading(true);
    setDetailError('');
    try {
      setSelected(await api.get(scan.scanId));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Could not read scan.');
    } finally {
      setReading(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR SCAN LIBRARY"
        title="A record of what comes next."
        description="Private, owner-scoped scans. Newest first."
        action={
          <button className="button secondary" onClick={data.refresh}>
            Refresh history
          </button>
        }
      />
      <section className="panel">
        {data.error && <ErrorNotice message={data.error} retry={data.refresh} />}
        {data.loading && !data.scans.length ? (
          <Skeleton />
        ) : data.scans.length ? (
          <ScanRows
            scans={data.scans}
            onSelect={(scan) => {
              void select(scan);
            }}
          />
        ) : (
          !data.error && <EmptyState />
        )}
        {data.cursor && (
          <button
            className="button secondary load-more"
            disabled={data.loading}
            onClick={() => {
              void data.loadMore();
            }}
          >
            {data.loading ? 'Loading…' : 'Load more scans'}
          </button>
        )}
      </section>
      {reading && <p role="status">Reading scan…</p>}
      {detailError && <ErrorNotice message={detailError} />}
      {selected && (
        <section className="panel scan-detail">
          <div className="section-heading">
            <h2>{selected.sourceLabel || 'Scan details'}</h2>
            <button className="text-button" onClick={() => setSelected(null)}>
              Close details
            </button>
          </div>
          <StatusBadge status={selected.status} />
          <dl>
            <dt>Scan ID</dt>
            <dd>{selected.scanId}</dd>
            <dt>Approximate quantity</dt>
            <dd>{selected.quantityKg} kg</dd>
            <dt>Updated</dt>
            <dd>{new Date(selected.updatedAt).toLocaleString()}</dd>
          </dl>
          {selected.status === 'COMPLETED' && <AnalysisResult result={selected.analysis} />}
          <p className="muted">
            {selected.status === 'FAILED'
              ? failureMessage(selected)
              : selected.status === 'COMPLETED'
                ? 'Analysis completed; review its evidence and limitations above.'
                : 'Analysis is pending. No validated result is available yet.'}
          </p>
        </section>
      )}
    </>
  );
}
export function failureMessage(scan: Pick<WasteScan, 'failureCode'>) {
  if (scan.failureCode === 'AI_LIMIT_EXCEEDED')
    return 'The daily AI limit was reached. This scan was not analyzed. Automatic retries are disabled.';
  if (scan.failureCode === 'INVALID_MODEL_OUTPUT')
    return 'The model response could not be validated. No analysis result was accepted.';
  if (scan.failureCode === 'ANALYSIS_UNAVAILABLE')
    return 'Analysis is unavailable. No result was generated; contact support before requesting another attempt.';
  if (scan.failureCode === 'INVALID_IMAGE')
    return 'The uploaded image could not be safely decoded. Use a valid PNG, JPEG or WebP image.';
  return scan.failureCode === 'UPLOAD_REJECTED'
    ? 'The uploaded file did not match the declared image. Create a new scan with a supported image.'
    : scan.failureCode === 'ANALYSIS_NOT_IMPLEMENTED'
      ? 'Your image was received. The development analysis pipeline is not implemented yet and deliberately failed. No AI result was generated.'
      : 'Processing failed. No AI result is available. You can revisit this scan in history.';
}
export function ScanPage({ api }: { api: ScanApi }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [quantity, setQuantity] = useState('');
  const [source, setSource] = useState('');
  const [externalProcessingConsent, setExternalProcessingConsent] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [scan, setScan] = useState<WasteScan | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollStopped, setPollStopped] = useState(false);
  const [scanId, setScanId] = useState('');
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => operation.current?.abort(), []);
  const choose = (next: File | undefined) => {
    if (!next) return;
    const issue = validateImage(next);
    if (issue) {
      setError(issue);
      return;
    }
    setFile(next);
    setError('');
    setStatus(null);
    setScan(null);
    setScanId('');
    setPollStopped(false);
    setExternalProcessingConsent(false);
  };
  useEffect(() => {
    if (!scanId || !polling) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      try {
        const record = await api.get(scanId, controller.signal);
        if (controller.signal.aborted) return;
        setScan(record);
        setStatus(record.status);
        if (['FAILED', 'COMPLETED'].includes(record.status)) {
          setPolling(false);
          return;
        }
        setError('');
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Status could not be refreshed.');
      }
      attempts++;
      if (attempts >= 40) {
        setPolling(false);
        setPollStopped(true);
        return;
      }
      timer = setTimeout(
        () => {
          void poll();
        },
        Math.min(3000 + attempts * 250, 8000),
      );
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [api, scanId, polling]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || busy) return;
    const issue = validateImage(file);
    if (issue) {
      setError(issue);
      return;
    }
    const input = createScanRequestSchema.safeParse({
      quantityKg: Number(quantity),
      unit: 'kg',
      externalProcessingConsent,
      ...(source.trim() ? { sourceLabel: source.trim() } : {}),
    });
    if (!input.success) {
      setError(
        'Enter a positive quantity in kg (up to 1,000,000) and a source label of at most 80 characters.',
      );
      return;
    }
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setPollStopped(false);
    try {
      const created = scanId
        ? { scanId, status: 'CREATED' as const }
        : await api.create(input.data, controller.signal);
      setScanId(created.scanId);
      setStatus('CREATED');
      const upload = await api.upload(
        created.scanId,
        {
          contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: file.size,
        },
        controller.signal,
      );
      setStatus('UPLOADING');
      setProgress(0);
      await uploadImage(file, upload, setProgress, controller.signal);
      setStatus('UPLOADED');
      setPolling(true);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Upload could not finish. Please retry.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const locked =
    busy || polling || ['COMPLETED', 'FAILED', 'UPLOADED', 'PROCESSING'].includes(status ?? '');
  return (
    <>
      <PageHeading
        eyebrow="ANALYZE WASTE"
        title="A photo today. A clearer path tomorrow."
        description="Capture your waste stream and give it the context it deserves."
      />
      <div className="scan-grid">
        <section className="panel capture-panel">
          <div className="section-heading">
            <h2>Take or upload a waste photo</h2>
            <span className="step-label">STEP 01</span>
          </div>
          <div className={`upload-area ${preview ? 'has-preview' : ''}`}>
            {preview ? (
              <img src={preview} alt="Selected waste image preview" />
            ) : (
              <>
                <div className="capture-reticle" aria-hidden="true">
                  <span>+</span>
                </div>
                <h3>Bring your waste into focus.</h3>
                <p>One clear photo is a good place to start.</p>
              </>
            )}
            <div className="upload-buttons">
              <button
                className="button primary"
                disabled={locked}
                onClick={() => camera.current?.click()}
              >
                Take Photo / Choose Image
              </button>
              <button
                className="button secondary"
                disabled={locked}
                onClick={() => picker.current?.click()}
              >
                Choose Image
              </button>
            </div>
          </div>
          <input
            ref={camera}
            className="sr-only"
            tabIndex={-1}
            aria-label="Capture waste image"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={locked}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <input
            ref={picker}
            className="sr-only"
            tabIndex={-1}
            aria-label="Select waste image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={locked}
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="upload-guidance">
            <span>JPEG, PNG, WebP · Up to 10 MB</span>
            <span>Private S3 storage</span>
          </div>
          <p className="muted small">
            On compatible phones, take a photo with your camera. Desktop browsers open an image
            picker. Camera options depend on your device and browser.
          </p>
        </section>
        <form
          className="panel context-panel"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <div className="section-heading">
            <h2>Add a little context</h2>
            <span className="step-label">STEP 02</span>
          </div>
          <label htmlFor="quantity">Approximate waste quantity</label>
          <div className="quantity-field">
            <input
              id="quantity"
              required
              type="number"
              min="0.001"
              max="1000000"
              step="any"
              value={quantity}
              disabled={locked || Boolean(scanId)}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2.5"
            />
            <span>kg</span>
          </div>
          <p className="field-help">An estimate is fine. This is not an energy calculation.</p>
          <label htmlFor="source">
            Source or location <span className="muted">(optional)</span>
          </label>
          <input
            id="source"
            maxLength={80}
            value={source}
            disabled={locked || Boolean(scanId)}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Main Canteen, Hostel A, Office…"
          />
          <div className="privacy-note">
            <span className="live-dot" />
            <p>Your image is stored privately. Your account owns this scan.</p>
          </div>
          <label className="external-consent">
            <input
              type="checkbox"
              checked={externalProcessingConsent}
              disabled={locked || Boolean(scanId)}
              onChange={(event) => setExternalProcessingConsent(event.target.checked)}
            />
            <span>
              Allow external free-tier AI processing if needed. A compressed image may be sent to
              Google Gemini, Groq, or OpenRouter under their privacy policies. It will not be sent
              to these providers unless you check this box.
            </span>
          </label>
          {error && <ErrorNotice message={error} />}
          <button className="button primary full-width" disabled={!file || locked} type="submit">
            {busy
              ? 'Uploading securely…'
              : scanId && !locked
                ? 'Retry image upload'
                : 'Create scan & upload'}{' '}
            <span aria-hidden="true">↗</span>
          </button>
          <p className="small muted">
            Results appear only after server validation. Energy and carbon estimates require
            reviewed conversion factors.
          </p>
        </form>
      </div>
      {status && (
        <section className="panel processing-panel" aria-live="polite">
          <div className="section-heading">
            <h2>Scan progress</h2>
            <StatusBadge status={status} />
          </div>
          <ol className="progress-steps">
            {(
              ['CREATED', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED'] as const
            ).map((step) => (
              <li key={step} aria-current={status === step ? 'step' : undefined}>
                {step}
              </li>
            ))}
          </ol>
          {status === 'UPLOADING' && (
            <>
              <progress max={100} value={progress} aria-label="Image upload progress" />
              <p>{progress}% uploaded</p>
            </>
          )}
          {status === 'FAILED' ? (
            <p>{failureMessage(scan ?? {})}</p>
          ) : status === 'COMPLETED' ? (
            <AnalysisResult result={scan?.analysis} />
          ) : (
            <p>
              {pollStopped
                ? 'Status polling paused. Processing may still be pending; refresh or check history. No success is assumed.'
                : 'Following your scan status. A validated result or an explicit failure will appear here.'}
            </p>
          )}
          {pollStopped && (
            <button
              className="button secondary"
              onClick={() => {
                setPollStopped(false);
                setPolling(true);
              }}
            >
              Refresh status
            </button>
          )}
          <Link to="/history" className="text-link">
            View scan history ↗
          </Link>
          {['FAILED', 'COMPLETED'].includes(status) && (
            <button
              className="button secondary"
              onClick={() => {
                setFile(null);
                setScan(null);
                setStatus(null);
                setScanId('');
              }}
            >
              Start another scan
            </button>
          )}
        </section>
      )}
    </>
  );
}
export function Settings() {
  const auth = useAuth();
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE SETTINGS"
        title="Your account. Your workspace."
        description="A transparent view of your current configuration."
      />
      <section className="panel settings-panel">
        <h2>Account & privacy</h2>
        <dl>
          <dt>Authentication</dt>
          <dd>Amazon Cognito</dd>
          <dt>Account ID</dt>
          <dd>{auth.userId}</dd>
          <dt>Image access</dt>
          <dd>Private; no permanent public image URLs</dd>
          <dt>Analysis engine</dt>
          <dd>Configured; live inference is disabled pending authorization</dd>
        </dl>
        <p className="muted">
          Account deletion, data export, and notification settings are planned. No controls pretend
          to save settings.
        </p>
      </section>
    </>
  );
}
