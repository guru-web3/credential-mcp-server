import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

export interface RequestContext {
  auth?: AuthInfo;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function runWithAuth<T>(auth: AuthInfo, fn: () => T): T {
  return asyncLocalStorage.run({ auth }, fn);
}

export function getRequestAuth(): AuthInfo | undefined {
  return asyncLocalStorage.getStore()?.auth;
}
