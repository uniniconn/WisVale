import express from "express";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size for base64 images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // OCR Proxy Route
  app.post("/api/ocr", async (req, res) => {
    const { base64Image } = req.body;
    const apiKey = process.env.OCR_SPACE_API_KEY;

    if (!base64Image) {
      return res.status(400).json({ error: "Missing base64Image" });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "Server configuration error: Missing OCR API Key" });
    }

    console.log("Starting OCR request to OCR.space...");

    try {
      const formData = new FormData();
      formData.append("apikey", apiKey);
      // Ensure base64Image has the correct prefix if it doesn't already
      const formattedBase64 = base64Image.startsWith('data:') 
        ? base64Image 
        : `data:image/jpeg;base64,${base64Image}`;
        
      formData.append("base64Image", formattedBase64);
      formData.append("language", "chs");
      formData.append("isOverlayRequired", "false");
      formData.append("detectOrientation", "true");
      formData.append("scale", "true");
      formData.append("OCREngine", "2");

      console.log("Sending request to OCR.space...");
      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
      });

      console.log("Received response from OCR.space:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OCR.space API error:", response.status, errorText);
        return res.status(response.status).json({ error: "OCR.space API returned an error" });
      }

      const result = await response.json();
      console.log("OCR.space request successful");
      res.json(result);
    } catch (error) {
      console.error("Server-side OCR Exception:", error);
      res.status(500).json({ error: "Internal server error during OCR" });
    }
  });

  // AI Processing Route (DeepSeek)
  app.post("/api/ai/process-question", async (req, res) => {
    const { ocrText, explanationText } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY; // DeepSeek API Key

    if (!ocrText) {
      return res.status(400).json({ error: "Missing ocrText" });
    }

    if (!apiKey) {
      console.error("Missing DEEPSEEK_API_KEY in environment");
      return res.status(500).json({ error: "Server configuration error: Missing DeepSeek API Key" });
    }

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat", 
          messages: [
            {
              role: "system",
              content: `你是一个生物题目整理专家。
任务：
1. 清理OCR文本：删去多余内容（如页码、干扰字符、原有题号如"1、"）。
2. 整理格式：
题面
A.
B.
C.
...
3. 提取知识点：生成1-3个相关的知识点。如果有解析，请结合解析提取。
要求：
- 知识点必须【高度精炼】，字数控制在20字以内。
- 知识点必须【紧扣题目】，针对该题考查的具体细节，而非宽泛的概念。
- 标题要具体，内容要直接。
输出格式必须为JSON：
{
  "cleanedContent": "整理后的题目内容",
  "cleanedExplanation": "整理后的解析内容（如果有）",
  "knowledgePoints": [
    {"title": "具体知识点名称", "content": "核心考点/答案"}
  ]
}`
            },
            {
              role: "user",
              content: `题目OCR文本：\n${ocrText}\n\n${explanationText ? `解析OCR文本：\n${explanationText}` : ''}`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("DeepSeek API error:", response.status, errorText);
        return res.status(response.status).json({ error: "DeepSeek API returned an error" });
      }

      const result = await response.json();
      let content = result.choices[0].message.content;
      // Remove markdown code block formatting if present
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const aiResponse = JSON.parse(content);
      res.json({ ...aiResponse, usage: result.usage });
    } catch (error) {
      console.error("Server-side AI Exception:", error);
      res.status(500).json({ error: "Internal server error during AI processing" });
    }
  });

  // Single Knowledge Point Generation Route
  app.post("/api/ai/generate-single-kp", async (req, res) => {
    const { content, existingKps } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY; // DeepSeek API Key

    if (!content) {
      return res.status(400).json({ error: "Missing content" });
    }

    if (!apiKey) {
      console.error("Missing DEEPSEEK_API_KEY in environment");
      return res.status(500).json({ error: "Server configuration error: Missing DeepSeek API Key" });
    }

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat", 
          messages: [
            {
              role: "system",
              content: `你是一个生物题目整理专家。
任务：根据题目内容，生成【一个】新的、不重复的知识点。
要求：
- 知识点必须【高度精炼】，字数控制在20字以内。
- 知识点必须【紧扣题目】，针对该题考查的具体细节。
- 必须不同于以下已有的知识点：${(existingKps || []).map((k: any) => k.title).join(', ') || '无'}
输出格式必须为JSON：
{
  "knowledgePoint": {"title": "具体知识点名称", "content": "核心考点/答案"}
}`
            },
            {
              role: "user",
              content: content
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "AI API error" });
      }

      const result = await response.json();
      let aiContent = result.choices[0].message.content;
      console.log("Raw AI Content:", aiContent);
      // Remove markdown code block formatting if present
      aiContent = aiContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      console.log("Cleaned AI Content:", aiContent);
      const aiResponse = JSON.parse(aiContent);
      res.json({ ...aiResponse, usage: result.usage });
    } catch (error) {
      console.error("Single KP Generation Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Knowledge Summary Route
  app.post("/api/ai/knowledge-summary", async (req, res) => {
    const { kps } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY; // DeepSeek API Key

    if (!kps) {
      return res.status(400).json({ error: "Missing kps" });
    }

    if (!apiKey) {
      console.error("Missing DEEPSEEK_API_KEY in environment");
      return res.status(500).json({ error: "Server configuration error: Missing DeepSeek API Key" });
    }

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-reasoner", 
          messages: [
            {
              role: "system",
              content: `你是一个生物学习分析专家。
任务：基于用户的知识点数据，生成一份【极简】的深度学习分析报告。
要求：
1. 语言必须精简、一针见血，拒绝废话。
2. 简要概括知识分布。
3. 直接指出薄弱环节和强项。
4. 提供1-2条最核心的学习建议。
5. 使用Markdown格式输出，多用列表，少用长段落。`
            },
            {
              role: "user",
              content: `以下是我的知识点数据：\n${JSON.stringify(kps)}`
            }
          ]
        }),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "AI API error" });
      }

      const result = await response.json();
      res.json({ summary: result.choices[0].message.content, usage: result.usage });
    } catch (error) {
      console.error("Knowledge Summary Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Evaluate Answer Route
  app.post("/api/ai/evaluate-answer", async (req, res) => {
    const { title, content, answer } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY; // DeepSeek API Key

    if (!title || !content || !answer) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!apiKey) {
      console.error("Missing DEEPSEEK_API_KEY in environment");
      return res.status(500).json({ error: "Server configuration error: Missing DeepSeek API Key" });
    }

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat", 
          messages: [
            {
              role: "system",
              content: `你是一个严格的生物学知识点批改助手。
请根据以下标准知识点答案，批改用户的回答。

【标准知识点】：${title}
【标准答案】：${content}

【用户回答】：${answer}

【评判标准】：
1. 关键知识点符合标准答案且完整，无遗漏关键内容（无需字词完全一样，意思对即可）。
2. 逻辑清晰准确。
3. 无任何与知识点无关内容。

请返回JSON格式的结果：
{
  "pass": boolean, // 是否通过
  "reason": string // 如果通过，给出改进点；如果不通过，给出不通过原因和错误内容指出
}`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "AI API error" });
      }

      const result = await response.json();
      let aiContent = result.choices[0].message.content;
      aiContent = aiContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const aiResponse = JSON.parse(aiContent);
      res.json({ ...aiResponse, usage: result.usage });
    } catch (error) {
      console.error("Evaluate Answer Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
