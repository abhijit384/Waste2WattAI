import { App } from 'aws-cdk-lib';
import { createStacks } from './application.ts';
import { resolveConfig } from './config.ts';

const app = new App();
createStacks(
  app,
  resolveConfig({
    stage: app.node.tryGetContext('stage') ?? process.env.W2W_STAGE,
    region: app.node.tryGetContext('region') ?? process.env.W2W_REGION,
    frontendOrigin: app.node.tryGetContext('frontendOrigin') ?? process.env.W2W_FRONTEND_ORIGIN,
    frontendOrigins: app.node.tryGetContext('frontendOrigins') ?? process.env.W2W_FRONTEND_ORIGINS,
    phase5Analysis: app.node.tryGetContext('phase5Analysis') ?? process.env.W2W_PHASE5_ANALYSIS,
    phase5InferenceEnabled:
      app.node.tryGetContext('phase5InferenceEnabled') ?? process.env.W2W_PHASE5_INFERENCE_ENABLED,
  }),
);
app.synth();
