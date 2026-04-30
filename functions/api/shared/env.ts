// functions/api/shared/env.ts

export type Runtime = 'cloudflare' | 'oci' | 'local';

export function getRuntime(env: any): Runtime {
  if (env.DB && env.request) return 'cloudflare'; // Rough detection for Cloudflare Pages context
  if (process.env.OCI_RESOURCE_PRINCIPAL_VERSION || process.env.OCI_MYSQL_HOST) return 'oci';
  return 'local';
}

export interface AppEnv {
  runtime: Runtime;
  // Cloudflare bindings
  DB?: any;
  BUCKET?: any;
  // OCI / General Env
  MYSQL_HOST?: string;
  MYSQL_USER?: string;
  MYSQL_PASSWORD?: string;
  MYSQL_DATABASE?: string;
  OCI_STORAGE_NAMESPACE?: string;
  OCI_STORAGE_BUCKET?: string;
  OCI_STORAGE_REGION?: string;
  OCI_ACCESS_KEY_ID?: string;
  OCI_SECRET_ACCESS_KEY?: string;
  OCI_ENDPOINT?: string;
}
