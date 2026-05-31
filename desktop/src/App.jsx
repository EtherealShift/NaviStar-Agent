import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Atom,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Cable,
  Check,
  CheckCircle2,
  CheckIcon,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  Database,
  FilePlus2,
  GitBranch,
  Globe2,
  Keyboard,
  Link2,
  Loader2,
  MessageCircle,
  Minimize,
  Palette,
  PanelLeft,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Terminal as TerminalIcon,
  Trash2,
  UserCircle,
  Wrench,
  X,
} from "lucide-react";
import {
  createMcpServer,
  deleteConversation,
  deleteMcpServer,
  fetchConversations,
  fetchMessages,
  fetchMcpServers,
  fetchModelList,
  fetchSettings,
  saveModelKey,
  saveSettings,
  streamChatMessage,
  testMcpServer,
  toggleMcpServer,
  updateMcpServer,
} from "@/api/navistarApi";
import { Badge, Button, Input, Textarea } from "@/components/ui";
import { cn, formatTime, makeThreadId } from "@/lib/utils";

const modelAliases = {
  deepseek_v4_pro: "deepseek-v4-pro",
  deepseek_v4_flash: "deepseek-v4-flash",
  "xiaomi-v2.5-pro": "mimo-v2.5-pro",
  "xiaomi-v2.5": "mimo-v2.5",
};

const supplierAliases = {
  xiaomi: "mimo",
};

const fallbackModelCatalog = {
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  mimo: ["mimo-v2.5-pro", "mimo-v2.5"],
};

const reasoningOptions = ["low", "medium", "high", "xhigh"];
const sidebarResizeBounds = { min: 160, max: 280, hideInset: 10 };

const settingsSections = [
  { id: "general", label: "常规", icon: Settings },
  { id: "profile", label: "个人资料", icon: UserCircle },
  { id: "appearance", label: "外观", icon: Palette },
  { id: "model", label: "配置", icon: SlidersHorizontal },
  { id: "keyboard", label: "键盘快捷键", icon: Keyboard },
  { id: "mcp", label: "MCP 服务器", icon: Cable },
  { id: "connections", label: "连接", icon: Globe2 },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "environment", label: "环境", icon: TerminalIcon },
];

const mcpTransports = [
  { value: "http", label: "Streamable HTTP", hint: "http" },
  { value: "stdio", label: "stdio", hint: "本地命令" },
  { value: "sse", label: "SSE", hint: "旧传输" },
  { value: "websocket", label: "WebSocket", hint: "ws" },
];

const fallbackMcpServers = [
  {
    id: "bing-cn-mcp-server",
    name: "bing-cn-mcp-server",
    transport: "http",
    sourceType: "streamable_http",
    url: "https://mcp.api-inference.modelscope.net/5f71b785bb1a47/mcp",
    enabled: true,
    status: "pending",
    tools: 0,
    origin: "ModelScope",
  },
];

const emptyMcpDraft = {
  id: "",
  name: "",
  transport: "http",
  sourceType: "streamable_http",
  url: "",
  command: "",
  args: "",
  env: "",
  headers: "",
  enabled: true,
  description: "",
};

function formatModelLabel(model) {
  return (model || "")
    .replace(/^gpt-/i, "GPT ")
    .replace(/^deepseek-v4-/i, "DeepSeek V4 ")
    .replace(/^mimo-v2\.5-/i, "Mimo V2.5 ")
    .replace(/-/g, " ")
    .replace(/\bmini\b/i, "Mini")
    .replace(/\bpro\b/i, "Pro")
    .replace(/\bflash\b/i, "Flash");
}

function formatModelTrigger(model) {
  const value = model || "";
  const firstDash = value.indexOf("-");
  return firstDash >= 0 ? value.slice(firstDash + 1) : value;
}

function formatSupplierLabel(supplier) {
  const labels = {
    deepseek: "DeepSeek",
    mimo: "Mimo",
    openai: "OpenAI",
  };
  return labels[supplier] || supplier || "Model";
}

function sanitizeModelCatalog(data) {
  const source = data && typeof data === "object" ? data : {};
  const catalog = Object.entries(source).reduce((acc, [supplier, models]) => {
    if (!Array.isArray(models)) return acc;
    const key = supplierAliases[supplier] || supplier;
    const cleanModels = models
      .map((model) => modelAliases[model] || model)
      .filter((model) => typeof model === "string" && model.trim())
      .map((model) => model.trim());
    if (!cleanModels.length) return acc;
    acc[key] = [...new Set([...(acc[key] || []), ...cleanModels])];
    return acc;
  }, {});
  return Object.keys(catalog).length ? catalog : fallbackModelCatalog;
}

function getModelOptions(modelCatalog) {
  return Object.entries(sanitizeModelCatalog(modelCatalog)).flatMap(([supplier, models]) =>
    models.map((model) => ({ model, supplier })),
  );
}

function getFirstSupplier(modelCatalog) {
  return Object.keys(sanitizeModelCatalog(modelCatalog))[0] || "deepseek";
}

function findModelSupplier(model, modelCatalog) {
  const catalog = sanitizeModelCatalog(modelCatalog);
  return Object.entries(catalog).find(([, models]) => models.includes(model))?.[0];
}

function formatModelListStatus(modelCatalog) {
  const catalog = sanitizeModelCatalog(modelCatalog);
  const modelCount = Object.values(catalog).reduce((total, models) => total + models.length, 0);
  return `${Object.keys(catalog).length} 个供应商 / ${modelCount} 个模型`;
}

function normalizeSettings(settings = {}, modelCatalog = fallbackModelCatalog) {
  const catalog = sanitizeModelCatalog(modelCatalog);
  const firstSupplier = getFirstSupplier(catalog);
  const requestedSupplier = supplierAliases[settings.supplier] || settings.supplier;
  let supplier = catalog[requestedSupplier] ? requestedSupplier : firstSupplier;
  let modelName = modelAliases[settings.model_name] || settings.model_name || "";
  const modelSupplier = findModelSupplier(modelName, catalog);
  if (modelSupplier) supplier = modelSupplier;
  const fallbackModel = catalog[supplier]?.[0] || catalog[firstSupplier]?.[0] || "";
  if (!catalog[supplier]?.includes(modelName)) modelName = fallbackModel;
  return {
    supplier,
    model_name: modelName,
    temperature: Number(settings.temperature ?? 1),
    reasoning_effort: reasoningOptions.includes(settings.reasoning_effort) ? settings.reasoning_effort : "medium",
  };
}

function getSettingsSectionLabel(sectionId) {
  return settingsSections.find((section) => section.id === sectionId)?.label || "设置";
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMcpTransport(value, fallback = "http") {
  const kind = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  const mapping = {
    command: "stdio",
    local: "stdio",
    stdio: "stdio",
    http: "http",
    streamable_http: "http",
    streamablehttp: "http",
    sse: "sse",
    server_sent_events: "sse",
    websocket: "websocket",
    ws: "websocket",
  };
  return mapping[kind] || fallback;
}

function parseKeyValueBlock(value) {
  const text = String(value || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return text.split(/\r?\n/).reduce((acc, line) => {
      const clean = line.trim();
      if (!clean || clean.startsWith("#")) return acc;
      const index = clean.indexOf("=");
      if (index <= 0) return acc;
      acc[clean.slice(0, index).trim()] = clean.slice(index + 1).trim();
      return acc;
    }, {});
  }
}

function stringifyKeyValueBlock(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value)
    .map(([key, item]) => `${key}=${item}`)
    .join("\n");
}

