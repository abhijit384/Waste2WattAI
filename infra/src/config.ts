/** Local configuration only; resolving it never queries AWS. */
export interface InfrastructureConfig {
  stage: 'dev' | 'staging' | 'prod';
  region: string;
  frontendOrigin: string;
  frontendOrigins: string[];
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
  const configuredOrigins = input.frontendOrigins ?? [frontendOrigin];
  const frontendOrigins: unknown =
    typeof configuredOrigins === 'string' ? JSON.parse(configuredOrigins) : configuredOrigins;
  if (!Array.isArray(frontendOrigins) || frontendOrigins.length < 1 || frontendOrigins.length > 10)
    throw new Error('frontendOrigins must contain 1..10 exact origins');
  const validateOrigin = (origin: unknown): string => {
    if (typeof origin !== 'string') throw new Error('frontend origins must be strings');
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      (url.protocol !== 'https:' &&
        !(
          stage === 'dev' &&
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)
        ))
    ) {
      throw new Error(
        'frontend origins must be exact HTTPS origins (dev also allows HTTP loopback)',
      );
    }
    return origin;
  };
  const primaryOrigin = validateOrigin(frontendOrigin);
  const origins = [...new Set(frontendOrigins.map(validateOrigin))];
  if (!origins.includes(primaryOrigin))
    throw new Error('frontendOrigins must include frontendOrigin');
  return { stage, region, frontendOrigin: primaryOrigin, frontendOrigins: origins };
}
