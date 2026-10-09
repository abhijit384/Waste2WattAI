import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, ProtectedRoute, profileFromAttributes, profileInitial } from './auth';
import { parseFrontendConfig } from './config';
import { validateImage } from './file-validation';
import {
  ConfigurationNotice,
  Dashboard,
  DigitalTwin,
  ScanPage,
  ScenarioSimulator,
  failureMessage,
  Settings,
} from './pages';
import { ErrorBoundary, ThemeProvider, ThemeToggle } from './components';
import { createApi, uploadImage, type ScanApi } from './api';
import { fetchAuthSession } from 'aws-amplify/auth';

vi.mock('aws-amplify/auth', async (original) => ({
  ...(await original<typeof import('aws-amplify/auth')>()),
  fetchAuthSession: vi.fn(),
}));
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  uploadImage: vi.fn(),
}));

afterEach(() => {
  cleanup();
  window.localStorage.removeItem('w2w-theme');
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const configValues = {
  VITE_AWS_REGION: 'us-east-1',
  VITE_COGNITO_USER_POOL_ID: 'us-east-1_TestOnly',
  VITE_COGNITO_USER_POOL_CLIENT_ID: 'testonlyclient123',
  VITE_API_URL: 'https://api.example.com',
};
function wrap(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}
function stubApi() {
  return {
    list: vi.fn().mockResolvedValue({ items: [] }),
    get: vi.fn(),
    create: vi.fn(),
    upload: vi.fn(),
  } as unknown as ScanApi;
}
describe('appearance theme', () => {
  it('switches between accessible light and dark modes and remembers the choice', async () => {
    document.documentElement.dataset.theme = 'dark';
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('w2w-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('w2w-theme')).toBe('dark');
  });
});
describe('frontend configuration', () => {
  it('accepts complete configuration', () =>
    expect(parseFrontendConfig(configValues).configured).toBe(true));
  it('rejects missing values with named fields', () => {
    const parsed = parseFrontendConfig({});
    expect(parsed.configured).toBe(false);
    if (!parsed.configured) expect(parsed.errors).toContain('VITE_API_URL');
  });
  it('rejects mismatched pool region', () =>
    expect(parseFrontendConfig({ ...configValues, VITE_AWS_REGION: 'eu-west-1' }).configured).toBe(
      false,
    ));
  it('rejects insecure API URLs and credentials', () => {
    for (const url of [
      'http://api.example.com',
      'https://user:password@api.example.com',
      'https://api.example.com?token=x',
    ])
      expect(parseFrontendConfig({ ...configValues, VITE_API_URL: url }).configured).toBe(false);
  });
});
describe('protected routing', () => {
  for (const status of ['loading', 'anonymous', 'authenticated'] as const)
    it(`handles ${status} session`, () => {
      render(
        <AuthContext.Provider
          value={{ status, signOut: async () => {}, updateFirstName: async () => {} }}
        >
          <MemoryRouter initialEntries={['/private']}>
            <Routes>
              <Route
                path="/private"
                element={
                  <ProtectedRoute>
                    <p>Private workspace</p>
                  </ProtectedRoute>
                }
              />
              <Route path="/auth" element={<p>Sign in required</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      );
      expect(
        screen.getByText(
          status === 'loading'
            ? 'Restoring your secure session…'
            : status === 'anonymous'
              ? 'Sign in required'
              : 'Private workspace',
        ),
      ).toBeTruthy();
    });
});
describe('account profile', () => {
  it('reads public profile attributes and uses the first name for the avatar', () => {
    const profile = profileFromAttributes({
      given_name: 'Asha',
      family_name: 'Rao',
      email: 'asha@example.com',
      email_verified: 'true',
    });
    expect(profile).toMatchObject({
      firstName: 'Asha',
      lastName: 'Rao',
      fullName: 'Asha Rao',
      email: 'asha@example.com',
      emailVerified: true,
    });
    expect(profileInitial(profile)).toBe('A');
  });

  it('uses a sensible initial fallback when the first name is missing', () => {
    expect(profileInitial({ email: 'maya@example.com' })).toBe('M');
    expect(profileInitial()).toBe('A');
    expect(profileFromAttributes({ email: 'maya@example.com' }).emailVerified).toBeUndefined();
  });

  it('shows profile details, account actions, FAQs, and customer-care access', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            status: 'authenticated',
            userId: 'private-subject-id',
            profile: { firstName: 'Asha', email: 'asha@example.com', emailVerified: true },
            signOut: async () => {},
            updateFirstName: async () => {},
          }}
        >
          <Settings />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByText('asha@example.com')).toBeTruthy();
    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Request account deletion' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Contact customer care/ })).toBeTruthy();
    expect(screen.getByText('Frequently asked questions')).toBeTruthy();
    expect(screen.queryByText('private-subject-id')).toBeNull();
  });
});
describe('file validation', () => {
  it('accepts supported MIME types at the size boundary', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp'])
      expect(validateImage({ type, size: 10 * 1024 * 1024 })).toBeNull();
  });
  it('rejects unsupported, oversized, and empty files', () => {
    for (const file of [
      { type: 'image/svg+xml', size: 10 },
      { type: 'image/png', size: 10 * 1024 * 1024 + 1 },
      { type: 'image/jpeg', size: 0 },
    ])
      expect(validateImage(file)).not.toBeNull();
  });
});
describe('important application states', () => {
  function prepareUpload(api: ScanApi) {
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL() {
          return 'blob:test-preview';
        }
        static revokeObjectURL() {}
      },
    );
    vi.mocked(api.create).mockResolvedValue({
      scanId: '10000000-0000-4000-8000-000000000001',
      status: 'CREATED',
    });
    vi.mocked(api.upload).mockResolvedValue({
      url: 'https://bucket.s3.amazonaws.com',
      fields: {},
      expiresAt: '2026-10-08T00:05:00.000Z',
    });
    wrap(<ScanPage api={api} />);
    fireEvent.change(screen.getByLabelText('Select waste image'), {
      target: { files: [new File(['test-only-image'], 'sample.png', { type: 'image/png' })] },
    });
    fireEvent.change(screen.getByLabelText('Approximate waste quantity'), {
      target: { value: '2.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create scan/ }));
  }
  it('enables configured external processing by default without a per-scan checkbox', async () => {
    const api = stubApi();
    vi.mocked(uploadImage).mockResolvedValue();
    vi.mocked(api.get).mockResolvedValue({
      scanId: '10000000-0000-4000-8000-000000000001',
      userId: '10000000-0000-4000-8000-000000000002',
      status: 'FAILED',
      quantityKg: 2.5,
      unit: 'kg',
      createdAt: '2026-10-08T00:00:00.000Z',
      updatedAt: '2026-10-08T00:00:00.000Z',
      failureCode: 'ANALYSIS_NOT_IMPLEMENTED',
    });
    prepareUpload(api);
    expect(await screen.findByText(/Your image was received/)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(
      screen.getByText(/A compressed image may be processed by configured external AI providers/),
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/free-tier|zero.cost/i);
    expect(api.create).toHaveBeenCalledWith(
      { quantityKg: 2.5, unit: 'kg', externalProcessingConsent: true },
      expect.any(AbortSignal),
    );
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledTimes(1);
  });
  it('retains a retryable scan when direct upload fails without starting polling', async () => {
    const api = stubApi();
    vi.mocked(uploadImage).mockRejectedValue(new Error('Upload connection failed'));
    prepareUpload(api);
    expect((await screen.findByRole('alert')).textContent).toContain('Upload connection failed');
    expect(screen.getByRole('button', { name: /Retry image upload/ })).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
  });
  it('shows a controlled configuration error with no fake sign-in', () => {
    wrap(<ConfigurationNotice config={parseFrontendConfig({})} />);
    expect(screen.getByRole('alert').textContent).toContain('no demo account');
  });
  it('renders loaded-scan and unavailable-impact dashboard states', async () => {
    wrap(<Dashboard api={stubApi()} />);
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading analyses');
    expect(await screen.findByText('Your first insight starts with a photo.')).toBeTruthy();
    expect(screen.getByText('0 kg')).toBeTruthy();
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  });
  it('renders empty Digital Twin states without inventing categories or impacts', async () => {
    wrap(<DigitalTwin api={stubApi()} />);
    expect(await screen.findByText('No completed classifications are available.')).toBeTruthy();
    expect(screen.getByText('No source labels are recorded yet.')).toBeTruthy();
    expect(screen.getByText('No analyzed recovery pathways are available.')).toBeTruthy();
    expect(screen.getByText('No scans are available.')).toBeTruthy();
    const interval = screen.getByRole('combobox', { name: 'Trend interval' }) as HTMLSelectElement;
    fireEvent.change(interval, { target: { value: 'MONTH' } });
    expect(interval.value).toBe('MONTH');
  });
  it('renders API errors and a retry control', async () => {
    const api = stubApi();
    vi.mocked(api.list).mockRejectedValue(new Error('Service unavailable'));
    wrap(<Dashboard api={api} />);
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Service unavailable'),
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
  it('renders real recent scan metadata, not fabricated analysis', async () => {
    const api = stubApi();
    vi.mocked(api.list).mockResolvedValue({
      items: [
        {
          scanId: '10000000-0000-4000-8000-000000000001',
          userId: '10000000-0000-4000-8000-000000000002',
          status: 'FAILED',
          createdAt: '2026-10-08T00:00:00.000Z',
          updatedAt: '2026-10-08T00:00:00.000Z',
          quantityKg: 2,
          unit: 'kg',
          sourceLabel: 'Test source',
        },
      ],
    });
    wrap(<Dashboard api={api} />);
    expect(await screen.findByText('Test source')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
  });
  it('provides camera enhancement, validation and a disabled empty submission', () => {
    wrap(<ScanPage api={stubApi()} />);
    expect(screen.getByLabelText('Capture waste image').getAttribute('capture')).toBe(
      'environment',
    );
    expect(
      (screen.getByRole('button', { name: /Create scan/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('Select waste image'), {
      target: { files: [new File(['not-image'], 'bad.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByRole('alert').textContent).toContain('JPEG, PNG, or WebP');
  });
  it('explains intentional placeholder failure', () =>
    expect(failureMessage({ failureCode: 'ANALYSIS_NOT_IMPLEMENTED' })).toContain(
      'No AI result was generated',
    ));
  it('calculates cited scenario inputs and labels them as simulated', () => {
    wrap(<ScenarioSimulator />);
    fireEvent.change(screen.getByLabelText('Quantity (kg)'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Proposed diversion (%)'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByLabelText('Lower kWh/kg'), { target: { value: '0.1' } });
    fireEvent.change(screen.getByLabelText('Typical kWh/kg'), { target: { value: '0.2' } });
    fireEvent.change(screen.getByLabelText('Upper kWh/kg'), { target: { value: '0.3' } });
    fireEvent.change(screen.getByLabelText('Public evidence URL'), {
      target: { value: 'https://example.org/study' },
    });
    fireEvent.change(screen.getByLabelText('Evidence version, table or date'), {
      target: { value: 'Table 4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate scenario' }));
    expect(screen.getByText('SIMULATED · NOT A MEASURED RESULT')).toBeTruthy();
    expect(screen.getByText(/0.2 kWh/)).toBeTruthy();
    expect(screen.getByText(/1 kg scenario-diverted from 2 kg/)).toBeTruthy();
    expect(screen.getByText(/Carbon benefit: unavailable/)).toBeTruthy();
  });
  it('renders a safe error boundary without stack details', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): React.ReactNode {
      throw new Error('private test trace');
    }
    wrap(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByText('We couldn’t display this page.')).toBeTruthy();
    expect(screen.queryByText('private test trace')).toBeNull();
    spy.mockRestore();
  });
});

it('sends an SDK access token as Bearer and rejects malformed API responses', async () => {
  vi.mocked(fetchAuthSession).mockResolvedValue({
    tokens: { accessToken: { toString: () => 'test-only-access-token' } },
  } as Awaited<ReturnType<typeof fetchAuthSession>>);
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ unexpected: true }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const api = createApi(parseFrontendConfig(configValues));
  await expect(api.list()).rejects.toThrow('unexpected response');
  expect(fetch).toHaveBeenCalledWith(
    'https://api.example.com/scans?limit=12',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-only-access-token' }),
    }),
  );
});
