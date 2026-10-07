/** Deliberately fail closed. No images, models, factors, or persistence are accessed. */
export async function handler(): Promise<never> {
  const error = new Error('Image analysis stages are deferred to Phase 3.');
  error.name = 'Phase3NotImplemented';
  throw error;
}
