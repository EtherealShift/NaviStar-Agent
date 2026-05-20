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
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'human' || normalized === 'user') return 'user';
  if (normalized === 'ai_thinking' || normalized === 'thinking') return 'thinking';
  if (normalized === 'ai' || normalized === 'assistant') return 'assistant';
  return 'assistant';
}

export function normalizeMessages(messages = []) {
  const assistantByGroup = new Map();
  const orderedMessages = [];

  [...messages]
    .sort((a, b) => {
      const groupDiff = Number(a.group_id || 0) - Number(b.group_id || 0);
      if (groupDiff !== 0) return groupDiff;
      return Number(a.msg_order || 0) - Number(b.msg_order || 0);
    })
    .forEach((item) => {
      const role = normalizeRole(item.role);
      const groupId = item.group_id ?? 0;
      const threadId = item.thread_id || 'history';
      const content = item.content || '';

      if (role === 'user') {
        orderedMessages.push({
          id: String(item.id || `${threadId}_${groupId}_${item.msg_order || messageId('history')}`),
          threadId: item.thread_id,
          groupId,
          role,
          sourceRole: item.role,
          content,
          msgOrder: item.msg_order,
          createdAt: item.created_at,
          metaData: item.meta_data || {},
        });
        return;
      }

      const assistantKey = `${threadId}_${groupId}_assistant`;
      let assistantMessage = assistantByGroup.get(assistantKey);
      if (!assistantMessage) {
        assistantMessage = {
          id: assistantKey,
          threadId: item.thread_id,
          groupId,
          role: 'assistant',
          sourceRole: 'AI',
          content: '',
          thinking: '',
          msgOrder: item.msg_order,
          createdAt: item.created_at,
          metaData: {},
        };
        assistantByGroup.set(assistantKey, assistantMessage);
        orderedMessages.push(assistantMessage);
      }

      if (role === 'thinking') {
        assistantMessage.thinking = `${assistantMessage.thinking || ''}${content}`;
      } else {
        assistantMessage.content = `${assistantMessage.content || ''}${content}`;
      }
      assistantMessage.createdAt = assistantMessage.createdAt || item.created_at;
      assistantMessage.metaData = {
        ...assistantMessage.metaData,
        ...(item.meta_data || {}),
      };
    });

  return orderedMessages;
}

export function titleFromMessage(content) {
  const title = content.trim().replace(/\s+/g, ' ').slice(0, 28);
  return title || '新对话';
}
