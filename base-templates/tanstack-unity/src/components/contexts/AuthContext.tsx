import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import type { AuthenticateInput } from '~/server/api/endpoints/User.ts';
import type { IDefaultProps } from '~/interfaces/IComponentProps.ts';
import type { IUser } from '~/interfaces/api/IUser.ts';
import { authRequest, logoutRequest } from '~/server/api/endpoints/User.ts';
import { Route } from '~/routes/__root.tsx';
import { useApi } from '~/hooks/useApi.ts';
import { getRandomId } from '~/utils/Helper.ts';

interface IAuthContext {
  user?: IUser;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function AuthProvider({ children }: IDefaultProps) {
  const { language } = Route.useRouteContext();
  const callAuth = useApi(authRequest);
  const callLogout = useServerFn(logoutRequest); // Does not actually call API, just clears session on server
  const [user, setUser] = useState<IUser | undefined>(undefined);
  const hasAuthenticated = useRef(false);

  useEffect(() => {
    if (hasAuthenticated.current) {
      return;
    }
    hasAuthenticated.current = true;

    // Build payload
    const data: AuthenticateInput = {
      language,
      userId: getRandomId(),
    };

    // Authenticate and populate context
    callAuth({ data })
      .then((result) => setUser(result))
      .catch((e) => {
        console.error('Auth error:', e);
        callLogout()
          .then(() => document.location.reload())
          .catch((e2) => console.error('Logout error', e2));
      });
  }, []);


  const ctxValue = useMemo((): IAuthContext => ({ user }), [user]);
  return (
    <AuthContext value={ctxValue}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
