// functions/api/ocr/parse.ts
import { createDriver } from "../shared/db";

export const onRequestPost: PagesFunction<{ DB: any, OCR_SPACE_API_KEY?: string }> = async (context) => {
  const { request, env } = context;
  const { base64Image } = await request.json() as { base64Image: string };
  
  let apiKey = env.OCR_SPACE_API_KEY;
  
  // Try to get from D1 settings if env is missing or for dynamic override
  if (env.DB) {
    try {
      const db = createDriver(env);
      const settings = await db.first('SELECT value FROM settings WHERE id = ?', ['keys']) as any;
      if (settings) {
        const keys = JSON.parse(settings.value);
        if (keys.ocr) apiKey = keys.ocr;
      }
    } catch (e) {}
  }

  if (!base64Image || !apiKey) {
    return new Response(JSON.stringify({ error: "Missing image or API key" }), { status: 400 });
  }

  try {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    
    // Cloudflare Workers fetch supports FormData
    const formData = new FormData();
    formData.append("apikey", apiKey);
    formData.append("base64Image", `data:image/jpeg;base64,${base64Data}`);
    formData.append("language", "chs");
    formData.append("OCREngine", "2");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "OCR API error" }), { status: response.status });
    }

    const result = await response.json() as any;
    if (result.IsErroredOnProcessing) {
      return new Response(JSON.stringify({ error: "OCR Error", details: result.ErrorMessage }), { status: 400 });
    }

    return new Response(JSON.stringify({ text: result.ParsedResults?.[0]?.ParsedText || "" }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Internal server error during OCR", details: error.message }), { status: 500 });
  }
};
