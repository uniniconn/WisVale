import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image, apiKey } = req.body;

  if (!base64Image || !apiKey) {
    return res.status(400).json({ error: 'Missing base64Image or apiKey' });
  }

  try {
    const formData = new FormData();
    formData.append("apikey", apiKey);
    
    // 确保有正确的前缀
    const formattedBase64 = base64Image.startsWith('data:') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;
      
    formData.append("base64Image", formattedBase64);
    formData.append("language", "chs");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: "OCR.space API error", details: errorText });
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Vercel OCR Error:", error);
    return res.status(500).json({ error: "Internal server error during OCR" });
  }
}
