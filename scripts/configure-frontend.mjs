import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { parseFrontendConfig } from '../apps/web/src/config.ts';

// Only public frontend configuration is extracted; never copy ARNs, keys or tokens.
export function frontendEnvironment(outputs) {
  const required = (stack, name) => {
    const value = outputs?.[stack]?.[name];
    if (typeof value !== 'string' || !value || /[\r\n]/.test(value))
      throw new Error(`Missing or invalid deployed output: ${stack}.${name}`);
    return value;
  };
  const env = {
    VITE_AWS_REGION: 'us-east-1',
    VITE_COGNITO_USER_POOL_ID: required('Waste2WattAuthStack-dev', 'UserPoolId'),
    VITE_COGNITO_USER_POOL_CLIENT_ID: required('Waste2WattAuthStack-dev', 'UserPoolClientId'),
    VITE_API_URL: required('Waste2WattApiStack-dev', 'ApiUrl'),
  };
  if (!parseFrontendConfig(env).configured)
    throw new Error('Deployed frontend outputs are invalid');
  const api = new URL(env.VITE_API_URL);
  if (
    !/^[a-z0-9]+\.execute-api\.us-east-1\.amazonaws\.com$/.test(api.hostname) ||
    api.pathname !== '/'
  )
    throw new Error('Expected a deployed us-east-1 API Gateway endpoint');
  return (
    Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n'
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const source = new URL('../.deployment/cdk-outputs.json', import.meta.url);
  const destination = new URL('../apps/web/.env.local', import.meta.url);
  const outputs = JSON.parse(await readFile(source, 'utf8'));
  await writeFile(destination, frontendEnvironment(outputs), { encoding: 'utf8', mode: 0o600 });
  process.stdout.write(
    'Configured apps/web/.env.local from deployed outputs. Restart Vite or rebuild.\n',
  );
}
