import { App, Tags } from 'aws-cdk-lib';
import type { InfrastructureConfig } from './config.ts';
import { Waste2WattDataStack } from './stacks/data-stack.ts';
import { Waste2WattAuthStack } from './stacks/auth-stack.ts';
import { Waste2WattApiStack } from './stacks/api-stack.ts';
import { Waste2WattPipelineStack } from './stacks/pipeline-stack.ts';
import { Waste2WattObservabilityStack } from './stacks/observability-stack.ts';

export function createStacks(app: App, config: InfrastructureConfig) {
  // Account remains a CloudFormation token. No account discovery or AWS lookups.
  const props = { env: { region: config.region }, config };
  const data = new Waste2WattDataStack(app, `Waste2WattDataStack-${config.stage}`, {
    ...props,
    terminationProtection: config.stage === 'prod',
  });
  const auth = new Waste2WattAuthStack(app, `Waste2WattAuthStack-${config.stage}`, {
    ...props,
    terminationProtection: config.stage === 'prod',
  });
  const api = new Waste2WattApiStack(app, `Waste2WattApiStack-${config.stage}`, { ...props, auth });
  const pipeline = new Waste2WattPipelineStack(app, `Waste2WattPipelineStack-${config.stage}`, {
    ...props,
    data,
  });
  const observability = new Waste2WattObservabilityStack(
    app,
    `Waste2WattObservabilityStack-${config.stage}`,
    { ...props, api, pipeline },
  );
  Tags.of(app).add('Project', 'Waste2WattAI');
  Tags.of(app).add('Stage', config.stage);
  return { data, auth, api, pipeline, observability };
}
