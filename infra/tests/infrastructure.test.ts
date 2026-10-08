import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { createStacks } from '../src/application.ts';
import { resolveConfig } from '../src/config.ts';
import { projectRoot } from '../src/paths.ts';
import { apiRoutes } from '../src/stacks/api-stack.ts';
import { Waste2WattDataStack } from '../src/stacks/data-stack.ts';
import { Waste2WattAuthStack } from '../src/stacks/auth-stack.ts';
import { pipelineStages } from '../src/stacks/pipeline-stack.ts';
import { handler as pipelineHandler } from '../src/lambda/pipeline-handler.ts';

// CDK normally chooses a temporary directory for tests. Keep all artifacts in this repo.
const app = new App({
  outdir: join(projectRoot, 'infra/cdk.test.out'),
  context: {
    '@aws-cdk/core:defaultCrossStackReferences': 'strong',
  },
});
const stacks = createStacks(app, resolveConfig());
app.synth();
const data = Template.fromStack(stacks.data);
const auth = Template.fromStack(stacks.auth);
const api = Template.fromStack(stacks.api);
const pipeline = Template.fromStack(stacks.pipeline);
const observability = Template.fromStack(stacks.observability);

test('Phase 5 is opt-in, disabled for inference and scopes the model grant without replacing data', () => {
  assert.equal(resolveConfig().phase5Analysis, false);
  assert.equal(resolveConfig().phase5InferenceEnabled, false);
  assert.throws(() => resolveConfig({ phase5InferenceEnabled: true }));
  const reviewApp = new App({ outdir: join(projectRoot, 'infra/cdk.test.out/phase5') });
  const reviewed = createStacks(reviewApp, resolveConfig({ phase5Analysis: true }));
  reviewApp.synth();
  const proposed = Template.fromStack(reviewed.pipeline);
  proposed.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'python3.12',
    Architectures: ['x86_64'],
    Timeout: 60,
    Environment: {
      Variables: Match.objectLike({
        AI_INFERENCE_ENABLED: 'false',
        AI_DAILY_LIMIT: '50',
        AI_USER_DAILY_LIMIT: '5',
      }),
    },
  });
  proposed.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs22.x',
    Environment: { Variables: Match.objectLike({ AI_INFERENCE_ENABLED: 'false' }) },
  });
  proposed.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: 'bedrock:InvokeModel',
          Resource: 'arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0',
          Effect: 'Allow',
        }),
      ]),
    },
  });
  proposed.resourceCountIs('AWS::SQS::Queue', 1);
  proposed.resourceCountIs('AWS::Logs::MetricFilter', 2);
  proposed.resourceCountIs('AWS::CloudWatch::Alarm', 1);
  assert.deepEqual(Template.fromStack(reviewed.data).toJSON().Resources, data.toJSON().Resources);
  const definition = JSON.stringify(proposed.findResources('AWS::StepFunctions::StateMachine'));
  assert.ok(definition.includes('AnalyzeWithBedrock'));
  assert.ok(!definition.includes('ClassifyWaste'));
  assert.ok(definition.includes('Phase5MarkAnalysisUnavailable'));
  assert.ok(definition.includes('AnalysisUnavailableAsExpected'));
});

test('development fits low Lambda quotas without reserved or provisioned concurrency', () => {
  for (const template of [api, pipeline]) {
    for (const resource of Object.values(template.findResources('AWS::Lambda::Function'))) {
      assert.equal(resource.Properties.ReservedConcurrentExecutions, undefined);
    }
    assert.equal(Object.keys(template.findResources('AWS::Lambda::Alias')).length, 0);
  }
});

test('private encrypted image bucket has exact-origin CORS, lifecycle and EventBridge', () => {
  data.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
      ],
    },
    OwnershipControls: { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] },
    NotificationConfiguration: { EventBridgeConfiguration: { EventBridgeEnabled: true } },
    CorsConfiguration: {
      CorsRules: [
        Match.objectLike({ AllowedOrigins: ['http://localhost:5173'], AllowedMethods: ['POST'] }),
      ],
    },
    LifecycleConfiguration: {
      Rules: [Match.objectLike({ Prefix: 'private/', ExpirationInDays: 30 })],
    },
  });
  data.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain' });
  data.hasResourceProperties('AWS::S3::BucketPolicy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Deny',
          Condition: { Bool: { 'aws:SecureTransport': 'false' } },
        }),
      ]),
    },
  });
  data.resourceCountIs('AWS::Lambda::Function', 0);
});