function normalizeMcpServer(server = {}, index = 0) {
  const rawName = server.name || server.id || server.key || `mcp-server-${index + 1}`;
  const transport = normalizeMcpTransport(server.transport || server.type || (server.command ? "stdio" : "http"));
  return {
    ...emptyMcpDraft,
    ...server,
    id: server.id || rawName,
    name: rawName,
    transport,
    sourceType: server.type || server.sourceType || (transport === "http" ? "streamable_http" : transport),
    args: Array.isArray(server.args) ? server.args.join(" ") : server.args || "",
    env: typeof server.env === "string" ? server.env : stringifyKeyValueBlock(server.env),
    headers: typeof server.headers === "string" ? server.headers : stringifyKeyValueBlock(server.headers),
    enabled: server.enabled ?? true,
    status: server.status || "unknown",
  };
}

function normalizeMcpServerList(value) {
  const servers = Array.isArray(value) ? value : Object.entries(value?.mcpServers || value || {}).map(([name, server]) => ({ name, ...server }));
  return servers.map(normalizeMcpServer);
}

function mcpDraftToPayload(draft) {
  const transport = normalizeMcpTransport(draft.transport);
  const base = {
    id: draft.id || draft.name,
    name: draft.name.trim(),
    transport,
    type: draft.sourceType || (transport === "http" ? "streamable_http" : transport),
    enabled: draft.enabled,
    description: draft.description.trim(),
  };

  if (transport === "stdio") {
    return {
      ...base,
      command: draft.command.trim(),
      args: draft.args.split(/\s+/).filter(Boolean),
      env: parseKeyValueBlock(draft.env),
    };
  }

  return {
    ...base,
    url: draft.url.trim(),
    headers: parseKeyValueBlock(draft.headers),
  };
}

function mcpPreviewConfig(draft) {
  const payload = mcpDraftToPayload(draft);
  const config = {
    transport: payload.transport,
  };
  if (payload.transport === "stdio") {
    config.command = payload.command;
    config.args = payload.args;
    if (Object.keys(payload.env || {}).length) config.env = payload.env;
  } else {
    config.url = payload.url;
    if (Object.keys(payload.headers || {}).length) config.headers = payload.headers;
  }
  return JSON.stringify({ [payload.name || "mcp-server"]: config }, null, 2);
}

