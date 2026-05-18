import type { ChatRequest, ApiResponse, ConversationMessage, Message, StreamChunk, FileAttachment } from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE || "/AI";
const OSS_BASE = import.meta.env.VITE_OSS_BASE || "/oss";

export function stripAnswerTags(raw: string): string {
  let result = raw;
  result = result.replace(/<thinking>[\s\S]*?<\/thinking>/g, "");
  result = result.replace(/<answer>/g, "");
  result = result.replace(/<\/answer>/g, "");
  return result.trim();
}

export function parseThinkingAndAnswer(raw: string): { thinking: string; answer: string } {
  let thinking = "";
  let answer = raw;

  const thinkingMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim();
    answer = raw.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();
  }

  const answerMatch = answer.match(/<answer>([\s\S]*?)<\/answer>/);
  if (answerMatch) {
    const answerContent = answerMatch[1].trim();
    const outsideAnswer = answer.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim();
    if (outsideAnswer) {
      thinking = thinking ? `${thinking}\n\n${outsideAnswer}` : outsideAnswer;
    }
    answer = answerContent;
  }

  answer = answer.replace(/<answer>/g, "").replace(/<\/answer>/g, "").trim();

  return { thinking, answer };
}

export async function sendMessage(
  req: ChatRequest,
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const response = await fetch(`${API_BASE}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      onError(`HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.type === "thinking" || parsed.type === "text") {
            onChunk(parsed as StreamChunk);
          } else {
            onChunk({ type: "text", content: data });
          }
        } catch {
          onChunk({ type: "text", content: data });
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
  }
}

export async function fetchThreadHistory(threadId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId }),
  });

  const result: ApiResponse<ConversationMessage[]> = await response.json();

  if (result.code !== 200 || !result.data) {
    return [];
  }

  const messages: Message[] = [];
  let pendingThinking = "";
  let pendingToolContent = "";

  for (const msg of result.data) {
    const role = msg.role;

    if (role === "Human") {
      pendingThinking = "";
      pendingToolContent = "";
      messages.push({
        id: msg.id || `msg-${messages.length}-${Date.now()}`,
        role: "human",
        content: msg.content ?? "",
        group_id: msg.group_id,
        message_order: msg.message_order,
      });
      continue;
    }

    if (role === "AI_Thinking") {
      const { thinking, answer } = parseThinkingAndAnswer(msg.content ?? "");
      if (answer) {
        pendingThinking += (pendingThinking ? "\n\n" : "") + thinking;
      } else {
        pendingThinking += (pendingThinking ? "\n\n" : "") + (thinking || msg.content);
      }
      continue;
    }

    if (role === "Tool") {
      pendingToolContent += (pendingToolContent ? "\n\n" : "") + (msg.content ?? "");
      continue;
    }

    if (role === "AI") {
      const { thinking, answer } = parseThinkingAndAnswer(msg.content ?? "");
      const allThinking = [
        pendingThinking,
        thinking,
        pendingToolContent,
      ].filter(Boolean).join("\n\n");

      messages.push({
        id: msg.id || `msg-${messages.length}-${Date.now()}`,
        role: "ai",
        content: answer || (msg.content ?? ""),
        isStreaming: false,
        thinkingContent: allThinking || undefined,
        group_id: msg.group_id,
        message_order: msg.message_order,
      });
      pendingThinking = "";
      pendingToolContent = "";
      continue;
    }
  }

  return messages;
}

export async function deleteThread(threadId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE}/delete?thread_id=${encodeURIComponent(threadId)}`,
      { method: "GET" }
    );
    const result: ApiResponse = await response.json();
    return result.code === 200;
  } catch {
    return false;
  }
}

export async function uploadFile(file: File): Promise<FileAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  let response: Response;
  try {
    response = await fetch(`${OSS_BASE}/upload`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    throw new Error("无法连接到后端服务，请确认后端已启动");
  }
  if (!response.ok) {
    let msg = `上传失败 (${response.status})`;
    try {
      const errBody = await response.json();
      if (errBody.error) {
        const raw = errBody.error;
        const match = raw.match(/(AccessDenied|NoSuchBucket|InvalidAccessKeyId|SignatureDoesNotMatch|EntityTooLarge|RequestTimeout|Forbidden)/);
        msg = match ? `文件上传失败：${match[1]}` : raw.length > 80 ? raw.slice(0, 80) + "..." : raw;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return {
    id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    filename: result.filename,
    contentType: result.contentType,
    size: result.size,
    accessUrl: result.accessUrl,
    key: result.key,
  };
}
