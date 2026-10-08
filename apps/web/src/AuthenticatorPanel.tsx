import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
export default function AuthenticatorPanel() {
  return <Authenticator loginMechanisms={['email']} signUpAttributes={['email']} />;
}
