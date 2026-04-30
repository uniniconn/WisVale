// functions/api/ai/[[process]].ts
import { createDriver } from "../shared/db";

export const onRequestPost: PagesFunction<{ DB: any, DEEPSEEK_API_KEY?: string }> = async (context) => {
  const { request, env, params } = context;
  const pathParts = params.process as string[] || [];
  const action = pathParts[0];
  
  let apiKey = env.DEEPSEEK_API_KEY;

  // Try to get from D1 settings
  if (env.DB) {
    try {
      const db = createDriver(env);
      const settings = await db.first('SELECT value FROM settings WHERE id = ?', ['keys']) as any;
      if (settings) {
        const keys = JSON.parse(settings.value);
        if (keys.deepseek) apiKey = keys.deepseek;
      }
    } catch (e) {}
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing AI API key" }), { status: 500 });
  }

  const body: any = await request.json();

  let messages: any[] = [];
  let model = "deepseek-chat";
  let response_format: any = { type: "json_object" };

  if (action === 'process-question') {
    messages = [
      {
        role: "system",
        content: `你是一个资深的生物整理专家。任务：清理OCR噪音、修复名词错误、格式化题面与选项、提取知识点。JSON: { "cleanedContent": "...", "cleanedExplanation": "...", "knowledgePoints": [{ "title": "...", "content": "..." }] }`
      },
      {
        role: "user",
        content: `题目OCR：\n${body.ocrText}\n\n解析OCR：\n${body.explanationText || '无'}`
      }
    ];
  } else if (action === 'generate-single-kp') {
    messages = [
      {
        role: "system",
        content: `你是一个生物专家。生成一个独特考点。严禁重复：${(body.existingKps || []).map((k: any) => k.title).join(', ')}。JSON: { "knowledgePoint": { "title": "...", "content": "..." } }`
      },
      { role: "user", content: body.content }
    ];
  } else if (action === 'knowledge-summary') {
    model = "deepseek-reasoner";
    messages = [
      { role: "system", content: "你是一个生物特级教师。生成学习分析报告（Markdown格式）。请直接输出分析内容，不要有多余的前缀或后缀。" },
      { role: "user", content: JSON.stringify(body.kps) }
    ];
    response_format = undefined; // DeepSeek Reasoner might not support json_object yet or we want raw markdown
  } else if (action === 'evaluate-answer') {
    messages = [
      {
        role: "system",
        content: `你是一个生物阅卷组长。对:${body.title}\n标答:${body.content}\n用户回答:${body.answer} 进行批改。JSON: { "pass": bool, "reason": "..." }`
      }
    ];
  } else {
    return new Response(JSON.stringify({ error: "Invalid AI action" }), { status: 400 });
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${apiKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model,
        messages,
        response_format,
        stream: false
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: "AI API error", details: err }), { status: response.status });
    }

    const result = await response.json() as any;
    
    if (action === 'knowledge-summary') {
      return new Response(JSON.stringify({ 
        summary: result.choices[0].message.content, 
        usage: result.usage 
      }));
    }

    let aiContent = result.choices[0].message.content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return new Response(JSON.stringify({ ...JSON.parse(aiContent), usage: result.usage }));
  } catch (error: any) {
    return new Response(JSON.stringify({ error: "AI process failed", details: error.message }), { status: 500 });
  }
};
