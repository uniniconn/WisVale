// Re-enabled server-side OCR via OCR.space for better accuracy as per latest user request
export async function performOCR(base64Image: string) {
  const response = await fetch("/api/ocr/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ base64Image }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error || errorData.details || "OCR Service error");
  }

  return (await response.json()) as any;
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
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error || errorData.details || errorData.exception || "AI Proxy error (process-question)");
  }

  return (await response.json()) as any;
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
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error || errorData.details || errorData.exception || "AI Proxy error (generate-single-kp)");
  }

  return (await response.json()) as any;
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
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error || errorData.details || errorData.exception || "AI Proxy error (knowledge-summary)");
  }

  return (await response.json()) as any;
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
    const errorData = (await response.json().catch(() => ({}))) as any;
    throw new Error(errorData.error || errorData.details || errorData.exception || "AI Proxy error (evaluate-answer)");
  }

  return (await response.json()) as any;
}
