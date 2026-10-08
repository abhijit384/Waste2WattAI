/** Deliberately fail closed. No images, models, factors, or persistence are accessed. */
export async function handler(): Promise<never> {
  const error = new Error(
    'Image analysis is not implemented; deployment testing cannot produce AI results.',
  );
  error.name = 'Phase3NotImplemented';
  throw error;
}
