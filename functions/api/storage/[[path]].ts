// functions/api/storage/[[path]].ts
import { createDriver } from "../shared/db";

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env, params } = context;
  const db = createDriver(env);
  const url = new URL(request.url);
  const pathParts = params.path as string[] || [];
  const actionOrId = pathParts[0];

  try {
    // GET /api/storage/raw/:id -> Retrieve blob
    if (request.method === 'GET' && actionOrId === 'raw') {
      const id = pathParts[1];
      if (!id) return new Response("Missing ID", { status: 400 });
      
      const blob = await db.first('SELECT * FROM blobs WHERE id = ?', [id]) as any;
      if (!blob) return new Response("File not found", { status: 404 });

      // Convert stored BLOB to Response
      // In D1, BLOBS are returned as ArrayBuffer/Uint8Array
      return new Response(blob.data, {
        headers: {
          'Content-Type': blob.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    // POST /api/storage/upload -> Store blob
    if (request.method === 'POST' && actionOrId === 'upload') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
      
      const id = crypto.randomUUID().split('-')[0];
      const name = file.name;
      const contentType = file.type;
      const data = await file.arrayBuffer(); // Get raw data
      const createdAt = new Date().toISOString();

      await db.run(
        'INSERT INTO blobs (id, name, contentType, data, createdAt) VALUES (?, ?, ?, ?, ?)',
        [id, name, contentType, data, createdAt]
      );

      return new Response(JSON.stringify({ url: `/api/storage/raw/${id}` }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
