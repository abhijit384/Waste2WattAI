import { join } from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
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
      reservedConcurrentExecutions: 5,
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
      reservedConcurrentExecutions: 5,
      logGroup: statusLogs,
      environment: {
        WASTE_SCANS_TABLE: props.data.wasteScans.tableName,
        IMAGE_BUCKET: props.data.imageBucket.bucketName,
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
    let chain = sfn.Chain.start(stages[0]!);
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
