import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'session';

export async function setSession(token: string, days = 7) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: days * 86400,
    // host-only cookie: never shared between store / admin subdomains
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
