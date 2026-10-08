import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';
import type { Waste2WattApiStack } from './api-stack.ts';
import type { Waste2WattPipelineStack } from './pipeline-stack.ts';

export interface ObservabilityStackProps extends StackProps {
  api: Waste2WattApiStack;
  pipeline: Waste2WattPipelineStack;
}

export class Waste2WattObservabilityStack extends Stack {
  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);
    const alarm = (id: string, metric: cloudwatch.IMetric, description: string) =>
      new cloudwatch.Alarm(this, id, {
        metric,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: description,
      });
    const period = Duration.minutes(5);
    alarm(
      'ScanStatusErrors',
      props.pipeline.statusFunction.metricErrors({ period, statistic: 'Sum' }),
      'Scan status persistence failures',
    );
    alarm(
      'ApiLambdaErrors',
      props.api.placeholderFunction.metricErrors({ period, statistic: 'Sum' }),
      'API Lambda invocation errors',
    );
    alarm(
      'PipelineLambdaErrors',
      props.pipeline.placeholderFunction.metricErrors({ period, statistic: 'Sum' }),
      'Pipeline Lambda errors; analysis stubs intentionally fail',
    );
    alarm(
      'AnalysisExecutionFailures',
      props.pipeline.stateMachine.metricFailed({ period, statistic: 'Sum' }),
      'Analysis execution failures; expected for unimplemented stages',
    );
    alarm(
      'AnalysisExecutionTimeouts',
      props.pipeline.stateMachine.metricTimedOut({ period, statistic: 'Sum' }),
      'Analysis execution timed out; timeouts cannot enter a state-level catch',
    );
    alarm(
      'FailureQueueBacklog',
      props.pipeline.failureQueue.metricApproximateNumberOfMessagesVisible({
        period,
        statistic: 'Maximum',
      }),
      'Analysis or EventBridge delivery failures awaiting inspection',
    );
    alarm(
      'EventDeliveryFailures',
      new cloudwatch.Metric({
        namespace: 'AWS/Events',
        metricName: 'FailedInvocations',
        dimensionsMap: { RuleName: props.pipeline.objectCreatedRule.ruleName },
        period,
        statistic: 'Sum',
      }),
      'EventBridge target delivery failures',
    );
  }
}
