import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AnalysisLoading } from './AnalysisLoading';

afterEach(cleanup);

it('shows an animated accessible processing state without invented percent complete', () => {
  render(<AnalysisLoading status="PROCESSING" />);
  expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  expect(screen.getByRole('heading', { name: 'Reading the visible evidence' })).toBeTruthy();
  expect(screen.getByText('processing')).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});

it('makes a paused status check explicit and does not imply completion', () => {
  render(<AnalysisLoading status="PROCESSING" paused />);
  expect(screen.getByRole('heading', { name: 'Still waiting for an update' })).toBeTruthy();
  expect(screen.getByText('No result assumed')).toBeTruthy();
});
