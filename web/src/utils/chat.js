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

export function normalizeFile(file) {
  if (!file || typeof file !== 'object') return null;
  const fileId = file.file_id || file.fileId || file.id;
  const name = file.name || file.filename || '生成文件';
  const downloadUrl = file.download_url || file.downloadUrl || file.url;
  if (!fileId || !downloadUrl) return null;
  return {
    fileId,
    name,
    downloadUrl,
    size: Number(file.size || 0),
    contentType: file.content_type || file.contentType || '',
    extension: file.extension || '',
    createdAt: file.created_at || file.createdAt || '',
  };
}

export function toAttachmentPayload(file) {
  const normalized = normalizeFile(file);
  if (!normalized) return null;
  return {
    file_id: normalized.fileId,
    name: normalized.name,
    filename: normalized.name,
    content_type: normalized.contentType,
    download_url: normalized.downloadUrl,
    access_url: normalized.downloadUrl,
    extension: normalized.extension,
    size: normalized.size,
  };
}

export function mergeFiles(existing = [], incoming = []) {
  const files = new Map();
  existing.map(normalizeFile).filter(Boolean).forEach((file) => files.set(file.fileId, file));
  incoming.map(normalizeFile).filter(Boolean).forEach((file) => files.set(file.fileId, file));
  return [...files.values()];
}

export function normalizeFiles(metaData = {}) {
  const rawFiles = Array.isArray(metaData.files) ? metaData.files : [];
  const singleFile = metaData.file ? [metaData.file] : [];
  return mergeFiles([], [...rawFiles, ...singleFile]);
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
          files: normalizeFiles(item.meta_data || {}),
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
          files: [],
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
      assistantMessage.files = mergeFiles(assistantMessage.files, normalizeFiles(item.meta_data || {}));
    });

  return orderedMessages;
}

export function titleFromMessage(content) {
  const title = content.trim().replace(/\s+/g, ' ').slice(0, 28);
  return title || '新对话';
}
