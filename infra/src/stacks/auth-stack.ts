import { Aws, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';
import type { InfrastructureConfig } from '../config.ts';

// SRP sign-in issues this reserved Cognito access-token scope, not OAuth custom scopes.
export const apiScope = 'aws.cognito.signin.user.admin';

export interface AuthStackProps extends StackProps {
  config: InfrastructureConfig;
}

export class Waste2WattAuthStack extends Stack {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    this.userPool = new cognito.UserPool(this, 'WebUsers', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: props.config.stage === 'prod' ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const resourceServer = this.userPool.addResourceServer('ApiScopes', {
      identifier: 'waste2watt-api',
      scopes: [{ scopeName: 'access', scopeDescription: 'Access authenticated Waste2Watt routes' }],
    });
    this.userPoolClient = this.userPool.addClient('WebClient', {
      generateSecret: false,
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
          cognito.OAuthScope.resourceServer(resourceServer, {
            scopeName: 'access',
            scopeDescription: 'API access',
          }),
        ],
        callbackUrls: [`${props.config.frontendOrigin}/auth/callback`],
        logoutUrls: [`${props.config.frontendOrigin}/`],
      },
    });
    const domain = this.userPool.addDomain('LoginDomain', {
      cognitoDomain: {
        domainPrefix: `waste2watt-${props.config.stage}-${props.config.region}-${Aws.ACCOUNT_ID}`,
      },
    });
    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new CfnOutput(this, 'LoginDomainUrl', { value: domain.baseUrl() });
  }
}
