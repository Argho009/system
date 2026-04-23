import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';
import {
  signSession,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  type SessionUser,
} from './auth-helpers';
import { applyApiRoutes } from './api-routes';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  FILES?: R2Bucket;
}

export type AppCtx = {
  Bindings: Env;
  Variables: {
    user?: SessionUser;
  };
};

const app = new Hono<AppCtx>();

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

app.use('*', async (c, next) => {
  if (!c.env.JWT_SECRET || c.env.JWT_SECRET.length < 16) {
    return c.json({ error: 'Server misconfiguration: set JWT_SECRET (min 16 chars)' }, 500);
  }
  await next();
});

applyApiRoutes(app);

export default app;
