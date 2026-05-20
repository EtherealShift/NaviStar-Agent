import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  deleteConversation,
  fetchConversations,
  fetchMessages,
  fetchModelList,
  fetchSettings,
  saveSettings,
  streamChatMessage,
} from './api/chatApi.js';
import ChatHeader from './components/ChatHeader.jsx';
import ChatInput from './components/ChatInput.jsx';
import MessageList from './components/MessageList.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import Sidebar from './components/Sidebar.jsx';
import {
  createEmptyConversation,
  messageId,
  normalizeMessages,
} from './utils/chat.js';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [messagesByThread, setMessagesByThread] = useState({});
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [responseMode, setResponseMode] = useState('fast');
  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [modelName, setModelName] = useState('deepseek-v4-flash');
  const [modelGroups, setModelGroups] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      try {
        const models = await fetchModelList();
        if (!mounted) return;
        setModelGroups(models);

        const allModels = Object.values(models).flat().filter(Boolean);
        if (allModels.length && !allModels.includes(modelName)) {
          setModelName(allModels[0]);
        }
      } catch (err) {
        if (mounted) setError(err.message || '模型列表加载失败');
      }
    }

    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  const loadConversationList = async ({ preserveActive = false } = {}) => {
    const remoteConversations = await fetchConversations();
    const initial = remoteConversations.length ? remoteConversations : [createEmptyConversation()];
    setConversations(initial);
    setActiveThreadId((current) => {
      if (preserveActive && current && initial.some((item) => item.thread_id === current)) {
        return current;
      }
      return initial[0].thread_id;
    });
    if (!remoteConversations.length) {
      setMessagesByThread({ [initial[0].thread_id]: [] });
    }
  };

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoadingConversations(true);
      setError('');
      try {
        await loadConversationList();
      } catch (err) {
        if (!mounted) return;
        const fallback = createEmptyConversation();
        setConversations([fallback]);
        setActiveThreadId(fallback.thread_id);
        setMessagesByThread({ [fallback.thread_id]: [] });
        setError(err.message || '历史会话加载失败');
      } finally {
        if (mounted) setLoadingConversations(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeThreadId || messagesByThread[activeThreadId]) return;

    let mounted = true;
    async function loadMessages() {
      setLoadingMessages(true);
      setError('');
      try {
        const remoteMessages = await fetchMessages(activeThreadId);
        if (mounted) {
          setMessagesByThread((prev) => ({
            ...prev,
            [activeThreadId]: normalizeMessages(remoteMessages),
          }));
        }
      } catch (err) {
        if (mounted) {
          setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [] }));
          setError(err.message || '聊天记录加载失败');
        }
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    }

    loadMessages();
    return () => {
      mounted = false;
    };
  }, [activeThreadId, messagesByThread]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.thread_id === activeThreadId),
    [activeThreadId, conversations],
  );
  const activeMessages = messagesByThread[activeThreadId] || [];
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => {
      const title = item.title || '';
      return title.toLowerCase().includes(query) || item.thread_id.toLowerCase().includes(query);
    });
  }, [conversations, searchQuery]);

  const createConversation = () => {
    const conversation = createEmptyConversation();
    setConversations((prev) => [conversation, ...prev]);
    setMessagesByThread((prev) => ({ ...prev, [conversation.thread_id]: [] }));
    setActiveThreadId(conversation.thread_id);
    setInput('');
    setError('');
  };

  const removeConversation = async (threadId) => {
    const target = conversations.find((item) => item.thread_id === threadId);
    setError('');

    try {
      if (threadId === activeThreadId && sending) {
        abortControllerRef.current?.abort();
      }
      if (!target?.isLocal) {
        await deleteConversation(threadId);
      }

      const remaining = conversations.filter((item) => item.thread_id !== threadId);
      const nextConversations = remaining.length ? remaining : [createEmptyConversation()];
      const nextActiveThreadId =
        threadId === activeThreadId ? nextConversations[0].thread_id : activeThreadId;

      setConversations(nextConversations);

      setMessagesByThread((prev) => {
        const next = { ...prev };
        delete next[threadId];
        if (!next[nextActiveThreadId]) next[nextActiveThreadId] = [];
        return next;
      });
      setActiveThreadId(nextActiveThreadId);
    } catch (err) {
      setError(err.message || '删除会话失败');
    }
  };

  const selectConversation = (threadId) => {
    setActiveThreadId(threadId);
    setInput('');
    setError('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  };

  const updateMessages = (threadId, updater) => {
    setMessagesByThread((prev) => ({
      ...prev,
      [threadId]: updater(prev[threadId] || []),
    }));
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !activeThreadId) return;

    const threadId = activeThreadId;
    const userMessage = {
      id: messageId('user'),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage = {
      id: messageId('assistant'),
      role: 'assistant',
      content: '',
      thinking: '',
      status: 'loading',
      createdAt: new Date().toISOString(),
    };

    setInput('');
    setError('');
    setSending(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    updateMessages(threadId, (prev) => [...prev, userMessage, assistantMessage]);

    try {
      await streamChatMessage({
        threadId,
        message: trimmed,
        modelName,
        thinking: responseMode === 'deep',
        isNetwork: networkEnabled,
        temperature,
        onText: (chunk) => {
          updateMessages(threadId, (prev) =>
            prev.map((item) =>
              item.id === assistantMessage.id
                ? { ...item, content: `${item.content}${chunk}`, status: 'streaming' }
                : item,
            ),
          );
        },
        onThinking: (chunk) => {
          if (!chunk) return;
          updateMessages(threadId, (prev) =>
            prev.map((item) =>
              item.id === assistantMessage.id
                ? { ...item, thinking: `${item.thinking || ''}${chunk}`, status: 'streaming' }
                : item,
            ),
          );
        },
        signal: controller.signal,
      });

      updateMessages(threadId, (prev) =>
        prev.map((item) =>
          item.id === assistantMessage.id ? { ...item, status: 'done' } : item,
        ),
      );
      await loadConversationList({ preserveActive: true });
    } catch (err) {
      if (err.name === 'AbortError') {
        updateMessages(threadId, (prev) =>
          prev.map((item) =>
            item.id === assistantMessage.id
              ? { ...item, status: 'done', content: item.content || '已停止生成。' }
              : item,
          ),
        );
        return;
      }
      const message = err.message || '消息发送失败';
      setError(message);
      updateMessages(threadId, (prev) =>
        prev.map((item) =>
          item.id === assistantMessage.id
            ? {
                ...item,
                status: 'error',
                content: item.content || `请求失败：${message}`,
              }
            : item,
        ),
      );
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    setError('');
    try {
      const nextSettings = await fetchSettings();
      setSettings(nextSettings);
    } catch (err) {
      setError(err.message || '设置加载失败');
    } finally {
      setLoadingSettings(false);
    }
  };

  const openSettings = () => {
    setSettingsOpen(true);
    loadSettings();
  };

  const updateSettings = async (nextSettings) => {
    setSavingSettings(true);
    setError('');
    try {
      const saved = await saveSettings(nextSettings);
      setSettings(saved);
      setSettingsOpen(false);
    } catch (err) {
      setError(err.message || '设置保存失败');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100 text-zinc-950 dark:bg-[#18181b] dark:text-zinc-100">
      {!sidebarCollapsed && (
        <button
          type="button"
          className="fixed inset-0 z-30 hidden cursor-default bg-black/50 backdrop-blur-sm max-md:block"
          aria-label="关闭侧边栏"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        conversations={filteredConversations}
        activeThreadId={activeThreadId}
        loading={loadingConversations}
        searchQuery={searchQuery}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onCreateConversation={createConversation}
        onDeleteConversation={removeConversation}
        onSelectConversation={selectConversation}
        onSearchChange={setSearchQuery}
        onOpenSettings={openSettings}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={activeConversation?.title}
          mode={responseMode}
          networkEnabled={networkEnabled}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(false)}
        />
        {error && (
          <div className="mx-auto mt-4 flex w-[calc(100%-2.5rem)] max-w-5xl items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="cursor-pointer rounded-md px-2 py-1 text-xs text-red-200 transition-colors hover:bg-red-400/10"
            >
              关闭
            </button>
          </div>
        )}
        {loadingMessages ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            正在加载聊天记录...
          </div>
        ) : (
          <MessageList messages={activeMessages} />
        )}
        <ChatInput
          value={input}
          disabled={!activeThreadId || loadingMessages}
          sending={sending}
          mode={responseMode}
          networkEnabled={networkEnabled}
          temperature={temperature}
          modelName={modelName}
          modelGroups={modelGroups}
          onChange={setInput}
          onClear={() => setInput('')}
          onSubmit={sendMessage}
          onStop={stopGeneration}
          onModeChange={setResponseMode}
          onNetworkChange={setNetworkEnabled}
          onTemperatureChange={setTemperature}
          onModelChange={setModelName}
        />
      </section>
      <SettingsPanel
        open={settingsOpen}
        loading={loadingSettings}
        saving={savingSettings}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onReload={loadSettings}
        onSave={updateSettings}
      />
    </div>
  );
}
