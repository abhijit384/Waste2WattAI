import { join } from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as http from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { InfrastructureConfig } from '../config.ts';
import { projectRoot } from '../paths.ts';
import { apiScope, type Waste2WattAuthStack } from './auth-stack.ts';
import type { Waste2WattDataStack } from './data-stack.ts';

export const apiRoutes = [
  [http.HttpMethod.POST, '/scans'],
  [http.HttpMethod.POST, '/scans/{scanId}/upload-url'],
  [http.HttpMethod.GET, '/scans'],
  [http.HttpMethod.GET, '/scans/{scanId}'],
  [http.HttpMethod.GET, '/dashboard'],
  [http.HttpMethod.GET, '/dashboard/hotspots'],
  [http.HttpMethod.POST, '/simulate'],
  [http.HttpMethod.POST, '/agent/chat'],
  [http.HttpMethod.GET, '/recovery-factors'],
] as const;

export interface ApiStackProps extends StackProps {
  config: InfrastructureConfig;
  auth: Waste2WattAuthStack;
  data: Waste2WattDataStack;
}

export class Waste2WattApiStack extends Stack {
  readonly httpApi: http.HttpApi;
  readonly placeholderFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const logGroup = new logs.LogGroup(this, 'ApiLambdaLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.placeholderFunction = new NodejsFunction(this, 'ApiPlaceholder', {
      entry: join(projectRoot, 'services/api/src/handler.ts'),
      depsLockFilePath: join(projectRoot, 'package-lock.json'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'handler',
      memorySize: 256,
      timeout: Duration.seconds(10),
      reservedConcurrentExecutions: 10,
      logGroup,
      environment: {
        STAGE: props.config.stage,
        WASTE_SCANS_TABLE: props.data.wasteScans.tableName,
        IMAGE_BUCKET: props.data.imageBucket.bucketName,
        COGNITO_CLIENT_ID: props.auth.userPoolClient.userPoolClientId,
      },
      bundling: { format: OutputFormat.CJS, target: 'node22', sourceMap: true, bundleAwsSDK: true },
    });
    this.placeholderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'],
        resources: [props.data.wasteScans.tableArn],
      }),
    );
    this.placeholderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [`${props.data.wasteScans.tableArn}/index/OwnerCreatedAt`],
      }),
    );
    this.placeholderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [props.data.imageBucket.arnForObjects('private/*')],
      }),
    );
    const authorizer = new HttpJwtAuthorizer(
      'CognitoJwt',
      props.auth.userPool.userPoolProviderUrl,
      {
        jwtAudience: [props.auth.userPoolClient.userPoolClientId],
      },
    );
    this.httpApi = new http.HttpApi(this, 'HttpApi', {
      defaultAuthorizer: authorizer,
      defaultAuthorizationScopes: [apiScope],
      corsPreflight: {
        allowOrigins: [props.config.frontendOrigin],
        allowMethods: [
          http.CorsHttpMethod.GET,
          http.CorsHttpMethod.POST,
          http.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['authorization', 'content-type'],
        maxAge: Duration.minutes(5),
      },
    });
    const integration = new HttpLambdaIntegration(
      'PlaceholderIntegration',
      this.placeholderFunction,
    );
    for (const [method, path] of apiRoutes) {
      this.httpApi.addRoutes({
        path,
        methods: [method],
        integration,
        authorizer,
        authorizationScopes: [apiScope],
      });
    }
    const accessLogs = new logs.LogGroup(this, 'HttpAccessLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const stage = this.httpApi.defaultStage!.node.defaultChild as http.CfnStage;
    stage.defaultRouteSettings = { throttlingBurstLimit: 20, throttlingRateLimit: 10 };
    stage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        routeKey: '$context.routeKey',
        status: '$context.status',
        responseLength: '$context.responseLength',
        integrationError: '$context.integrationErrorMessage',
      }),
    };
    new CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint });
  }
}
