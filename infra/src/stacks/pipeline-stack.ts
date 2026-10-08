import { join } from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import type { Construct } from 'constructs';
import type { InfrastructureConfig } from '../config.ts';
import { projectRoot } from '../paths.ts';
import type { Waste2WattDataStack } from './data-stack.ts';

export const pipelineStages = [
  'ValidateImage',
  'ClassifyWaste',
  'VerifyWithBedrock',
  'RecoveryEngine',
  'PersistResult',
  'UpdateDailyMetrics',
] as const;

export interface PipelineStackProps extends StackProps {
  config: InfrastructureConfig;
  data: Waste2WattDataStack;
}

export class Waste2WattPipelineStack extends Stack {
  readonly stateMachine: sfn.StateMachine;
  readonly failureQueue: sqs.Queue;
  readonly placeholderFunction: NodejsFunction;
  readonly objectCreatedRule: events.Rule;
  readonly statusFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);
    this.failureQueue = new sqs.Queue(this, 'AnalysisFailures', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: Duration.days(14),
      visibilityTimeout: Duration.minutes(5),
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const lambdaLogs = new logs.LogGroup(this, 'PipelineLambdaLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.placeholderFunction = new NodejsFunction(this, 'PipelinePlaceholder', {
      entry: join(projectRoot, 'infra/src/lambda/pipeline-handler.ts'),
      depsLockFilePath: join(projectRoot, 'package-lock.json'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      ...(props.config.stage === 'dev' ? {} : { reservedConcurrentExecutions: 5 }),
      logGroup: lambdaLogs,
      environment: { STAGE: props.config.stage },
      bundling: { format: OutputFormat.CJS, target: 'node22', sourceMap: true },
    });
    const statusLogs = new logs.LogGroup(this, 'ScanStatusLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.statusFunction = new NodejsFunction(this, 'ScanStatus', {
      entry: join(projectRoot, 'services/api/src/status-handler.ts'),
      depsLockFilePath: join(projectRoot, 'package-lock.json'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'handler',
      timeout: Duration.seconds(20),
      memorySize: 256,
      ...(props.config.stage === 'dev' ? {} : { reservedConcurrentExecutions: 5 }),
      logGroup: statusLogs,
      environment: {
        WASTE_SCANS_TABLE: props.data.wasteScans.tableName,
        IMAGE_BUCKET: props.data.imageBucket.bucketName,
        ...(props.config.phase5Analysis
          ? {
              AI_INFERENCE_ENABLED: props.config.phase5InferenceEnabled ? 'true' : 'false',
            }
          : {}),
      },
      bundling: { format: OutputFormat.CJS, target: 'node22', sourceMap: true, bundleAwsSDK: true },
    });
    this.statusFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
        resources: [props.data.wasteScans.tableArn],
      }),
    );
    this.statusFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:GetObjectVersion'],
        resources: [props.data.imageBucket.arnForObjects('private/*')],
      }),
    );
    const failed = new sfn.Fail(this, 'AnalysisFailed', {
      error: 'AnalysisFailed',
      cause: 'Analysis failed; inspect the failure queue and execution history.',
    });
    const recordFailure = new tasks.SqsSendMessage(this, 'RecordAnalysisFailure', {
      queue: this.failureQueue,
      messageBody: sfn.TaskInput.fromObject({
        schemaVersion: '1',
        executionArn: sfn.JsonPath.stringAt('$$.Execution.Id'),
        failure: sfn.JsonPath.objectAt('$.failure'),
        event: sfn.JsonPath.objectAt('$'),
      }),
      resultPath: sfn.JsonPath.DISCARD,
    });
    recordFailure.addRetry({
      errors: ['States.TaskFailed'],
      interval: Duration.seconds(2),
      maxAttempts: 2,
    });
    recordFailure.addCatch(failed, { resultPath: '$.queueFailure' });
    recordFailure.next(failed);
    const markFailed = new tasks.LambdaInvoke(this, 'MarkScanFailed', {
      lambdaFunction: this.statusFunction,
      payloadResponseOnly: true,
      resultPath: sfn.JsonPath.DISCARD,
      payload: sfn.TaskInput.fromObject({
        action: 'failed',
        event: sfn.JsonPath.objectAt('$'),
        failure: sfn.JsonPath.objectAt('$.failure'),
      }),
    });
    markFailed.addCatch(recordFailure, { resultPath: '$.statusFailure' });
    markFailed.next(recordFailure);
    let chain: sfn.Chain;
    if (!props.config.phase5Analysis) {
      const stages = pipelineStages.map((name) => {
        const task = new tasks.LambdaInvoke(this, name, {
          lambdaFunction: name === 'ValidateImage' ? this.statusFunction : this.placeholderFunction,
          payload: sfn.TaskInput.fromObject({
            stage: name,
            action: 'uploaded',
            event: sfn.JsonPath.objectAt('$'),
          }),
          payloadResponseOnly: true,
          resultPath: `$.${name}`,
          retryOnServiceExceptions: false,
        });
        task.addRetry({
          errors: [
            'Lambda.ServiceException',
            'Lambda.AWSLambdaException',
            'Lambda.SdkClientException',
            'Lambda.TooManyRequestsException',
          ],
          interval: Duration.seconds(2),
          maxAttempts: 2,
          backoffRate: 2,
        });
        task.addCatch(markFailed, { resultPath: '$.failure' });
        return task;
      });
      chain = sfn.Chain.start(stages[0]!);
      for (const stage of stages.slice(1)) chain = chain.next(stage);
      // A final guard prevents placeholder code ever reporting successful analysis.
      const guard = new sfn.Pass(this, 'ImplementationRequired', {
        result: sfn.Result.fromObject({
          Error: 'Phase3NotImplemented',
          Cause: 'Replace placeholders and this guard before enabling analysis.',
        }),
        resultPath: '$.failure',
      });
      chain = chain.next(guard.next(markFailed));
    } else {
      const providerCredentials = new secretsmanager.Secret(this, 'ExternalAiProviderCredentials', {
        secretName: `waste2watt-${props.config.stage}-external-ai-providers`,
        description: 'Private API credentials for the approved free-only analysis fallbacks.',
        removalPolicy: RemovalPolicy.RETAIN,
      });
      const analysisLogs = new logs.LogGroup(this, 'AnalysisLogs', {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.RETAIN,
      });
      const analysisRole = new iam.Role(this, 'WasteIntelligenceRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });
      analysisLogs.grantWrite(analysisRole);
      const analysis = new lambda.Function(this, 'WasteIntelligence', {
        role: analysisRole,
        runtime: lambda.Runtime.PYTHON_3_12,
        architecture: lambda.Architecture.X86_64,
        handler: 'waste2watt_analysis.runtime.handler',
        code: lambda.Code.fromAsset(join(projectRoot, 'infra/.analysis-package')),
        timeout: Duration.seconds(60),
        memorySize: 512,
        logGroup: analysisLogs,
        environment: {
          AI_INFERENCE_ENABLED: props.config.phase5InferenceEnabled ? 'true' : 'false',
          AI_DAILY_LIMIT: '50',
          AI_USER_DAILY_LIMIT: '5',
          EXTERNAL_AI_ENABLED: props.config.phase5InferenceEnabled ? 'true' : 'false',
          EXTERNAL_AI_FREE_ONLY: 'true',
          EXTERNAL_AI_ALLOW_PAID: 'false',
          EXTERNAL_AI_PAID_USAGE_ALLOWED: 'false',
          EXTERNAL_AI_MAX_COST_USD: '0',
          FREE_MODELS_ONLY: 'true',
          BEDROCK_INFERENCE_ENABLED: 'false',
          BEDROCK_INFERENCE_BUDGET_APPROVED: 'false',
          BEDROCK_INFERENCE_MAX_COST_USD: '0',
          GEMINI_FREE_TIER_CONFIRMED: props.config.phase5InferenceEnabled ? 'true' : 'false',
          GEMINI_BILLING_ENABLED: 'false',
          GROQ_FREE_PLAN_CONFIRMED: props.config.phase5InferenceEnabled ? 'true' : 'false',
          GROQ_BILLING_ENABLED: 'false',
          OPENROUTER_FREE_ENDPOINT_CONFIRMED: props.config.phase5InferenceEnabled
            ? 'true'
            : 'false',
          OPENROUTER_BILLING_ENABLED: 'false',
          EXTERNAL_AI_SECRET_ARN: providerCredentials.secretArn,
          WASTE_SCANS_TABLE: props.data.wasteScans.tableName,
          DAILY_METRICS_TABLE: props.data.dailyMetrics.tableName,
          IMAGE_BUCKET: props.data.imageBucket.bucketName,
        },
      });
      analysis.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          resources: [providerCredentials.secretArn],
        }),
      );
      analysis.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['bedrock:InvokeModel'],
          resources: ['arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0'],
        }),
      );
      analysis.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['s3:GetObject', 's3:GetObjectVersion'],
          resources: [props.data.imageBucket.arnForObjects('private/*')],
        }),
      );
      analysis.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
          resources: [props.data.wasteScans.tableArn, props.data.dailyMetrics.tableArn],
        }),
      );
      new cloudwatch.Alarm(this, 'AnalysisErrors', {
        metric: analysis.metricErrors({ period: Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription:
          'Phase 5 analysis Lambda failures; inspect sanitized logs. No automatic replay.',
      });
      for (const field of ['inputTokens', 'outputTokens'])
        new logs.MetricFilter(this, `Analysis${field}`, {
          logGroup: analysisLogs,
          filterPattern: logs.FilterPattern.stringValue('$.event', '=', 'BedrockUsage'),
          metricNamespace: 'Waste2Watt/Analysis',
          metricName: field,
          metricValue: `$.${field}`,
        });
      const steps = [
        'ValidateImage',
        'AnalyzeWithBedrock',
        'ValidateClassification',
        'EvaluateRecoveryPathways',
        'CalculateEnvironmentalImpact',
        'PersistAnalysis',
        'UpdateScanStatus',
      ];
      const jobs = steps.map((action) => {
        const job = new tasks.LambdaInvoke(this, `Phase5${action}`, {
          lambdaFunction: analysis,
          payloadResponseOnly: true,
          payload: sfn.TaskInput.fromObject({
            action,
            event: sfn.JsonPath.objectAt('$'),
            executionArn: sfn.JsonPath.stringAt('$$.Execution.Id'),
          }),
          resultPath: '$.phase5',
          retryOnServiceExceptions: false,
        });
        // Never retry inference automatically: a timeout may already have incurred a charge.
        if (action !== 'AnalyzeWithBedrock')
          job.addRetry({
            errors: ['Lambda.ServiceException', 'Lambda.TooManyRequestsException'],
            maxAttempts: 2,
            interval: Duration.seconds(2),
          });
        job.addCatch(markFailed, { resultPath: '$.failure' });
        return job;
      });
      let rest = sfn.Chain.start(jobs[1]!);
      for (const job of jobs.slice(2)) rest = rest.next(job);
      const skip = new sfn.Succeed(this, 'DuplicateAnalysisIgnored');
      const unavailable = new tasks.LambdaInvoke(this, 'Phase5MarkAnalysisUnavailable', {
        lambdaFunction: this.statusFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          action: 'unavailable',
          event: sfn.JsonPath.objectAt('$'),
        }),
        resultPath: '$.phase5',
      });
      unavailable.addCatch(markFailed, { resultPath: '$.failure' });
      const controlledUnavailable = sfn.Chain.start(unavailable).next(
        new sfn.Succeed(this, 'AnalysisUnavailableAsExpected'),
      );
      const route = new sfn.Choice(this, 'AnalysisClaimAcquired')
        .when(
          sfn.Condition.and(
            sfn.Condition.isPresent('$.phase5.ignored'),
            sfn.Condition.booleanEquals('$.phase5.ignored', true),
          ),
          skip,
        )
        .otherwise(rest);
      const inferenceGate = new sfn.Choice(this, 'AnalysisInferenceEnabled').when(
        sfn.Condition.booleanEquals('$.uploadValidation.analysisEnabled', false),
        controlledUnavailable,
      );
      // Existing validation/authenticated scan status transition remains authoritative.
      const entry = new tasks.LambdaInvoke(this, 'Phase5UploadValidation', {
        lambdaFunction: this.statusFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          action: 'uploaded',
          event: sfn.JsonPath.objectAt('$'),
        }),
        resultPath: '$.uploadValidation',
      });
      entry.addCatch(markFailed, { resultPath: '$.failure' });
      chain = sfn.Chain.start(entry).next(inferenceGate.otherwise(jobs[0]!.next(route)));
    }
    const executionLogs = new logs.LogGroup(this, 'StateMachineLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.stateMachine = new sfn.StateMachine(this, 'ImageAnalysis', {
      definitionBody: sfn.DefinitionBody.fromChainable(chain),
      stateMachineType: sfn.StateMachineType.STANDARD,
      timeout: Duration.minutes(5),
      logs: { destination: executionLogs, level: sfn.LogLevel.ERROR, includeExecutionData: false },
    });
    this.objectCreatedRule = new events.Rule(this, 'ImageCreated', {
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: { name: [props.data.imageBucket.bucketName] },
          object: { key: [{ prefix: 'private/' }] },
        },
      },
    });
    this.objectCreatedRule.addTarget(
      new targets.SfnStateMachine(this.stateMachine, {
        deadLetterQueue: this.failureQueue,
        maxEventAge: Duration.hours(24),
        retryAttempts: 2,
      }),
    );
    // Execution-level failures cannot always be caught (timeouts, aborts, runtime errors).
    // Caught failures also produce this status event; consumers must deduplicate by executionArn.
    const terminalFailureRule = new events.Rule(this, 'AnalysisTerminalFailure', {
      eventPattern: {
        source: ['aws.states'],
        detailType: ['Step Functions Execution Status Change'],
        detail: {
          stateMachineArn: [this.stateMachine.stateMachineArn],
          status: ['FAILED', 'TIMED_OUT', 'ABORTED'],
        },
      },
    });
    terminalFailureRule.addTarget(
      new targets.SqsQueue(this.failureQueue, {
        maxEventAge: Duration.hours(24),
        retryAttempts: 2,
      }),
    );
    terminalFailureRule.addTarget(
      new targets.LambdaFunction(this.statusFunction, {
        retryAttempts: 2,
        maxEventAge: Duration.hours(24),
        deadLetterQueue: this.failureQueue,
      }),
    );
    new CfnOutput(this, 'StateMachineArn', { value: this.stateMachine.stateMachineArn });
    new CfnOutput(this, 'AnalysisFailureQueueUrl', { value: this.failureQueue.queueUrl });
  }
}
