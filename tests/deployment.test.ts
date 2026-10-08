import assert from 'node:assert/strict';
import test from 'node:test';
import { frontendEnvironment } from '../scripts/configure-frontend.mjs';

const outputs = {
  'Waste2WattAuthStack-dev': {
    UserPoolId: 'us-east-1_Test123',
    UserPoolClientId: 'testclient1234567890',
    LoginDomainUrl: 'https://ignored.example.com',
  },
  'Waste2WattApiStack-dev': { ApiUrl: 'https://test123.execute-api.us-east-1.amazonaws.com' },
  'Waste2WattPipelineStack-dev': { StateMachineArn: 'must-not-be-copied' },
};
test('frontend output conversion emits only four validated public values', () => {
  const env = frontendEnvironment(outputs);
  assert.equal(env.trim().split('\n').length, 4);
  assert.ok(env.includes('VITE_AWS_REGION=us-east-1\n'));
  assert.ok(!env.includes('must-not-be-copied') && !env.includes('ignored.example.com'));
});
test('frontend output conversion rejects missing, injected and unexpected-region endpoints', () => {
  assert.throws(() => frontendEnvironment({}));
  for (const ApiUrl of [
    'https://test123.execute-api.us-west-2.amazonaws.com',
    'https://example.com',
    'https://test123.execute-api.us-east-1.amazonaws.com\nVITE_SECRET=bad',
    'https://test123.execute-api.us-east-1.amazonaws.com/path',
  ]) {
    assert.throws(() => frontendEnvironment({ ...outputs, 'Waste2WattApiStack-dev': { ApiUrl } }));
  }
});
