import { getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

const COOKIE = 'session';

export type SessionUser = {
  sub: string;
  role: string;
  college_id: string;
};

export async function signSession(secret: string, u: SessionUser, maxAgeSec = 60 * 60 * 24 * 7) {
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ role: u.role, college_id: u.college_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(u.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(key);
}

export async function verifySession(secret: string, token: string): Promise<SessionUser | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    const sub = payload.sub;
    const role = payload.role as string | undefined;
    const college_id = payload.college_id as string | undefined;
    if (!sub || !role || !college_id) return null;
    return { sub, role, college_id };
  } catch {
    return null;
  }
}

export function getBearerOrCookie(c: Context<{ Bindings: { JWT_SECRET: string } }>): string | undefined {
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return getCookie(c, COOKIE);
}

export async function getSessionUser(c: Context<{ Bindings: { JWT_SECRET: string } }>): Promise<SessionUser | null> {
  const t = getBearerOrCookie(c);
  if (!t) return null;
  return verifySession(c.env.JWT_SECRET, t);
}

export function setSessionCookie(c: Context, token: string, maxAge = 60 * 60 * 24 * 7) {
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: c.req.header('X-Forwarded-Proto') === 'https' || c.req.header('Host')?.includes('localhost') === false,
    maxAge,
  });
}

export function clearSessionCookie(c: Context) {
  setCookie(c, COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}
