import { z } from 'zod';

const envSchema = z.object({
  VITE_AWS_REGION: z.string().regex(/^[a-z]{2}(?:-[a-z]+)+-\d+$/),
  VITE_COGNITO_USER_POOL_ID: z.string().regex(/^[a-z]{2}(?:-[a-z]+)+-\d+_[a-zA-Z0-9]+$/),
  VITE_COGNITO_USER_POOL_CLIENT_ID: z.string().regex(/^[a-z0-9]{10,128}$/),
  VITE_API_URL: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
  }),
});
export function parseFrontendConfig(env: Record<string, unknown>) {
  const result = envSchema.safeParse(env);
  if (!result.success)
    return {
      configured: false as const,
      errors: [...new Set(result.error.issues.map((issue) => String(issue.path[0])))],
    };
  if (!result.data.VITE_COGNITO_USER_POOL_ID.startsWith(`${result.data.VITE_AWS_REGION}_`))
    return { configured: false as const, errors: ['VITE_COGNITO_USER_POOL_ID'] };
  return {
    configured: true as const,
    ...result.data,
    VITE_API_URL: result.data.VITE_API_URL.replace(/\/$/, ''),
  };
}
export type FrontendConfig = ReturnType<typeof parseFrontendConfig>;
