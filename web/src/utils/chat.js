export function createThreadId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `web_${Date.now()}_${random}`;
}

export function createEmptyConversation() {
  const now = new Date().toISOString();
  return {
    thread_id: createThreadId(),
    title: '新对话',
    created_at: now,
    updated_at: now,
    isLocal: true,
  };
}

export function messageId(prefix = 'msg') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeRole(role) {
  if (role === 'human' || role === 'user') return 'user';
  return 'assistant';
}

export function normalizeMessages(messages = []) {
  return messages.map((item) => ({
    id: String(item.id || messageId('history')),
    role: normalizeRole(item.role),
    content: item.content || '',
    createdAt: item.created_at,
  }));
}

export function titleFromMessage(content) {
  const title = content.trim().replace(/\s+/g, ' ').slice(0, 28);
  return title || '新对话';
}
