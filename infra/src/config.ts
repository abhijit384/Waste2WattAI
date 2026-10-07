/** Local configuration only; resolving it never queries AWS. */
export interface InfrastructureConfig {
  stage: 'dev' | 'staging' | 'prod';
  region: string;
  frontendOrigin: string;
}

export function resolveConfig(input: Record<string, unknown> = {}): InfrastructureConfig {
  const stage = input.stage ?? 'dev';
  const region = input.region ?? 'us-east-1';
  const frontendOrigin = input.frontendOrigin ?? 'http://localhost:5173';
  if (stage !== 'dev' && stage !== 'staging' && stage !== 'prod') {
    throw new Error('stage must be dev, staging, or prod');
  }
  if (typeof region !== 'string' || !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region)) {
    throw new Error('region must be an AWS region identifier');
  }
  if (typeof frontendOrigin !== 'string') throw new Error('frontendOrigin must be a string');
  const url = new URL(frontendOrigin);
  if (
    url.origin !== frontendOrigin ||
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(
        stage === 'dev' &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      ))
  ) {
    throw new Error('frontendOrigin must be an exact HTTPS origin (dev also allows HTTP loopback)');
  }
  return { stage, region, frontendOrigin };
}
