import type { Store } from '@mcstore/db';
import type { Request } from 'express';

export type AdminAuth = { typ: 'admin'; sub: string; sa: boolean };
export type PlayerAuth = { typ: 'player'; sub: string };
export type AuthPayload = AdminAuth | PlayerAuth;

export interface AppRequest extends Request {
  auth?: AuthPayload;
  store?: Store;
}
