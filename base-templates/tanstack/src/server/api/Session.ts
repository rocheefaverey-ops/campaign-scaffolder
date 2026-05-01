import { useSession } from '@tanstack/react-start/server';
import { isLocal } from '~/utils/Helper.ts';

interface SessionData {
  accessToken?: string;
  userId?: string;
}

export function useAppSession() {
  if (!process.env.API_SESSION_SECRET) {
    throw new Error('API_SESSION_SECRET environment variable is not set');
  }

  return useSession<SessionData>({
    name: 'app-session',
    password: process.env.API_SESSION_SECRET,
    cookie: {
      secure: !isLocal(),
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 8 * 7 * 24 * 60 * 60, // TODO: adjust max age as needed
    },
  });
}
