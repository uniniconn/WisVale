// functions/api/shared/storage.ts

export interface StorageDriver {
  upload(fileName: string, body: Buffer | Uint8Array, contentType: string): Promise<string>;
}

export function createStorageDriver(env: any): StorageDriver {
  // Cloudflare R2
  if (env.BUCKET && typeof env.BUCKET.put === 'function') {
    return {
      async upload(fileName: string, body: any, contentType: string) {
        await env.BUCKET.put(fileName, body, {
          httpMetadata: { contentType }
        });
        return `/api/storage/raw/${fileName}`;
      }
    };
  }

  // Fallback or D1 Blobs if R2 not configured
  return {
    async upload(fileName: string, body: any, contentType: string) {
       // Ideally we'd store in D1 blobs if R2 is missing
       return `data:${contentType};base64,...`; // Placeholder or implementation detail
    }
  };
}