test('all three DynamoDB tables have scoped keys, on-demand billing, PITR and protection', () => {
  data.resourceCountIs('AWS::DynamoDB::Table', 3);
  for (const [name, pk, sk] of [
    ['WasteScans', 'ownerId', 'scanId'],
    ['DailyMetrics', 'ownerId', 'metricDate'],
    ['RecoveryFactors', 'materialType', 'factorVersion'],
  ]) {
    data.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: `waste2watt-dev-${name}`,
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: pk, KeyType: 'HASH' },
        { AttributeName: sk, KeyType: 'RANGE' },
      ],
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
      DeletionProtectionEnabled: true,
    });
  }
  data.hasResourceProperties('AWS::DynamoDB::Table', {
    GlobalSecondaryIndexes: [
      Match.objectLike({
        IndexName: 'OwnerCreatedAt',
        KeySchema: [
          { AttributeName: 'ownerId', KeyType: 'HASH' },
          { AttributeName: 'createdAtScanId', KeyType: 'RANGE' },
        ],
      }),
    ],
  });
});

test('Cognito web client uses code flow, no secret, and an API access scope', () => {
  const serverId = Object.keys(auth.findResources('AWS::Cognito::UserPoolResourceServer'))[0]!;
  auth.resourceCountIs('AWS::Cognito::UserPool', 1);
  auth.hasResourceProperties('AWS::Cognito::UserPool', {
    DeletionProtection: 'ACTIVE',
    UsernameAttributes: ['email'],
    Policies: { PasswordPolicy: Match.objectLike({ MinimumLength: 12 }) },
    VerificationMessageTemplate: Match.objectLike({
      DefaultEmailOption: 'CONFIRM_WITH_CODE',
      EmailSubject: 'Waste2Watt AI - your verification code',
      EmailMessage: Match.stringLikeRegexp('Waste2Watt AI.*\\{####\\}'),
    }),
  });
  auth.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    GenerateSecret: false,
    AllowedOAuthFlows: ['code'],
    EnableTokenRevocation: true,
    CallbackURLs: ['http://localhost:5173/auth/callback'],
    AllowedOAuthScopes: Match.arrayWith([{ 'Fn::Join': ['', [{ Ref: serverId }, '/access']] }]),
  });
  auth.resourceCountIs('AWS::Cognito::UserPoolResourceServer', 1);
  auth.hasResourceProperties('AWS::Cognito::UserPoolResourceServer', {
    Identifier: 'waste2watt-api',
    Scopes: [Match.objectLike({ ScopeName: 'access' })],
  });
});

test('HTTP API exists and all nine routes require the Cognito JWT access scope', () => {
  api.hasResourceProperties('AWS::ApiGatewayV2::Api', {
    ProtocolType: 'HTTP',
    CorsConfiguration: Match.objectLike({ AllowOrigins: ['http://localhost:5173'] }),
  });
  api.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
    AuthorizerType: 'JWT',
    IdentitySource: ['$request.header.Authorization'],
    JwtConfiguration: { Audience: Match.anyValue(), Issuer: Match.anyValue() },
  });
  api.resourceCountIs('AWS::ApiGatewayV2::Route', apiRoutes.length);
  for (const [method, path] of apiRoutes) {
    api.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: `${method} ${path}`,
      AuthorizationType: 'JWT',
      AuthorizationScopes: ['aws.cognito.signin.user.admin'],
      AuthorizerId: Match.anyValue(),
    });
  }
  api.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
    AccessLogSettings: Match.objectLike({ DestinationArn: Match.anyValue() }),
    DefaultRouteSettings: { ThrottlingBurstLimit: 20, ThrottlingRateLimit: 10 },
  });
  api.resourceCountIs('AWS::Lambda::Function', 1);
});

