import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { getCurrentUser, fetchAuthSession, signOut } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage, Hub } from 'aws-amplify/utils';
import { Navigate, useLocation } from 'react-router-dom';
import type { FrontendConfig } from './config';

export type AuthState = {
  status: 'loading' | 'anonymous' | 'authenticated';
  userId?: string;
  signOut: () => Promise<void>;
};
export const AuthContext = createContext<AuthState>({ status: 'loading', signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);
export function configureAuth(config: FrontendConfig) {
  if (!config.configured) return;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: config.VITE_COGNITO_USER_POOL_CLIENT_ID,
        loginWith: { email: true },
      },
    },
  });
  cognitoUserPoolsTokenProvider.setKeyValueStorage(
    new CookieStorage({
      path: '/',
      expires: 7,
      sameSite: 'strict',
      secure: window.location.protocol === 'https:',
    }),
  );
}
export function AuthProvider({
  configured,
  children,
}: {
  configured: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<Omit<AuthState, 'signOut'>>({
    status: configured ? 'loading' : 'anonymous',
  });
  useEffect(() => {
    if (!configured) return;
    let active = true;
    const restore = async () => {
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();
        if (active)
          setState(
            session.tokens?.accessToken
              ? { status: 'authenticated', userId: user.userId }
              : { status: 'anonymous' },
          );
      } catch {
        if (active) setState({ status: 'anonymous' });
      }
    };
    void restore();
    const stop = Hub.listen('auth', () => {
      void restore();
    });
    return () => {
      active = false;
      stop();
    };
  }, [configured]);
  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut: async () => {
          await signOut();
          setState({ status: 'anonymous' });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === 'loading')
    return (
      <div className="session-loading" role="status">
        Restoring your secure session…
      </div>
    );
  if (auth.status !== 'authenticated')
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return children;
}