function normalizeThinkingContent(value) {
  if (!value) return "";

  if (typeof value === "object") {
    const content = value.reasoning_content ?? value.reasoning ?? value.thinking ?? value.content;
    return typeof content === "string" ? content : JSON.stringify(content ?? value, null, 2);
  }

  if (typeof value !== "string") return String(value);

  const text = value.trim();
  if (!text) return "";

  try {
    return normalizeThinkingContent(JSON.parse(text));
  } catch {
    const reasoningMatches = [...text.matchAll(/["']reasoning_content["']\s*:\s*["']((?:\\.|[^"'\\])*)["']/g)];
    if (reasoningMatches.length) {
      return reasoningMatches.map((match) => match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n")).join("");
    }

    return text
      .split(/\r?\n/)
      .map((line) => {
        try {
          return normalizeThinkingContent(JSON.parse(line));
        } catch {
          return line;
        }
      })
      .filter(Boolean)
      .join("");
  }
}

function groupMessages(messages) {
  const groupMap = new Map();
  messages.forEach((message, index) => {
    const groupId = message.group_id ?? `single-${index}`;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, { groupId, firstIndex: index, messages: [] });
    }
    groupMap.get(groupId).messages.push({ ...message, _index: index });
  });

  return [...groupMap.values()]
    .sort((a, b) => {
      const aId = Number(a.groupId);
      const bId = Number(b.groupId);
      if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) return aId - bId;
      return a.firstIndex - b.firstIndex;
    })
    .map((group) => ({
      ...group,
      messages: group.messages.sort((a, b) => (a.msg_order ?? 0) - (b.msg_order ?? 0) || a._index - b._index),
    }));
}

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(makeThreadId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState(normalizeSettings({}));
  const [modelCatalog, setModelCatalog] = useState(fallbackModelCatalog);
  const [apiKey, setApiKey] = useState("");
  const [thinking, setThinking] = useState(true);
  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("准备就绪");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [settingsSection, setSettingsSection] = useState("mcp");
  const [backStack, setBackStack] = useState([]);
  const [forwardStack, setForwardStack] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [modelListStatus, setModelListStatus] = useState("未同步");
  const layoutRef = useRef(null);
  const scrollerRef = useRef(null);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((item) => item.title?.toLowerCase().includes(q) || item.thread_id?.includes(q));
  }, [conversations, search]);

  const messageGroups = useMemo(() => groupMessages(messages), [messages]);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    setApiKey(localStorage.getItem("navistar.apiKey") || "");
    boot();
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, activeView]);

  useEffect(() => {
    if (!resizingSidebar) return;

    function handlePointerMove(event) {
      const rect = layoutRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (event.clientX <= rect.left + sidebarResizeBounds.hideInset) {
        setSidebarVisible(false);
        setResizingSidebar(false);
        return;
      }

      const nextWidth = clampNumber(event.clientX - rect.left, sidebarResizeBounds.min, sidebarResizeBounds.max);
      setSidebarVisible(true);
      setSidebarWidth(nextWidth);
    }

    function handlePointerUp() {
      setResizingSidebar(false);
    }

    document.body.classList.add("is-resizing-sidebar");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.body.classList.remove("is-resizing-sidebar");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizingSidebar]);

  async function boot() {
    setLoading(true);
    try {
      const [settingsData, conversationData, modelData] = await Promise.all([
        fetchSettings(),
        fetchConversations(),
        fetchModelList().catch(() => null),
      ]);
      const catalog = sanitizeModelCatalog(modelData);
      setModelCatalog(catalog);
      setSettings(normalizeSettings(settingsData, catalog));
      setConversations(conversationData);
      setStatus("后端已连接");
      setModelListStatus(formatModelListStatus(catalog));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function reloadConversations() {
    try {
      setConversations(await fetchConversations());
      setStatus("会话已刷新");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function openThread(threadId) {
    setSearchOpen(false);
    navigateTo("chat");
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    setLoading(true);
    try {
      setMessages(await fetchMessages(threadId));
      setStatus("历史已载入");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  function newThread() {
    setSearchOpen(false);
    navigateTo("chat");
    setActiveThreadId(makeThreadId());
    setMessages([]);
    setInput("");
    setStatus("新对话");
  }

  async function removeThread(threadId) {
    try {
      await deleteConversation(threadId);
      const nextList = conversations.filter((item) => item.thread_id !== threadId);
      setConversations(nextList);
      if (threadId === activeThreadId) {
        setActiveThreadId(makeThreadId());
        setMessages([]);
      }
      setStatus("会话已删除");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function submitMessage(text = input) {
    const content = text.trim();
    if (!content || streaming) return;

    const groupId = Date.now();
    const createdAt = new Date().toISOString();
    const human = {
      thread_id: activeThreadId,
      group_id: groupId,
      role: "Human",
      content,
      msg_order: 1,
      created_at: createdAt,
      meta_data: {},
    };
    const assistant = {
      thread_id: activeThreadId,
      group_id: groupId,
      role: "AI",
      content: "",
      msg_order: 3,
      created_at: createdAt,
      meta_data: {},
    };

    navigateTo("chat");
    setMessages((items) => [...items, human, assistant]);
    setInput("");
    setStreaming(true);
    setStatus("模型生成中");

    try {
      await streamChatMessage(
        {
          model_name: settings.model_name,
          human_message: content,
          thinking,
          reasoning_effort: settings.reasoning_effort,
          thread_id: activeThreadId,
          supplier: settings.supplier,
          attachments: [],
        },
        {
          onText: (chunk) => {
            setMessages((items) =>
              items.map((item) =>
                item.group_id === groupId && item.role === "AI" ? { ...item, content: `${item.content}${chunk}` } : item,
              ),
            );
          },
          onThinking: (chunk) => {
            const value = normalizeThinkingContent(chunk);
            if (!value) return;
            setMessages((items) => {
              const existing = items.some((item) => item.group_id === groupId && item.role === "AI_Thinking");
              if (existing) {
                return items.map((item) =>
                  item.group_id === groupId && item.role === "AI_Thinking"
                    ? { ...item, content: `${item.content || ""}${value}` }
                    : item,
                );
              }
              const thinkingMessage = {
                thread_id: activeThreadId,
                group_id: groupId,
                role: "AI_Thinking",
                content: value,
                msg_order: 2,
                created_at: createdAt,
                meta_data: {},
              };
              return [...items, thinkingMessage];
            });
          },
          onError: (message) => setStatus(message),
          onDone: () => setStatus("回复完成"),
        },
      );
      await reloadConversations();
    } catch (error) {
      setStatus(error.message);
      setMessages((items) =>
        items.map((item) =>
          item.group_id === groupId && item.role === "AI" ? { ...item, content: `请求失败：${error.message}` } : item,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  async function persistSettings() {
    localStorage.setItem("navistar.apiKey", apiKey);
    try {
      const nextSettings = normalizeSettings(settings, modelCatalog);
      await saveSettings(nextSettings);
      if (apiKey.trim()) await saveModelKey(nextSettings.supplier, apiKey.trim());
      setStatus("设置已保存");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function inspectModels() {
    setModelListStatus("同步中");
    try {
      const catalog = sanitizeModelCatalog(await fetchModelList());
      setModelCatalog(catalog);
      setSettings((value) => normalizeSettings(value, catalog));
      setModelListStatus(formatModelListStatus(catalog));
    } catch (error) {
      setModelListStatus(error.message);
    }
  }

  function navigateTo(view) {
    if (view === activeView) return;
    setBackStack((items) => [...items, activeView]);
    setForwardStack([]);
    setActiveView(view);
  }

  function openSettings(section = "mcp") {
    setSearchOpen(false);
    setSettingsSection(section);
    navigateTo("settings");
  }

  function openSearch() {
    setSearch("");
    setSearchOpen(true);
  }

  function goBack() {
    setBackStack((items) => {
      if (items.length === 0) return items;
      const nextView = items[items.length - 1];
      setForwardStack((forwardItems) => [activeView, ...forwardItems]);
      setActiveView(nextView);
      return items.slice(0, -1);
    });
  }

  function goForward() {
    setForwardStack((items) => {
      if (items.length === 0) return items;
      const nextView = items[0];
      setBackStack((backItems) => [...backItems, activeView]);
      setActiveView(nextView);
      return items.slice(1);
    });
  }

  function startSidebarResize(event) {
    event.preventDefault();
    setSidebarVisible(true);
    setResizingSidebar(true);
  }

  return (
    <main className="app-shell h-screen overflow-hidden p-2 text-foreground">
      <div className="glass-frame flex h-full flex-col overflow-hidden rounded-[18px]">
        <TopBar
          activeView={activeView}
          canGoBack={backStack.length > 0}
          canGoForward={forwardStack.length > 0}
          loading={loading}
          onBack={goBack}
          onForward={goForward}
          onReload={boot}
          onToggleSidebar={() => setSidebarVisible((value) => !value)}
          onWindowAction={(action) => window.navistar?.windowAction?.(action)}
          settingsSection={settingsSection}
          sidebarVisible={sidebarVisible}
        />

        <div
          ref={layoutRef}
          className={cn(
            "relative grid min-h-0 flex-1 gap-3 pb-3 pr-3 transition-[grid-template-columns]",
            resizingSidebar && "is-resizing",
            !sidebarVisible && "sidebar-hidden"
          )}
          style={{ gridTemplateColumns: sidebarVisible ? `${sidebarWidth}px minmax(0, 1fr)` : "0 minmax(0, 1fr)" }}
        >
          <div className={cn("h-full min-w-0 overflow-hidden transition-opacity", sidebarVisible ? "opacity-100" : "pointer-events-none opacity-0")}>
            <Sidebar
              activeView={activeView}
              activeSettingsSection={settingsSection}
              conversations={conversations}
              onDeleteThread={removeThread}
              onOpenChat={() => navigateTo("chat")}
              onNewThread={newThread}
              onOpenSettings={openSettings}
              onOpenThread={openThread}
              onOpenSearch={openSearch}
              onSettingsSectionChange={setSettingsSection}
            />
          </div>

          <section
            className={cn(
              "content-surface relative flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-border/80 bg-main/72 shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur-2xl",
              activeView === "settings" && "settings-content-surface",
              !sidebarVisible && "sidebar-hidden"
            )}
          >
            {activeView === "settings" ? (
              <SettingsPage
                apiKey={apiKey}
                modelCatalog={modelCatalog}
                modelListStatus={modelListStatus}
                onApiKeyChange={setApiKey}
                onInspectModels={inspectModels}
                onSave={persistSettings}
                settings={settings}
                settingsSection={settingsSection}
                setSettings={setSettings}
                status={status}
              />
            ) : (
              <>
                <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
                  {!hasMessages ? (
                    <EmptyConversation
                      input={input}
                      networkEnabled={networkEnabled}
                      onInputChange={setInput}
                      modelCatalog={modelCatalog}
                      onModelChange={(model_name, supplier = settings.supplier) => setSettings({ ...settings, model_name, supplier })}
                      onNetworkChange={setNetworkEnabled}
                      onReasoningChange={(reasoning_effort) => setSettings({ ...settings, reasoning_effort })}
                      onSubmit={submitMessage}
                      onThinkingChange={setThinking}
                      settings={settings}
                      thinking={thinking}
                    />
                  ) : (
                    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-7 px-8 pb-48 pt-8">
                      {messageGroups.map((group) => (
                        <MessageGroup key={group.groupId} group={group} />
                      ))}
                      {streaming && <StreamingMarker />}
                    </div>
                  )}
                </div>

                {hasMessages && (
                  <ComposerDock
                  input={input}
                  modelCatalog={modelCatalog}
                  networkEnabled={networkEnabled}
                  onInputChange={setInput}
                  onModelChange={(model_name, supplier = settings.supplier) => setSettings({ ...settings, model_name, supplier })}
                  onNetworkChange={setNetworkEnabled}
                  onReasoningChange={(reasoning_effort) => setSettings({ ...settings, reasoning_effort })}
                  onSubmit={submitMessage}
                  onThinkingChange={setThinking}
                  settings={settings}
                  streaming={streaming}
                  thinking={thinking}
                />
                )}
              </>
            )}
          </section>

          {sidebarVisible && (
            <button
              aria-label="调整侧边栏宽度"
              className="sidebar-resize-handle"
              onPointerDown={startSidebarResize}
              style={{ left: `${sidebarWidth}px` }}
              type="button"
            />
          )}
        </div>

        <SearchDialog
          conversations={filteredConversations}
          onClose={() => setSearchOpen(false)}
          onOpenThread={openThread}
          onQueryChange={setSearch}
          open={searchOpen}
          query={search}
        />
      </div>
    </main>
  );
}

function Sidebar({
  activeSettingsSection,
  activeView,
  conversations,
  onDeleteThread,
  onNewThread,
  onOpenChat,
  onOpenSettings,
  onOpenThread,
  onOpenSearch,
  onSettingsSectionChange,
}) {
  if (activeView === "settings") {
    return <SettingsSidebar activeSection={activeSettingsSection} onReturn={onOpenChat} onSectionChange={onSettingsSectionChange} />;
  }

  return (
    <aside className="glass-sidebar flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="drag-region flex h-14 items-center px-4 text-sm font-semibold text-muted-foreground">NaviStar</div>

      <nav className="sidebar-primary-actions flex flex-col gap-1 px-4" aria-label="主操作">
        <SidebarCommandButton icon={PencilLine} label="新对话" onClick={onNewThread} />
        <SidebarCommandButton icon={Search} label="搜索" onClick={onOpenSearch} />
      </nav>

      <div className="mt-6 min-h-0 flex-1 px-4">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">对话</div>
        <ConversationList conversations={conversations} onDeleteThread={onDeleteThread} onOpenThread={onOpenThread} />
      </div>

      <div className="mt-auto px-4 pb-4">
        <SidebarCommandButton active={activeView === "settings"} icon={Settings} label="设置" onClick={() => onOpenSettings("mcp")} />
      </div>
    </aside>
  );
}

function ConversationList({ conversations, onDeleteThread, onOpenThread }) {
  if (conversations.length === 0) {
    return <div className="px-2 py-2 text-sm text-muted-foreground">暂无聊天</div>;
  }

  return (
    <div className="flex max-h-full flex-col gap-1 overflow-y-auto pr-1">
      {conversations.map((item) => (
        <button
          key={item.thread_id}
          className="group flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-left text-sm text-muted-foreground transition duration-200 hover:-translate-y-px hover:bg-accent hover:text-foreground"
          onClick={() => onOpenThread(item.thread_id)}
          type="button"
        >
          <MessageCircle className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{item.title || "新对话"}</span>
          <span className="shrink-0 text-xs text-muted-foreground/70">{relativeTime(item.updated_at || item.created_at)}</span>
          <Trash2
            className="shrink-0 opacity-0 transition group-hover:opacity-70"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteThread(item.thread_id);
            }}
          />
        </button>
      ))}
    </div>
  );
}

function SettingsSidebar({ activeSection, onReturn, onSectionChange }) {
  return (
    <aside className="settings-nav-shell flex h-full min-h-0 flex-col overflow-hidden px-3 py-4">
      <button
        className="mb-6 flex h-9 items-center gap-2 rounded-lg px-2 text-sm text-[#6f7472] transition hover:bg-black/5 hover:text-[#1f2322]"
        onClick={onReturn}
        type="button"
      >
        <ArrowLeft />
        返回应用
      </button>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {settingsSections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm transition",
              activeSection === id ? "bg-[#e8eee7] text-[#171b1a]" : "text-[#3d4441] hover:bg-black/5",
            )}
            onClick={() => onSectionChange(id)}
            type="button"
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  return `${Math.round(hours / 24)} 天`;
}

function SidebarCommandButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      className={cn(
        "sidebar-command-button flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-medium transition duration-200",
        active && "is-active",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-[1.05rem] shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function SearchDialog({ conversations, onClose, onOpenThread, onQueryChange, open, query }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="search-dialog-backdrop no-drag" onMouseDown={onClose}>
      <div className="search-dialog-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="搜索对话">
        <input
          ref={inputRef}
          className="search-dialog-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索对话"
        />
        <div className="search-dialog-section-label">近期对话</div>
        <div className="search-dialog-results">
          {conversations.length === 0 ? (
            <div className="search-dialog-empty">没有匹配的对话</div>
          ) : (
            conversations.slice(0, 8).map((item) => (
              <button
                key={item.thread_id}
                className="search-dialog-result"
                onClick={() => onOpenThread(item.thread_id)}
                type="button"
              >
                <span className="truncate">{item.title || "新对话"}</span>
                <span className="search-dialog-project">NaviStar-Agent</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TopBar({
  activeView,
  canGoBack,
  canGoForward,
  loading,
  onBack,
  onForward,
  onReload,
  onToggleSidebar,
  onWindowAction,
  settingsSection,
  sidebarVisible,
}) {
  const title = activeView === "settings" ? getSettingsSectionLabel(settingsSection) : "小星";
  return (
    <header className="drag-region glass-topbar flex h-12 shrink-0 items-center justify-between px-3 backdrop-blur-2xl">
      <div className="no-drag flex items-center gap-3">
        <button
          className={cn("rounded-md p-1.5 text-muted-foreground transition duration-200 hover:bg-accent hover:text-foreground", sidebarVisible && "text-foreground")}
          onClick={onToggleSidebar}
          title={sidebarVisible ? "隐藏侧栏" : "显示侧栏"}
        >
          <PanelLeft />
        </button>
        <button
          className="rounded-md p-1.5 text-muted-foreground transition duration-200 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={!canGoBack}
          onClick={onBack}
          title="后退"
        >
          <ArrowLeft />
        </button>
        <button
          className="rounded-md p-1.5 text-muted-foreground transition duration-200 hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={!canGoForward}
          onClick={onForward}
          title="前进"
        >
          <ArrowRight />
        </button>
        <div className="ml-3 flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          <Badge variant="outline">{activeView === "settings" ? "配置" : "对话"}</Badge>
        </div>
      </div>
      <div className="no-drag flex items-center gap-2 text-muted-foreground">
        <button className="rounded-md p-1 transition duration-200 hover:bg-accent hover:text-foreground" onClick={onReload}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </button>
        <button className="rounded-md p-1 transition duration-200 hover:bg-accent hover:text-foreground" onClick={() => onWindowAction?.("minimize")}>
          <Minimize />
        </button>
        <button className="rounded-md p-1 transition duration-200 hover:bg-accent hover:text-foreground" onClick={() => onWindowAction?.("maximize")}>
          <Square />
        </button>
        <button className="rounded-md p-1 transition duration-200 hover:bg-destructive hover:text-foreground" onClick={() => onWindowAction?.("close")}>
          <X />
        </button>
      </div>
    </header>
  );
}

function EmptyConversation(props) {
  return (
    <div className="grid h-full content-center justify-items-center px-8 pb-10">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-semibold">开始新对话</h2>
      </div>
      <div className="w-full max-w-[720px] flex flex-col gap-3.5 items-center">
        <ChatBox className="w-full" {...props} />
      </div>
    </div>
  );
}

function ComposerDock(props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 px-8">
      <div className="pointer-events-auto mx-auto w-full max-w-[720px] flex flex-col gap-3.5 items-center">
        <ChatBox {...props} compact />
      </div>
    </div>
  );
}

function ChatBox({
  className,
  compact = false,
  input,
  modelCatalog,
  networkEnabled,
  onInputChange,
  onModelChange,
  onNetworkChange,
  onReasoningChange,
  onSubmit,
  onThinkingChange,
  settings,
  streaming,
  thinking,
}) {
  return (
    <div className={cn("composer-card rounded-2xl border border-input bg-composer/92 shadow-[0_18px_54px_rgba(0,0,0,0.28)] backdrop-blur-2xl", className)}>
      <Textarea
        className={cn("border-0 bg-transparent px-4 py-4 text-base leading-6 shadow-none focus:ring-0", compact ? "min-h-16" : "min-h-28")}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="给小星发送消息"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <div className="flex items-center gap-2">
          <ToggleChip active={thinking} icon={Atom} label="深度思考" onClick={() => onThinkingChange(!thinking)} />
          <ToggleChip active={networkEnabled} icon={Globe2} label="智能搜索" onClick={() => onNetworkChange(!networkEnabled)} />
          <ToggleChip icon={FilePlus2} label="附件接口未接入后端" />
        </div>
        <div className="flex items-center gap-2">
          <ModelReasoningMenu
            modelCatalog={modelCatalog}
            modelValue={settings.model_name}
            onModelChange={onModelChange}
            onReasoningChange={onReasoningChange}
            reasoningValue={settings.reasoning_effort}
            supplier={settings.supplier}
          />
          <button
            className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground transition duration-200 hover:scale-105 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            disabled={!input.trim() || streaming}
            onClick={() => onSubmit()}
          >
            {streaming ? <Loader2 className="animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleChip({ active, icon: Icon, label, onClick }) {
  return (
    <button
      className={cn(
        "grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition duration-200 hover:-translate-y-px active:translate-y-0",
        active ? "border-ring/50 bg-accent text-foreground shadow-[0_0_18px_rgba(217,195,127,0.08)]" : "hover:bg-accent hover:text-foreground",
      )}
      aria-label={label}
      onClick={onClick}
      title={label}
      type="button"
    >
      {Icon && <Icon />}
    </button>
  );
}

function SelectMenu({ formatOption = (option) => option, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-input bg-muted px-4 text-left text-sm transition",
          open && "border-ring ring-2 ring-ring/20",
        )}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{formatOption(value)}</span>
        <ChevronDown className={cn("text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-11 z-20 overflow-hidden rounded-2xl border border-border bg-popover py-2 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
          {options.map((option) => (
            <button
              key={option}
              className={cn(
                "flex h-10 w-full items-center justify-between px-4 text-left text-sm transition hover:bg-accent",
                option === value && "bg-accent text-foreground",
              )}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span className="truncate">{formatOption(option)}</span>
              {option === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelReasoningMenu({ modelCatalog, modelValue, onModelChange, onReasoningChange, reasoningValue, supplier }) {
  const [open, setOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const rootRef = useRef(null);
  const labels = { low: "低", medium: "中", high: "高", xhigh: "超高" };
  const catalog = sanitizeModelCatalog(modelCatalog);
  const modelOptions = getModelOptions(catalog);
  const activeSupplier = findModelSupplier(modelValue, catalog) || supplier;
  const supplierLabel = formatSupplierLabel(activeSupplier);
  const modelLabel = formatModelTrigger(modelValue);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="model-picker flex h-8 items-center gap-1.5 text-xs">
        <span className="model-provider-pill flex h-8 items-center max-w-24 truncate rounded-lg bg-muted px-2.5 text-xs text-foreground">{supplierLabel}</span>
        <button
          className={cn(
            "model-model-pill flex h-8 items-center gap-1 rounded-full px-3 text-xs transition hover:bg-muted",
            open && "bg-muted",
          )}
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setModelsOpen(false);
          }}
        >
          <span className="model-name text-xs text-foreground">{modelLabel}</span>
          <span className="reasoning-name text-xs text-muted-foreground">{labels[reasoningValue] || reasoningValue}</span>
          <ChevronDown />
        </button>
      </div>
      {open && (
        <div className="model-menu-popover absolute bottom-12 right-0 z-20 w-[280px] rounded-2xl border border-border bg-popover p-2 text-[12px] shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
          {modelsOpen && (
            <div
              className="model-submenu-popover absolute bottom-0 right-[calc(100%+8px)] w-[300px] rounded-2xl border border-border bg-popover p-2 text-[12px] shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
              onMouseEnter={() => setModelsOpen(true)}
              onMouseLeave={() => setModelsOpen(false)}
            >
              <div className="px-3 pb-1.5 text-[12px] font-medium text-muted-foreground">模型</div>
              {modelOptions.map(({ model, supplier: optionSupplier }) => (
                <button
                  key={`${optionSupplier}-${model}`}
                  className={cn(
                    "grid h-10 w-full grid-cols-[92px_minmax(0,1fr)_16px] items-center gap-2 rounded-xl px-3 text-left text-[12px] transition hover:bg-accent",
                    model === modelValue && "bg-accent text-foreground",
                  )}
                  type="button"
                  onClick={() => {
                    onModelChange(model, optionSupplier);
                    setModelsOpen(false);
                    setOpen(false);
                  }}
                >
                  <span className="truncate text-muted-foreground">{formatSupplierLabel(optionSupplier)}</span>
                  <span className="truncate text-right text-foreground">{formatModelTrigger(model)}</span>
                  <span className="flex justify-end">{model === modelValue && <CheckIcon />}</span>
                </button>
              ))}
            </div>
          )}
          <div className="px-3 pb-1.5 text-[12px] font-medium text-muted-foreground">智能</div>
          {reasoningOptions.map((option) => (
            <button
              key={option}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-xl px-3 text-[12px] transition hover:bg-accent",
                option === reasoningValue && "bg-accent text-foreground",
              )}
              type="button"
              onMouseEnter={() => setModelsOpen(false)}
              onClick={() => {
                onReasoningChange(option);
              }}
            >
              <span>{labels[option]}</span>
              {option === reasoningValue && <CheckIcon />}
            </button>
          ))}
          <div className="my-2 h-px bg-border" />
          <button
            className="grid h-10 w-full grid-cols-[92px_minmax(0,1fr)_16px] items-center gap-2 rounded-xl bg-accent px-3 text-left text-[12px] transition hover:bg-accent"
            type="button"
            onMouseEnter={() => setModelsOpen(true)}
            onFocus={() => setModelsOpen(true)}
          >
            <span className="truncate text-muted-foreground">{supplierLabel}</span>
            <span className="truncate text-right">{modelLabel}</span>
            <ChevronRight className="justify-self-end text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

function MessageGroup({ group }) {
  const humanMessages = group.messages.filter((message) => message.role === "Human");
  const thinkingMessages = group.messages.filter((message) => message.role === "AI_Thinking");
  const aiMessages = group.messages.filter((message) => message.role === "AI");

  return (
    <section className="message-group flex flex-col gap-4">
      {humanMessages.map((message) => (
        <Message key={`${message.group_id}-${message.msg_order}-${message._index}`} message={message} />
      ))}
      {(thinkingMessages.length > 0 || aiMessages.length > 0) && (
        <AssistantTurn messages={aiMessages} thinkingMessages={thinkingMessages} />
      )}
      {group.messages
        .filter((message) => !["Human", "AI", "AI_Thinking"].includes(message.role))
        .map((message) => (
          <Message key={`${message.group_id}-${message.msg_order}-${message._index}`} message={message} />
        ))}
    </section>
  );
}

function AssistantTurn({ messages, thinkingMessages }) {
  const firstMessage = messages[0] || thinkingMessages[0];
  const thinkingContent = thinkingMessages.map((message) => normalizeThinkingContent(message.content)).filter(Boolean).join("");
  const aiContent = messages.map((message) => message.content).filter(Boolean).join("\n\n");

  return (
    <article className="flex max-w-[82%] flex-col gap-2">
      <div className="text-xs text-muted-foreground">小星 · {formatTime(firstMessage?.created_at)}</div>
      {thinkingContent && (
        <details className="thinking-panel group rounded-lg border border-border bg-muted/55 px-3 py-2 text-xs text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-foreground/80">
            <span>思考内容</span>
            <ChevronDown className="transition group-open:rotate-180" />
          </summary>
          <div className="markdown-body thinking-body mt-2 max-h-56 overflow-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinkingContent}</ReactMarkdown>
          </div>
        </details>
      )}
      {(aiContent || !thinkingContent) && <MarkdownContent content={aiContent} />}
    </article>
  );
}

function Message({ message }) {
  const isHuman = message.role === "Human";
  return (
    <article className={cn("flex flex-col gap-2", isHuman ? "items-end" : "items-start")}>
      <div className="max-w-[78%] text-xs text-muted-foreground">{isHuman ? "你" : "小星"} · {formatTime(message.created_at)}</div>
      <div className={cn("max-w-[78%] rounded-xl px-4 py-3", isHuman ? "bg-composer" : "bg-transparent")}>
        <MarkdownContent content={message.content} />
      </div>
    </article>
  );
}

function MarkdownContent({ content }) {
  if (!content) return <span className="text-sm text-muted-foreground">...</span>;
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function SettingsPage(props) {
  if (props.settingsSection === "mcp") return <McpSettingsPage />;
  if (props.settingsSection === "model") return <ModelSettingsPage {...props} />;
  return <SettingsPlaceholder section={getSettingsSectionLabel(props.settingsSection)} />;
}

function ModelSettingsPage({ apiKey, modelCatalog, modelListStatus, onApiKeyChange, onInspectModels, onSave, settings, setSettings, status }) {
  const catalog = sanitizeModelCatalog(modelCatalog);
  const supplierOptions = Object.keys(catalog);
  const modelOptions = catalog[settings.supplier] || catalog[getFirstSupplier(catalog)] || [];

  return (
    <div className="settings-page min-h-0 flex-1 overflow-y-auto px-8 py-8 text-[#1f2322]">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-2xl font-semibold">配置</h2>
        <p className="mt-2 text-sm text-[#6f7472]">模型、推理强度和密钥。</p>

        <div className="mt-8 grid gap-5">
          <SettingField label="供应商">
            <SelectMenu
              options={supplierOptions}
              value={settings.supplier}
              onChange={(supplier) => {
                const nextModels = catalog[supplier] || [];
                setSettings({ ...settings, supplier, model_name: nextModels[0] });
              }}
              formatOption={formatSupplierLabel}
            />
          </SettingField>
          <SettingField label="模型">
            <SelectMenu
              options={modelOptions}
              value={settings.model_name}
              onChange={(model_name) => setSettings({ ...settings, model_name })}
              formatOption={formatModelLabel}
            />
          </SettingField>
          <SettingField label="API Key">
            <Input className="settings-input" type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="sk-..." />
          </SettingField>
          <SettingField label="temperature">
            <input
              className="w-full accent-[#1f2322]"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(event) => setSettings({ ...settings, temperature: Number(event.target.value) })}
            />
          </SettingField>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button className="bg-[#1f2322] text-white hover:bg-[#343938]" onClick={onSave}>
            <Check data-icon="inline-start" />
            保存
          </Button>
          <Button className="border-[#dedfdc] bg-white text-[#1f2322] hover:bg-[#f4f5f2]" variant="outline" onClick={onInspectModels}>
            测试模型列表
          </Button>
        </div>

        <div className="mt-8 rounded-lg border border-[#e1e3df] bg-white p-4 text-sm">
          <StatusLine label="连接" value={status} />
          <StatusLine label="模型列表" value={modelListStatus} />
        </div>
      </div>
    </div>
  );
}

function SettingsPlaceholder({ section }) {
  return (
    <div className="settings-page grid min-h-0 flex-1 place-items-center px-8 py-8 text-[#1f2322]">
      <div className="w-full max-w-[520px] rounded-lg border border-[#e1e3df] bg-white p-6">
        <div className="mb-4 grid size-10 place-items-center rounded-lg bg-[#eef2ee] text-[#3d4441]">
          <Wrench />
        </div>
        <h2 className="text-xl font-semibold">{section}</h2>
        <p className="mt-2 text-sm text-[#6f7472]">前端入口已保留，后端接口和配置项待接入。</p>
      </div>
    </div>
  );
}

function McpSettingsPage() {
  const [servers, setServers] = useState(fallbackMcpServers.map(normalizeMcpServer));
  const [selectedId, setSelectedId] = useState(fallbackMcpServers[0]?.id || "");
  const [draft, setDraft] = useState(normalizeMcpServer(fallbackMcpServers[0]));
  const [mode, setMode] = useState("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState("同步中");
  const selectedServer = servers.find((server) => server.id === selectedId);
  const isNewDraft = mode === "new";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMcpServers()
      .then((data) => {
        if (!alive) return;
        const items = normalizeMcpServerList(data);
        const nextServers = items.length ? items : fallbackMcpServers.map(normalizeMcpServer);
        setServers(nextServers);
        setSelectedId(nextServers[0]?.id || "");
        setApiStatus(items.length ? "已同步" : "暂无服务器");
      })
      .catch((error) => {
        if (!alive) return;
        setServers(fallbackMcpServers.map(normalizeMcpServer));
        setSelectedId(fallbackMcpServers[0]?.id || "");
        setApiStatus(`接口待实现：${error.message}`);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (isNewDraft) return;
    const nextDraft = normalizeMcpServer(selectedServer || servers[0] || emptyMcpDraft);
    setDraft(nextDraft);
  }, [selectedId, selectedServer, servers, isNewDraft]);

  function startNewServer() {
    const nextDraft = {
      ...emptyMcpDraft,
      id: "",
      name: "new-mcp-server",
      status: "draft",
    };
    setMode("new");
    setSelectedId("");
    setDraft(nextDraft);
  }

  async function saveDraft() {
    const payload = mcpDraftToPayload(draft);
    if (!payload.name) {
      setApiStatus("名称不能为空");
      return;
    }
    if (payload.transport === "stdio" && !payload.command) {
      setApiStatus("stdio 需要 command");
      return;
    }
    if (payload.transport !== "stdio" && !payload.url) {
      setApiStatus("远程服务需要 url");
      return;
    }

    const nextServer = normalizeMcpServer({
      ...draft,
      ...payload,
      id: payload.id || payload.name,
      status: "pending",
      origin: draft.origin || "手动",
    });

    setSaving(true);
    setServers((items) => {
      const exists = items.some((item) => item.id === nextServer.id);
      return exists ? items.map((item) => (item.id === nextServer.id ? nextServer : item)) : [...items, nextServer];
    });
    setSelectedId(nextServer.id);
    setMode("edit");

    try {
      if (isNewDraft) await createMcpServer(payload);
      else await updateMcpServer(nextServer.id, payload);
      setApiStatus("已保存");
    } catch (error) {
      setApiStatus(`前端草稿已保存，后端待实现：${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeServer(serverId) {
    const nextServers = servers.filter((server) => server.id !== serverId);
    setServers(nextServers);
    setSelectedId(nextServers[0]?.id || "");
    setMode(nextServers.length ? "edit" : "new");
    if (!nextServers.length) startNewServer();

    try {
      await deleteMcpServer(serverId);
      setApiStatus("已删除");
    } catch (error) {
      setApiStatus(`前端草稿已删除，后端待实现：${error.message}`);
    }
  }

  async function switchServer(server, enabled) {
    setServers((items) => items.map((item) => (item.id === server.id ? { ...item, enabled } : item)));
    if (server.id === draft.id) setDraft((value) => ({ ...value, enabled }));

    try {
      await toggleMcpServer(server.id, enabled);
      setApiStatus(enabled ? "已启用" : "已关闭");
    } catch (error) {
      setApiStatus(`前端状态已更新，后端待实现：${error.message}`);
    }
  }

  async function testDraft() {
    setApiStatus("测试中");
    try {
      await testMcpServer(mcpDraftToPayload(draft));
      setApiStatus("连接可用");
    } catch (error) {
      setApiStatus(`测试接口待实现：${error.message}`);
    }
  }

  function copyPreview() {
    navigator.clipboard?.writeText(mcpPreviewConfig(draft));
    setApiStatus("配置已复制");
  }

  return (
    <div className="settings-page min-h-0 flex-1 overflow-y-auto text-[#1f2322]">
      <div className="border-b border-[#e7e8e4] px-8 py-5 text-sm text-[#747a77]">
        <span>MCP</span>
        <span className="mx-2 text-[#bec3bf]">/</span>
        <span>服务器</span>
      </div>

      <div className="mx-auto w-full max-w-[1080px] px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold leading-tight">MCP 服务器</h2>
            <p className="mt-2 text-sm text-[#6f7472]">
              连接外部工具和数据源。 <button className="text-[#1677ff] hover:underline">了解更多。</button>
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f0f1ef] px-4 text-sm font-medium text-[#1f2322] transition hover:bg-[#e5e7e4] active:scale-[0.98]"
            onClick={startNewServer}
            type="button"
          >
            <Plus />
            添加服务器
          </button>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">服务器</h3>
              <StatusBadge loading={loading} status={apiStatus} />
            </div>

            <div className="overflow-hidden rounded-lg border border-[#e1e3df] bg-white">
              {loading ? (
                <McpSkeleton />
              ) : servers.length ? (
                servers.map((server) => (
                  <McpServerRow
                    active={server.id === selectedId}
                    key={server.id}
                    onRemove={removeServer}
                    onSelect={(serverId) => {
                      setMode("edit");
                      setSelectedId(serverId);
                    }}
                    onToggle={switchServer}
                    server={server}
                  />
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-[#777d7a]">暂无服务器</div>
              )}
            </div>

            <BackendContractPanel />
          </section>

          <section className="min-w-0 rounded-lg border border-[#e1e3df] bg-white">
            <div className="flex items-center justify-between border-b border-[#eceeeb] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">{isNewDraft ? "添加服务器" : "服务器配置"}</h3>
                <p className="mt-1 text-xs text-[#777d7a]">{draft.transport === "stdio" ? "本地进程" : "远程连接"}</p>
              </div>
              <button
                className="grid size-8 place-items-center rounded-lg text-[#6f7472] transition hover:bg-[#f1f3f0] hover:text-[#1f2322]"
                onClick={copyPreview}
                title="复制 LangChain 配置"
                type="button"
              >
                <Copy />
              </button>
            </div>

            <McpServerForm draft={draft} onChange={setDraft} />

            <div className="border-t border-[#eceeeb] px-5 py-4">
              <div className="mb-4 rounded-lg bg-[#f6f7f5] p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-[#6f7472]">
                  <span>LangChain 配置预览</span>
                  <span>{draft.sourceType || draft.transport}</span>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#303433]">{mcpPreviewConfig(draft)}</pre>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1f2322] px-3 text-sm font-medium text-white transition hover:bg-[#343938] active:scale-[0.98] disabled:opacity-50"
                  disabled={saving}
                  onClick={saveDraft}
                  type="button"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Check />}
                  保存
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe2de] bg-white px-3 text-sm font-medium text-[#1f2322] transition hover:bg-[#f5f6f4] active:scale-[0.98]"
                  onClick={testDraft}
                  type="button"
                >
                  <ShieldCheck />
                  测试连接
                </button>
                {!isNewDraft && draft.id && (
                  <button
                    className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#b1423d] transition hover:bg-[#fff1ef] active:scale-[0.98]"
                    onClick={() => removeServer(draft.id)}
                    type="button"
                  >
                    <Trash2 />
                    删除
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ loading, status }) {
  const isWaiting = /待实现|HTTP|失败|错误/i.test(status);
  const Icon = loading ? Loader2 : isWaiting ? CircleAlert : CheckCircle2;
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-[320px] items-center gap-1.5 truncate rounded-full border px-2.5 text-xs",
        isWaiting ? "border-[#f0d7d2] bg-[#fff7f5] text-[#9a423b]" : "border-[#d8e5d8] bg-[#f3faf3] text-[#2f6f45]",
      )}
      title={status}
    >
      <Icon className={cn("size-3.5 shrink-0", loading && "animate-spin")} />
      <span className="truncate">{status}</span>
    </span>
  );
}

function McpSkeleton() {
  return (
    <div className="divide-y divide-[#eceeeb]">
      {[0, 1, 2].map((item) => (
        <div className="flex h-[78px] items-center gap-4 px-5" key={item}>
          <div className="size-9 animate-pulse rounded-lg bg-[#edf0ed]" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-40 animate-pulse rounded bg-[#edf0ed]" />
            <div className="mt-3 h-2.5 w-64 animate-pulse rounded bg-[#f1f2ef]" />
          </div>
          <div className="h-6 w-10 animate-pulse rounded-full bg-[#edf0ed]" />
        </div>
      ))}
    </div>
  );
}

function McpServerRow({ active, onRemove, onSelect, onToggle, server }) {
  const remote = server.transport !== "stdio";
  const statusLabel = server.enabled ? "已启用" : "已关闭";

  return (
    <div
      className={cn(
        "grid min-h-[78px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#eceeeb] px-5 py-3 last:border-b-0",
        active && "bg-[#f7f9f6]",
      )}
    >
      <button className="flex min-w-0 items-center gap-4 text-left" onClick={() => onSelect(server.id)} type="button">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", server.enabled ? "bg-[#e8f2eb] text-[#2d7042]" : "bg-[#f1f2ef] text-[#858a87]")}>
          {remote ? <Link2 /> : <TerminalIcon />}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-[#1f2322]">{server.name}</span>
            <span className="shrink-0 rounded-md bg-[#eef1ee] px-1.5 py-0.5 text-[11px] font-medium text-[#66706b]">{server.transport}</span>
          </span>
          <span className="mt-1 block truncate text-xs text-[#777d7a]">{remote ? server.url : `${server.command || "command"} ${server.args || ""}`}</span>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-[#777d7a] sm:inline">{statusLabel}</span>
        <button
          className={cn(
            "relative h-6 w-11 rounded-full border transition",
            server.enabled ? "border-[#2f8b57] bg-[#2f8b57]" : "border-[#d8dbd6] bg-[#e9ebe8]",
          )}
          onClick={() => onToggle(server, !server.enabled)}
          role="switch"
          aria-checked={server.enabled}
          title={server.enabled ? "关闭" : "启用"}
          type="button"
        >
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition", server.enabled ? "left-5" : "left-0.5")} />
        </button>
        <button
          className="grid size-8 place-items-center rounded-lg text-[#777d7a] transition hover:bg-[#f1f3f0] hover:text-[#1f2322]"
          onClick={() => onSelect(server.id)}
          title="配置"
          type="button"
        >
          <Wrench />
        </button>
        <button
          className="grid size-8 place-items-center rounded-lg text-[#b1423d] transition hover:bg-[#fff1ef]"
          onClick={() => onRemove(server.id)}
          title="删除"
          type="button"
        >
          <Trash2 />
        </button>
      </div>
    </div>
  );
}

function McpServerForm({ draft, onChange }) {
  function update(field, value) {
    const next = { ...draft, [field]: value };
    if (field === "transport") {
      next.sourceType = value === "http" ? "streamable_http" : value;
      if (value === "stdio") next.url = "";
      else next.command = "";
    }
    onChange(next);
  }

  return (
    <div className="grid gap-4 px-5 py-5">
      <McpFormField label="名称">
        <Input className="settings-input" value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="bing-cn-mcp-server" />
      </McpFormField>

      <McpFormField label="传输">
        <div className="grid grid-cols-2 gap-2">
          {mcpTransports.map((transport) => (
            <button
              className={cn(
                "min-h-12 rounded-lg border px-3 py-2 text-left transition active:scale-[0.98]",
                draft.transport === transport.value
                  ? "border-[#1f2322] bg-[#1f2322] text-white"
                  : "border-[#dfe2de] bg-white text-[#1f2322] hover:bg-[#f5f6f4]",
              )}
              key={transport.value}
              onClick={() => update("transport", transport.value)}
              type="button"
            >
              <span className="block text-sm font-medium">{transport.label}</span>
              <span className={cn("mt-0.5 block text-xs", draft.transport === transport.value ? "text-white/70" : "text-[#777d7a]")}>{transport.hint}</span>
            </button>
          ))}
        </div>
      </McpFormField>

      {draft.transport === "stdio" ? (
        <>
          <McpFormField label="Command">
            <Input className="settings-input" value={draft.command} onChange={(event) => update("command", event.target.value)} placeholder="uvx" />
          </McpFormField>
          <McpFormField label="Args">
            <Input className="settings-input" value={draft.args} onChange={(event) => update("args", event.target.value)} placeholder="mcp-server-fetch" />
          </McpFormField>
          <McpFormField label="Env">
            <textarea
              className="settings-textarea min-h-24"
              value={draft.env}
              onChange={(event) => update("env", event.target.value)}
              placeholder={"API_KEY=...\nBASE_URL=..."}
            />
          </McpFormField>
        </>
      ) : (
        <>
          <McpFormField label="URL">
            <Input className="settings-input" value={draft.url} onChange={(event) => update("url", event.target.value)} placeholder="https://example.com/mcp" />
          </McpFormField>
          <McpFormField label="源格式">
            <Input className="settings-input" value={draft.sourceType} onChange={(event) => update("sourceType", event.target.value)} placeholder="streamable_http" />
          </McpFormField>
          <McpFormField label="Headers">
            <textarea
              className="settings-textarea min-h-20"
              value={draft.headers}
              onChange={(event) => update("headers", event.target.value)}
              placeholder={"Authorization=Bearer ...\nX-Client=NaviStar"}
            />
          </McpFormField>
        </>
      )}

      <McpFormField label="备注">
        <Input className="settings-input" value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="可选" />
      </McpFormField>
    </div>
  );
}

function McpFormField({ children, label }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#3c4240]">
      {label}
      {children}
    </label>
  );
}

function BackendContractPanel() {
  const contracts = [
    ["GET", "/mcp/servers", "读取服务器"],
    ["POST", "/mcp/servers", "新增服务器"],
    ["PUT", "/mcp/servers/{id}", "更新服务器"],
    ["DELETE", "/mcp/servers/{id}", "删除服务器"],
    ["POST", "/mcp/servers/{id}/toggle", "启用关闭"],
    ["POST", "/mcp/servers/test", "测试连接"],
  ];

  return (
    <section className="mt-8 rounded-lg border border-[#e1e3df] bg-white">
      <div className="flex items-center gap-2 border-b border-[#eceeeb] px-5 py-4">
        <Database className="text-[#66706b]" />
        <h3 className="text-sm font-semibold">后端接口</h3>
      </div>
      <div className="divide-y divide-[#f0f1ef]">
        {contracts.map(([method, path, label]) => (
          <div className="grid grid-cols-[72px_minmax(0,1fr)_88px] items-center gap-3 px-5 py-3 text-xs" key={`${method}-${path}`}>
            <span className="rounded-md bg-[#f0f2ef] px-2 py-1 text-center font-semibold text-[#3d4441]">{method}</span>
            <code className="truncate rounded bg-[#f7f8f6] px-2 py-1 font-mono text-[#4c5350]">{path}</code>
            <span className="truncate text-right text-[#777d7a]">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingField({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function StatusLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[460px] truncate text-right">{value}</span>
    </div>
  );
}

function StreamingMarker() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="animate-spin" />
      接收中
    </div>
  );
}

export default App;
