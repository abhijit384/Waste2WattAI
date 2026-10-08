import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import type { InfrastructureConfig } from '../config.ts';

export interface DataStackProps extends StackProps {
  config: InfrastructureConfig;
}

export class Waste2WattDataStack extends Stack {
  readonly imageBucket: s3.Bucket;
  readonly wasteScans: dynamodb.Table;
  readonly dailyMetrics: dynamodb.Table;
  readonly recoveryFactors: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const { config } = props;
    this.imageBucket = new s3.Bucket(this, 'WasteImages', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      cors: [
        {
          allowedOrigins: config.frontendOrigins,
          allowedMethods: [s3.HttpMethods.POST],
          allowedHeaders: ['content-type', 'x-amz-*'],
          exposedHeaders: ['ETag'],
          maxAge: 300,
        },
      ],
      lifecycleRules: [
        {
          id: 'UploadRetention',
          prefix: 'private/',
          enabled: true,
          abortIncompleteMultipartUploadAfter: Duration.days(1),
          noncurrentVersionExpiration: Duration.days(config.stage === 'prod' ? 30 : 7),
          ...(config.stage === 'prod' ? {} : { expiration: Duration.days(30) }),
        },
      ],
    });
    // Native CloudFormation avoids the CDK notification custom-resource Lambda and its IAM.
    const bucketResource = this.imageBucket.node.defaultChild as s3.CfnBucket;
    bucketResource.notificationConfiguration = {
      eventBridgeConfiguration: { eventBridgeEnabled: true },
    };

    const table = (name: string, partitionKey: string, sortKey: string) =>
      new dynamodb.Table(this, name, {
        tableName: `waste2watt-${config.stage}-${name}`,
        partitionKey: { name: partitionKey, type: dynamodb.AttributeType.STRING },
        sortKey: { name: sortKey, type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: dynamodb.TableEncryption.AWS_MANAGED,
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
        deletionProtection: true,
        removalPolicy: RemovalPolicy.RETAIN,
      });
    this.wasteScans = table('WasteScans', 'ownerId', 'scanId');
    this.wasteScans.addGlobalSecondaryIndex({
      indexName: 'OwnerCreatedAt',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAtScanId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    this.dailyMetrics = table('DailyMetrics', 'ownerId', 'metricDate');
    this.recoveryFactors = table('RecoveryFactors', 'materialType', 'factorVersion');

    new CfnOutput(this, 'ImageBucketName', { value: this.imageBucket.bucketName });
    new CfnOutput(this, 'WasteScansTableName', { value: this.wasteScans.tableName });
    new CfnOutput(this, 'DailyMetricsTableName', { value: this.dailyMetrics.tableName });
    new CfnOutput(this, 'RecoveryFactorsTableName', { value: this.recoveryFactors.tableName });
  }
}
