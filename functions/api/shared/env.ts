// functions/api/shared/env.ts

export type Runtime = 'cloudflare' | 'local';

export function getRuntime(env: any): Runtime {
  if (env.DB) return 'cloudflare';
  return 'local';
}

export interface AppEnv {
  runtime: Runtime;
  DB?: any;
  BUCKET?: any;
}
