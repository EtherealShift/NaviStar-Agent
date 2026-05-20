const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || 'deepseek-v4-flash';

const endpoint = (path) => `${API_BASE_URL}${path}`;

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.msg || `HTTP ${response.status}`);
  }
  if (payload?.code && payload.code !== 200) {
    throw new Error(payload.msg || '请求失败');
  }
  return payload;
}

export async function fetchConversations() {
  const response = await fetch(endpoint('/ai/chat/query_list'));
  const payload = await parseJsonResponse(response);
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function fetchMessages(threadId) {
  const response = await fetch(endpoint('/ai/chat/query'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId }),
  });
  const payload = await parseJsonResponse(response);
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function deleteConversation(threadId) {
  const response = await fetch(endpoint('/ai/chat/del'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId }),
  });
  await parseJsonResponse(response);
}

export async function fetchModelList() {
  const response = await fetch(endpoint('/ai/chat/model_list'), {
    method: 'POST',
  });
  const payload = await parseJsonResponse(response);
  return payload.data && typeof payload.data === 'object' ? payload.data : {};
}

function normalizeStreamContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content !== 'object') return String(content);

  const knownValue =
    content.reasoning_content ||
    content.reasoning ||
    content.thinking ||
    content.content ||
    content.text;

  if (typeof knownValue === 'string') return knownValue;
  if (knownValue != null) return String(knownValue);
  return JSON.stringify(content, null, 2);
}

export async function streamChatMessage({
  threadId,
  message,
  modelName = DEFAULT_MODEL,
  thinking = false,
  temperature = 0.7,
  isNetwork = false,
  onText,
  onThinking,
  signal,
}) {
  const response = await fetch(endpoint('/ai/chat/send/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_name: modelName,
      thread_id: threadId,
      human_message: message,
      thinking,
      temperature,
      is_network: isNetwork,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`聊天接口请求失败：HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const handleEvent = (rawEvent) => {
    const lines = rawEvent.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') return data === '[DONE]';

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        onText?.(data);
        continue;
      }

      if (payload.error) throw new Error(payload.error);
      if (payload.type === 'thinking') onThinking?.(normalizeStreamContent(payload.content));
      if (payload.type === 'text') onText?.(normalizeStreamContent(payload.content));
    }
    return false;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\n\n/);
    buffer = events.pop() || '';

    for (const event of events) {
      if (handleEvent(event)) return;
    }
  }

  if (buffer.trim()) handleEvent(buffer);
}

export { DEFAULT_MODEL };