test('state machine retains all six tasks, catches failures, and cannot report stub success', () => {
  pipeline.hasResourceProperties('AWS::StepFunctions::StateMachine', {
    StateMachineType: 'STANDARD',
    LoggingConfiguration: Match.objectLike({ Level: 'ERROR', IncludeExecutionData: false }),
  });
  const resource = Object.values(pipeline.findResources('AWS::StepFunctions::StateMachine'))[0]!;
  const parts = resource.Properties.DefinitionString['Fn::Join'][1] as (string | object)[];
  const definition = JSON.parse(
    parts.map((part) => (typeof part === 'string' ? part : 'TOKEN')).join(''),
  );
  assert.equal(definition.StartAt, 'ValidateImage');
  for (const [index, name] of pipelineStages.entries()) {
    const state = definition.States[name];
    assert.equal(state.Type, 'Task');
    assert.equal(state.Next, pipelineStages[index + 1] ?? 'ImplementationRequired');
    assert.equal(state.Catch[0].Next, 'MarkScanFailed');
  }
  assert.equal(definition.States.RecordAnalysisFailure.Next, 'AnalysisFailed');
  assert.equal(definition.States.AnalysisFailed.Type, 'Fail');
  assert.equal(definition.States.ImplementationRequired.Next, 'MarkScanFailed');
  assert.equal(definition.States.MarkScanFailed.Next, 'RecordAnalysisFailure');
});

test('disabled inference routes to unavailable status before invoking analysis Lambda', () => {
  const reviewApp = new App({ outdir: join(projectRoot, 'infra/cdk.test.out/disabled-inference') });
  const reviewed = createStacks(reviewApp, resolveConfig({ phase5Analysis: true }));
  reviewApp.synth();
  const resource = Object.values(
    Template.fromStack(reviewed.pipeline).findResources('AWS::StepFunctions::StateMachine'),
  )[0]!;
  const parts = resource.Properties.DefinitionString['Fn::Join'][1] as (string | object)[];
  const definition = JSON.parse(
    parts.map((part) => (typeof part === 'string' ? part : 'TOKEN')).join(''),
  );
  assert.equal(definition.StartAt, 'Phase5UploadValidation');
  const entry = definition.States.Phase5UploadValidation;
  assert.equal(entry.Next, 'AnalysisInferenceEnabled');
  const gate = definition.States.AnalysisInferenceEnabled;
  assert.equal(gate.Type, 'Choice');
  assert.deepEqual(gate.Choices, [
    {
      Variable: '$.uploadValidation.analysisEnabled',
      BooleanEquals: false,
      Next: 'Phase5MarkAnalysisUnavailable',
    },
  ]);
  assert.equal(gate.Default, 'Phase5ValidateImage');
  assert.equal(definition.States.AnalysisUnavailableAsExpected.Type, 'Succeed');
});

test('EventBridge filters uploads from this bucket and targets Step Functions with DLQ', () => {
  pipeline.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: {
      source: ['aws.s3'],
      'detail-type': ['Object Created'],
      detail: {
        bucket: { name: [Match.anyValue()] },
        object: { key: [{ prefix: 'private/' }] },
      },
    },
    Targets: [
      Match.objectLike({
        Arn: Match.anyValue(),
        RoleArn: Match.anyValue(),
        DeadLetterConfig: { Arn: Match.anyValue() },
        RetryPolicy: { MaximumRetryAttempts: 2, MaximumEventAgeInSeconds: 86400 },
      }),
    ],
  });
  pipeline.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({ Action: 'states:StartExecution', Resource: Match.anyValue() }),
      ]),
    },
  });
  pipeline.hasResourceProperties('AWS::SQS::QueuePolicy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Allow',
          Action: 'sqs:SendMessage',
          Principal: { Service: 'events.amazonaws.com' },
          Condition: Match.anyValue(),
        }),
      ]),
    },
  });
});

test('failure queue is retained, encrypted, and TLS protected', () => {
  pipeline.resourceCountIs('AWS::SQS::Queue', 1);
  pipeline.hasResourceProperties('AWS::SQS::Queue', {
    SqsManagedSseEnabled: true,
    MessageRetentionPeriod: 1209600,
  });
  pipeline.hasResource('AWS::SQS::Queue', { DeletionPolicy: 'Retain' });
  pipeline.hasResourceProperties('AWS::SQS::QueuePolicy', {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Effect: 'Deny',
          Condition: { Bool: { 'aws:SecureTransport': 'false' } },
        }),
      ]),
    },
  });
});

