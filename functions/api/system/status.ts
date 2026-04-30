// functions/api/system/status.ts
export const onRequestGet: PagesFunction<{ DEEPSEEK_API_KEY: string, OCR_SPACE_API_KEY: string }> = async (context) => {
  const { env } = context;
  
  return new Response(JSON.stringify({
    aiReady: !!env.DEEPSEEK_API_KEY,
    ocrReady: !!env.OCR_SPACE_API_KEY,
    nodeVersion: 'Cloudflare Workers (V8)',
    platform: 'Cloudflare',
    memoryUsage: 'N/A',
    uptime: 'N/A',
  }));
};
