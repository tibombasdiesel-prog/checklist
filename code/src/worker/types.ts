import type { Context } from 'hono';

export type Env = {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  JWT_SECRET: string;
};

export type Variables = {
  userId: number;
  isAdmin: boolean;
};

export type AppContext = Context<{ Bindings: Env; Variables: Variables }>;