test('execution-level terminal failures also reach the failure queue', () => {
  pipeline.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: {
      source: ['aws.states'],
      'detail-type': ['Step Functions Execution Status Change'],
      detail: { stateMachineArn: [Match.anyValue()], status: ['FAILED', 'TIMED_OUT', 'ABORTED'] },
    },
    Targets: Match.arrayWith([
      Match.objectLike({
        Arn: Match.anyValue(),
        RetryPolicy: { MaximumRetryAttempts: 2, MaximumEventAgeInSeconds: 86400 },
      }),
    ]),
  });
});

test('logs and alarms exist; runtime roles access only scan resources and never AI', () => {
  api.resourceCountIs('AWS::Logs::LogGroup', 2);
  pipeline.resourceCountIs('AWS::Logs::LogGroup', 3);
  observability.resourceCountIs('AWS::CloudWatch::Alarm', 7);
  for (const template of [api, pipeline]) {
    for (const policy of Object.values(template.findResources('AWS::IAM::Policy'))) {
      for (const statement of policy.Properties.PolicyDocument.Statement) {
        const actions: string[] = Array.isArray(statement.Action)
          ? statement.Action
          : [statement.Action];
        assert.ok(actions.every((action) => !/^(bedrock|sagemaker):/.test(action)));
        const resources = JSON.stringify(statement.Resource);
        assert.ok(!resources.includes('DailyMetrics') && !resources.includes('RecoveryFactors'));
        for (const action of actions) {
          if (action.startsWith('dynamodb:')) {
            assert.ok(
              [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:Query',
              ].includes(action),
            );
            assert.ok(resources.includes('WasteScans'));
            if (action === 'dynamodb:Query') assert.ok(resources.includes('/index/OwnerCreatedAt'));
          }
          if (action.startsWith('s3:')) {
            assert.ok(['s3:PutObject', 's3:GetObject', 's3:GetObjectVersion'].includes(action));
            assert.ok(resources.includes('/private/*'));
            if (template === api) assert.equal(action, 's3:PutObject');
          }
        }
        assert.ok(actions.every((action) => !action.includes('*')));
        if (statement.Resource === '*') {
          const allowed = [
            'logs:CreateLogDelivery',
            'logs:GetLogDelivery',
            'logs:UpdateLogDelivery',
            'logs:DeleteLogDelivery',
            'logs:ListLogDeliveries',
            'logs:PutResourcePolicy',
            'logs:DescribeResourcePolicies',
            'logs:DescribeLogGroups',
          ];
          assert.ok(
            actions.every((action) => allowed.includes(action)),
            `Unexpected wildcard: ${actions}`,
          );
        }
      }
    }
  }
});

test('required outputs are defined across the five stacks', () => {
  for (const name of [
    'ImageBucketName',
    'WasteScansTableName',
    'DailyMetricsTableName',
    'RecoveryFactorsTableName',
  ])
    data.hasOutput(name, {});
  for (const name of ['UserPoolId', 'UserPoolClientId']) auth.hasOutput(name, {});
  api.hasOutput('ApiUrl', {});
  pipeline.hasOutput('StateMachineArn', {});
});

test('configuration defaults are local and unsafe origins are rejected', () => {
  assert.deepEqual(resolveConfig(), {
    stage: 'dev',
    region: 'us-east-1',
    phase5Analysis: false,
    phase5InferenceEnabled: false,
    frontendOrigin: 'http://localhost:5173',
    frontendOrigins: ['http://localhost:5173'],
  });
  for (const origin of [
    '*',
    'https://example.com/path',
    'https://example.com/',
    'http://example.com',
    'https://user:pass@example.com',
  ]) {
    assert.throws(() => resolveConfig({ frontendOrigin: origin }));
  }
  assert.throws(() => resolveConfig({ stage: 'prod' }));
  assert.throws(() => resolveConfig({ stage: 'unknown' }));
  assert.throws(() => resolveConfig({ region: 'invalid' }));
  assert.equal(
    resolveConfig({ stage: 'prod', frontendOrigin: 'https://example.com' }).stage,
    'prod',
  );
});

