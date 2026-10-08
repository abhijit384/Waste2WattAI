import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseFrontendConfig } from '../apps/web/src/config.ts';

// Hosting fails closed before Vite can publish a configuration-less frontend.
// Only field names are printed; environment values never enter build logs.
export function validateHostingConfig(env) {
  const unexpected = Object.keys(env).filter(
    (key) =>
      key.startsWith('VITE_') &&
      ![
        'VITE_AWS_REGION',
        'VITE_COGNITO_USER_POOL_ID',
        'VITE_COGNITO_USER_POOL_CLIENT_ID',
        'VITE_API_URL',
      ].includes(key),
  );
  if (unexpected.length)
    throw new Error(`Unapproved public environment fields: ${unexpected.join(', ')}`);
  const config = parseFrontendConfig(env);
  if (!config.configured)
    throw new Error(`Missing or invalid public configuration: ${config.errors.join(', ')}`);
  if (env.AMPLIFY_MONOREPO_APP_ROOT !== 'apps/web')
    throw new Error('AMPLIFY_MONOREPO_APP_ROOT must be apps/web');
  if (
    config.VITE_AWS_REGION !== 'us-east-1' ||
    !/^https:\/\/[a-z0-9]+\.execute-api\.us-east-1\.amazonaws\.com$/.test(config.VITE_API_URL)
  )
    throw new Error('Hosting must target the deployed us-east-1 API Gateway');
  return config;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateHostingConfig(process.env);
  process.stdout.write('Public hosting configuration validated.\n');
}
