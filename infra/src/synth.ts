import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { projectRoot } from './paths.ts';

// Local synthesis: keep CDK cache and assembly outputs inside the repository.
const cli = createRequire(import.meta.url).resolve('aws-cdk/bin/cdk');
const result = spawnSync(
  process.execPath,
  [cli, 'synth', '--lookups', 'false', ...process.argv.slice(2)],
  {
    cwd: join(projectRoot, 'infra'),
    env: {
      ...process.env,
      CDK_HOME: join(projectRoot, 'infra/.cdk'),
      CDK_DISABLE_VERSION_CHECK: '1',
      AWS_EC2_METADATA_DISABLED: 'true',
    },
    stdio: 'inherit',
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