test('multiple exact origins reach API, S3 and Cognito without wildcard CORS', () => {
  const origins = ['http://localhost:5173', 'https://dev.example.com'];
  const config = resolveConfig({ frontendOrigins: JSON.stringify(origins) });
  const multipleApp = new App({ outdir: join(projectRoot, 'infra/cdk.test.out/multiple') });
  const multiple = createStacks(multipleApp, config);
  Template.fromStack(multiple.data).hasResourceProperties('AWS::S3::Bucket', {
    CorsConfiguration: { CorsRules: [Match.objectLike({ AllowedOrigins: origins })] },
  });
  Template.fromStack(multiple.api).hasResourceProperties('AWS::ApiGatewayV2::Api', {
    CorsConfiguration: Match.objectLike({ AllowOrigins: origins }),
  });
  Template.fromStack(multiple.auth).hasResourceProperties('AWS::Cognito::UserPoolClient', {
    CallbackURLs: origins.map((origin) => `${origin}/auth/callback`),
    LogoutURLs: origins.map((origin) => `${origin}/`),
  });
  for (const frontendOrigins of [
    [],
    ['*'],
    ['https://example.com/path'],
    [123],
    ['https://example.com'],
    Array(11).fill('http://localhost:5173'),
    'not-json',
  ]) {
    assert.throws(() => resolveConfig({ frontendOrigins }));
  }
});

test('deployment templates contain no expensive compute, AI resources or public grants', () => {
  for (const template of [data, auth, api, pipeline, observability]) {
    for (const resource of Object.values(template.toJSON().Resources)) {
      const typed = resource as { Type: string };
      assert.ok(!/^AWS::(EC2|RDS|EKS|SageMaker|Bedrock|ECS)::/.test(typed.Type), typed.Type);
    }
    for (const policy of Object.values(template.findResources('AWS::IAM::Policy'))) {
      for (const statement of policy.Properties.PolicyDocument.Statement) {
        const resources = Array.isArray(statement.Resource)
          ? statement.Resource
          : [statement.Resource];
        if (resources.includes('*')) {
          const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
          assert.ok(
            actions.every((action: string) =>
              [
                'logs:CreateLogDelivery',
                'logs:GetLogDelivery',
                'logs:UpdateLogDelivery',
                'logs:DeleteLogDelivery',
                'logs:ListLogDeliveries',
                'logs:PutResourcePolicy',
                'logs:DescribeResourcePolicies',
                'logs:DescribeLogGroups',
              ].includes(action),
            ),
          );
        }
      }
    }
    for (const type of ['AWS::S3::BucketPolicy', 'AWS::SQS::QueuePolicy']) {
      for (const policy of Object.values(template.findResources(type))) {
        for (const statement of policy.Properties.PolicyDocument.Statement) {
          if (statement.Effect === 'Allow') {
            assert.notEqual(statement.Principal, '*');
            assert.notEqual(statement.Principal?.AWS, '*');
          }
        }
      }
    }
  }
});

test('pipeline Lambda never fabricates successful results', async () => {
  await assert.rejects(pipelineHandler(), { name: 'Phase3NotImplemented' });
});

test('production preserves current uploads and requires TOTP MFA', () => {
  const prodApp = new App({ outdir: join(projectRoot, 'infra/cdk.test.out/prod') });
  const config = resolveConfig({ stage: 'prod', frontendOrigin: 'https://example.com' });
  const props = { config, env: { region: config.region }, terminationProtection: true };
  const prodData = new Waste2WattDataStack(prodApp, 'ProductionData', props);
  const prodAuth = new Waste2WattAuthStack(prodApp, 'ProductionAuth', props);
  Template.fromStack(prodData).hasResourceProperties('AWS::S3::Bucket', {
    LifecycleConfiguration: {
      Rules: [
        Match.objectLike({
          ExpirationInDays: Match.absent(),
          NoncurrentVersionExpiration: { NoncurrentDays: 30 },
        }),
      ],
    },
    CorsConfiguration: {
      CorsRules: [Match.objectLike({ AllowedOrigins: ['https://example.com'] })],
    },
  });
  Template.fromStack(prodAuth).hasResourceProperties('AWS::Cognito::UserPool', {
    MfaConfiguration: 'ON',
    EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
  });
  assert.equal(prodData.terminationProtection, true);
  assert.equal(prodAuth.terminationProtection, true);
});
