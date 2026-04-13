export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR Proxy returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || "OCR processing failed");
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText || "";
    return parsedText.trim();
  } catch (error) {
    console.error("OCR Service Error:", error);
    throw error;
  }
}

export async function processQuestionWithAI(ocrText: string, explanationText?: string) {
  const response = await fetch("/api/ai/process-question", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ocrText, explanationText }),
  });

  if (!response.ok) {
    throw new Error("AI Proxy error");
  }

  return await response.json();
}

export async function generateSingleKpWithAI(content: string, existingKps: any[]) {
  const response = await fetch("/api/ai/generate-single-kp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content, existingKps }),
  });

  if (!response.ok) {
    throw new Error("AI Proxy error");
  }

  return await response.json();
}

export async function generateKnowledgeSummaryWithAI(kps: any[]) {
  const response = await fetch("/api/ai/knowledge-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ kps }),
  });

  if (!response.ok) {
    throw new Error("AI Proxy error");
  }

  return await response.json();
}

export async function evaluateAnswerWithAI(title: string, content: string, answer: string) {
  const response = await fetch("/api/ai/evaluate-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, content, answer }),
  });

  if (!response.ok) {
    throw new Error("AI Proxy error");
  }

  return await response.json();
}
