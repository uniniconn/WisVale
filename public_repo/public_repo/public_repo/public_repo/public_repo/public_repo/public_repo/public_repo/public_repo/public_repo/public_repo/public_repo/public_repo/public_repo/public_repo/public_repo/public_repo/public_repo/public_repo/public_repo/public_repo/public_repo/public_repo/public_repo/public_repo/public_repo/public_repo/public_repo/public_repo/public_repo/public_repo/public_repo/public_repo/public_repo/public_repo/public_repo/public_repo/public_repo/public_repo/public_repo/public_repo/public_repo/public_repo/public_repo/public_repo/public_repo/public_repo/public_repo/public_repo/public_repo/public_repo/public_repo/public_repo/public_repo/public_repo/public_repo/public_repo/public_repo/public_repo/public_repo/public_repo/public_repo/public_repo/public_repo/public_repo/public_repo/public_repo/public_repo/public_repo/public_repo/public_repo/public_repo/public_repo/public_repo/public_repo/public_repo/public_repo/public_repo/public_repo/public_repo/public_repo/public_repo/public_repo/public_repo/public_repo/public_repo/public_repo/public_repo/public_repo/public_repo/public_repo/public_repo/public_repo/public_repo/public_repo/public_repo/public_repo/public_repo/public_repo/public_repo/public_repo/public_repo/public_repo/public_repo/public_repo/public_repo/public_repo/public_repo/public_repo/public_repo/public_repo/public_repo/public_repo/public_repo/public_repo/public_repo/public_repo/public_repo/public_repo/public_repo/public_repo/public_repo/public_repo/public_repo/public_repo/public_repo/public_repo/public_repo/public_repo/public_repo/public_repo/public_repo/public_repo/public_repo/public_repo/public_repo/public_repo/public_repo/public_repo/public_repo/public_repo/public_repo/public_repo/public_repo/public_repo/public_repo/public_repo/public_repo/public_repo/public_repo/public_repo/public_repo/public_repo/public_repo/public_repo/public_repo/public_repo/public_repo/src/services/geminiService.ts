import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractQuestionKeywords(base64Image: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1] || base64Image,
              },
            },
            {
              text: "请提取这张生物题目图片中的所有文字内容，包括题目、选项和解析（如果有）。直接返回提取出的纯文本，无需任何格式或JSON。",
            },
          ],
        },
      ],
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return "";
  }
}
