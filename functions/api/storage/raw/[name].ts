// functions/api/storage/raw/[name].ts
export const onRequestGet: PagesFunction<any> = async (context) => {
  const { env, params } = context;
  const name = params.name as string;

  if (!env.BUCKET) {
    return new Response("Storage not configured", { status: 500 });
  }

  const object = await env.BUCKET.get(name);

  if (!object) {
    return new Response("Object Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, {
    headers,
  });
};
