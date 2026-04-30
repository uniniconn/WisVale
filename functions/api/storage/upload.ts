// functions/api/storage/upload.ts
import { createStorageDriver } from "../shared/storage";

export const onRequestPost: PagesFunction<any> = async (context) => {
  const { request, env } = context;
  const storage = createStorageDriver(env);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
    }

    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const url = await storage.upload(fileName, buffer, file.type);

    return new Response(JSON.stringify({ url }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
