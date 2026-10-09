import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import {
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  signOut,
  updateUserAttributes,
} from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage, Hub } from 'aws-amplify/utils';
import { Navigate, useLocation } from 'react-router-dom';
import type { FrontendConfig } from './config';

export type AuthState = {
  status: 'loading' | 'anonymous' | 'authenticated';
  userId?: string;
  profile?: UserProfile;
  signOut: () => Promise<void>;
  updateFirstName: (firstName: string) => Promise<void>;
};
export type UserProfile = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  emailVerified?: boolean;
};

export function profileFromAttributes(attributes: {
  given_name?: string;
  family_name?: string;
  name?: string;
  email?: string;
  email_verified?: string;
}): UserProfile {
  const firstName = attributes.given_name?.trim() || undefined;
  const lastName = attributes.family_name?.trim() || undefined;
  const fullName =
    attributes.name?.trim() || [firstName, lastName].filter(Boolean).join(' ') || undefined;
  const email = attributes.email?.trim() || undefined;
  const emailVerified =
    attributes.email_verified === 'true'
      ? true
      : attributes.email_verified === 'false'
        ? false
        : undefined;
  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(fullName ? { fullName } : {}),
    ...(email ? { email } : {}),
    ...(emailVerified !== undefined ? { emailVerified } : {}),
  };
}

export function profileInitial(profile?: UserProfile): string {
  const name = profile?.firstName || profile?.fullName?.trim().split(/\s+/)[0] || profile?.email;
  return name?.trim().charAt(0).toLocaleUpperCase() || 'A';
}

export const AuthContext = createContext<AuthState>({
  status: 'loading',
  signOut: async () => {},
  updateFirstName: async () => {},
});
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
  const [state, setState] = useState<Omit<AuthState, 'signOut' | 'updateFirstName'>>({
    status: configured ? 'loading' : 'anonymous',
  });
  useEffect(() => {
    if (!configured) return;
    let active = true;
    let restoreSequence = 0;
    const restore = async () => {
      const sequence = ++restoreSequence;
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();
        if (!active || sequence !== restoreSequence) return;
        if (!session.tokens?.accessToken) {
          setState({ status: 'anonymous' });
          return;
        }
        setState({ status: 'authenticated', userId: user.userId });
        try {
          const attributes = await fetchUserAttributes();
          if (active && sequence === restoreSequence)
            setState({
              status: 'authenticated',
              userId: user.userId,
              profile: profileFromAttributes(attributes),
            });
        } catch {
          // A profile-attribute lookup must not invalidate an authenticated session.
        }
      } catch {
        if (active && sequence === restoreSequence) setState({ status: 'anonymous' });
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
        updateFirstName: async (firstName) => {
          const normalized = firstName.trim().replace(/\s+/g, ' ');
          if (!normalized || normalized.length > 80)
            throw new Error('Enter a first name with 1 to 80 characters.');
          const result = await updateUserAttributes({
            userAttributes: { given_name: normalized },
          });
          if (!result.given_name?.isUpdated) throw new Error('Profile attribute was not updated.');
          setState((current) =>
            current.status === 'authenticated'
              ? {
                  ...current,
                  profile: {
                    ...current.profile,
                    firstName: normalized,
                    fullName: [normalized, current.profile?.lastName].filter(Boolean).join(' '),
                  },
                }
              : current,
          );
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
