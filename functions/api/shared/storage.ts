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

  // OCI / S2 Compatible (Node.js)
  return {
    async upload(fileName: string, body: any, contentType: string) {
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
        const endpoint = env.STORAGE_ENDPOINT || process?.env?.STORAGE_ENDPOINT;
        
        const s3 = new S3Client({
            region: env.STORAGE_REGION || process?.env?.STORAGE_REGION || 'auto',
            endpoint: endpoint,
            credentials: {
                accessKeyId: env.STORAGE_ACCESS_KEY_ID || process?.env?.STORAGE_ACCESS_KEY_ID,
                secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY || process?.env?.STORAGE_SECRET_ACCESS_KEY,
            },
        });

        const bucket = env.STORAGE_BUCKET || process?.env?.STORAGE_BUCKET;

        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: fileName,
            Body: body,
            ContentType: contentType
        }));
        return `${env.STORAGE_PUBLIC_URL || process?.env?.STORAGE_PUBLIC_URL}/${fileName}`;
    }
  };
}
