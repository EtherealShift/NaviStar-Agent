export interface ConversationMessage {
  id: string;
  thread_id: string;
  message_order: number;
  role: "Human" | "AI" | "AI_Thinking" | "system" | "Tool";
  content: string;
  create_time: string;
  meta_data: Record<string, unknown>;
  group_id: number;
}

export interface Message {
  id: string;
  role: "human" | "ai";
  content: string;
  isStreaming?: boolean;
  thinkingContent?: string;
  group_id?: number;
  message_order?: number;
}

export interface Conversation {
  threadId: string;
  title: string;
  lastMessage?: string;
  updatedAt: number;
  isNetwork?: boolean;
  isThinking?: boolean;
}

export type ChatMode = "fast" | "thinking";

export interface ChatRequest {
  message: string;
  model_name?: string;
  is_network?: boolean;
  is_thinking?: boolean;
  thread_id: string;
  system_prompt?: string;
  attachments?: RequestAttachment[];
}

export interface RequestAttachment {
  filename: string;
  content_type: string;
  access_url: string;
  size: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  msg: string;
}

export interface StreamChunk {
  type: "thinking" | "text";
  content: string;
}

export interface FileAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  accessUrl: string;
  key: string;
}
