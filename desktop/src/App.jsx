import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Atom,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckIcon,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Globe2,
  Loader2,
  MessageCircle,
  Minimize,
  PanelLeft,
  PencilLine,
  RefreshCw,
  Search,
  Settings,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteConversation,
  fetchConversations,
  fetchMessages,
  fetchModelList,
  fetchSettings,
  saveModelKey,
  saveSettings,
  streamChatMessage,
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
  const [activeView, setActiveView] = useState("chat");
  const [backStack, setBackStack] = useState([]);
  const [forwardStack, setForwardStack] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [modelListStatus, setModelListStatus] = useState("未同步");
  const scrollerRef = useRef(null);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((item) => item.title?.toLowerCase().includes(q) || item.thread_id?.includes(q));
  }, [conversations, search]);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    setApiKey(localStorage.getItem("navistar.apiKey") || "");
    boot();
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming, activeView]);

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

    const human = {
      thread_id: activeThreadId,
      group_id: Date.now(),
      role: "Human",
      content,
      msg_order: 1,
      created_at: new Date().toISOString(),
      meta_data: {},
    };
    const assistant = {
      thread_id: activeThreadId,
      group_id: Date.now() + 1,
      role: "AI",
      content: "",
      msg_order: 2,
      created_at: new Date().toISOString(),
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
              items.map((item, index) =>
                index === items.length - 1 ? { ...item, content: `${item.content}${chunk}` } : item,
              ),
            );
          },
          onThinking: (chunk) => {
            const value = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
            setMessages((items) => {
              const last = items[items.length - 1];
              return [...items.slice(0, -1), { ...last, meta_data: { ...last.meta_data, thinking: value } }];
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
        items.map((item, index) => (index === items.length - 1 ? { ...item, content: `请求失败：${error.message}` } : item)),
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

  return (
    <main className="h-screen overflow-hidden bg-sidebar text-foreground">
      <div className="flex h-full flex-col overflow-hidden bg-sidebar">
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
          sidebarVisible={sidebarVisible}
        />

        <div
          className={cn(
            "grid min-h-0 flex-1 transition-[grid-template-columns]",
            sidebarVisible ? "grid-cols-[248px_minmax(0,1fr)]" : "grid-cols-[0_minmax(0,1fr)]",
          )}
        >
          <div className={cn("h-full min-w-0 overflow-hidden transition-opacity", sidebarVisible ? "opacity-100" : "pointer-events-none opacity-0")}>
            <Sidebar
              activeView={activeView}
              conversations={filteredConversations}
              onDeleteThread={removeThread}
              onNewThread={newThread}
              onOpenSettings={() => navigateTo("settings")}
              onOpenThread={openThread}
              onSearch={setSearch}
              search={search}
            />
          </div>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-l-2xl border border-border bg-main">
            {activeView === "settings" ? (
              <SettingsPage
                apiKey={apiKey}
                modelCatalog={modelCatalog}
                modelListStatus={modelListStatus}
                onApiKeyChange={setApiKey}
                onInspectModels={inspectModels}
                onSave={persistSettings}
                settings={settings}
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
                    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-8 pb-36 pt-8">
                      {messages.map((message, index) => (
                        <Message key={`${message.group_id}-${message.msg_order}-${index}`} message={message} />
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
                  sidebarVisible={sidebarVisible}
                  settings={settings}
                  streaming={streaming}
                  thinking={thinking}
                />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Sidebar({ activeView, conversations, onDeleteThread, onNewThread, onOpenSettings, onOpenThread, onSearch, search }) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="drag-region flex h-14 items-center px-4 text-sm font-semibold text-muted-foreground">NaviStar</div>

      <div className="flex flex-col gap-2 px-3">
        <NavButton active={activeView === "chat"} icon={PencilLine} label="新对话" onClick={onNewThread} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" />
          <Input className="h-9 rounded-lg bg-background/60 pl-9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="搜索" />
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 px-3">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">对话</div>
        {conversations.length === 0 ? (
          <div className="px-2 py-2 text-sm text-muted-foreground">暂无聊天</div>
        ) : (
          <div className="flex max-h-full flex-col gap-1 overflow-y-auto pr-1">
            {conversations.map((item) => (
              <button
                key={item.thread_id}
                className="group flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                onClick={() => onOpenThread(item.thread_id)}
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
        )}
      </div>

      <div className="mt-auto p-3 pb-4">
        <NavButton active={activeView === "settings"} icon={Settings} label="设置" onClick={onOpenSettings} />
      </div>
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

function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-md px-2 text-sm font-medium transition",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      onClick={onClick}
    >
      <Icon />
      {label}
    </button>
  );
}

function TopBar({ activeView, canGoBack, canGoForward, loading, onBack, onForward, onReload, onToggleSidebar, onWindowAction, sidebarVisible }) {
  return (
    <header className="drag-region flex h-12 shrink-0 items-center justify-between bg-topbar px-3">
      <div className="no-drag flex items-center gap-3">
        <button
          className={cn("rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground", sidebarVisible && "text-foreground")}
          onClick={onToggleSidebar}
          title={sidebarVisible ? "隐藏侧栏" : "显示侧栏"}
        >
          <PanelLeft />
        </button>
        <button
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={!canGoBack}
          onClick={onBack}
          title="后退"
        >
          <ArrowLeft />
        </button>
        <button
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          disabled={!canGoForward}
          onClick={onForward}
          title="前进"
        >
          <ArrowRight />
        </button>
        <div className="ml-3 flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-semibold">{activeView === "settings" ? "设置" : "小星"}</h1>
          <Badge variant="outline">{activeView === "settings" ? "配置" : "对话"}</Badge>
        </div>
      </div>
      <div className="no-drag flex items-center gap-2 text-muted-foreground">
        <button className="rounded-md p-1 transition hover:bg-accent hover:text-foreground" onClick={onReload}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </button>
        <button className="rounded-md p-1 transition hover:bg-accent hover:text-foreground" onClick={() => onWindowAction?.("minimize")}>
          <Minimize />
        </button>
        <button className="rounded-md p-1 transition hover:bg-accent hover:text-foreground" onClick={() => onWindowAction?.("maximize")}>
          <Square />
        </button>
        <button className="rounded-md p-1 transition hover:bg-destructive hover:text-foreground" onClick={() => onWindowAction?.("close")}>
          <X />
        </button>
      </div>
    </header>
  );
}

function EmptyConversation(props) {
  return (
    <div className="grid h-full content-center justify-items-center px-8 pb-16">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-semibold">开始新对话</h2>
      </div>
      <ChatBox className="w-full max-w-[820px]" {...props} />
    </div>
  );
}

function ComposerDock({ sidebarVisible, ...props }) {
  return (
    <div className={cn("pointer-events-none fixed bottom-7 right-0 px-8 transition-[left]", sidebarVisible ? "left-[256px]" : "left-2")}>
      <div className="pointer-events-auto mx-auto max-w-[840px]">
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
    <div className={cn("rounded-2xl border border-input bg-composer", className)}>
      <Textarea
        className={cn("border-0 bg-transparent px-4 py-4 text-base leading-6 shadow-none focus:ring-0", compact ? "min-h-20" : "min-h-28")}
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
      <div className="flex items-center justify-between px-3 pb-3">
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
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!input.trim() || streaming}
            onClick={() => onSubmit()}
          >
            {streaming ? <Loader2 className="animate-spin" /> : <ArrowUp />}
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
        "grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition",
        active ? "border-ring/50 bg-accent text-foreground" : "hover:bg-accent hover:text-foreground",
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
      <div className="flex h-9 items-center gap-1 text-xs">
        <span className="max-w-20 truncate rounded-lg bg-muted px-2.5 py-2 text-xs text-foreground">{supplierLabel}</span>
        <button
          className={cn(
            "flex h-9 items-center gap-1 rounded-full px-3 text-xs transition hover:bg-muted",
            open && "bg-muted",
          )}
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setModelsOpen(false);
          }}
        >
          <span className="text-xs text-foreground">{modelLabel}</span>
          <span className="text-xs text-muted-foreground">{labels[reasoningValue] || reasoningValue}</span>
          <ChevronDown />
        </button>
      </div>
      {open && (
        <div className="absolute bottom-11 right-0 z-20 w-56 rounded-2xl border border-border bg-popover p-2 text-[11px] shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
          {modelsOpen && (
            <div
              className="absolute bottom-0 right-[calc(100%+8px)] w-64 rounded-2xl border border-border bg-popover p-2 text-[11px] shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
              onMouseEnter={() => setModelsOpen(true)}
              onMouseLeave={() => setModelsOpen(false)}
            >
              <div className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground">模型</div>
              {modelOptions.map(({ model, supplier: optionSupplier }) => (
                <button
                  key={`${optionSupplier}-${model}`}
                  className={cn(
                    "grid h-8 w-full grid-cols-[72px_minmax(0,1fr)_16px] items-center gap-2 rounded-xl px-3 text-left text-[11px] transition hover:bg-accent",
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
          <div className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground">智能</div>
          {reasoningOptions.map((option) => (
            <button
              key={option}
              className={cn(
                "flex h-8 w-full items-center justify-between rounded-xl px-3 text-[11px] transition hover:bg-accent",
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
            className="grid h-8 w-full grid-cols-[72px_minmax(0,1fr)_16px] items-center gap-2 rounded-xl bg-accent px-3 text-left text-[11px] transition hover:bg-accent"
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

function Message({ message }) {
  const isHuman = message.role === "Human";
  return (
    <article className={cn("flex flex-col gap-2", isHuman ? "items-end" : "items-start")}>
      <div className="max-w-[78%] text-xs text-muted-foreground">{isHuman ? "你" : "小星"} · {formatTime(message.created_at)}</div>
      {message.meta_data?.thinking && (
        <div className="max-w-[78%] rounded-lg border border-border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          {message.meta_data.thinking}
        </div>
      )}
      <div className={cn("max-w-[78%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-7", isHuman ? "bg-composer" : "bg-transparent")}>
        {message.content || <span className="text-muted-foreground">...</span>}
      </div>
    </article>
  );
}

function SettingsPage({ apiKey, modelCatalog, modelListStatus, onApiKeyChange, onInspectModels, onSave, settings, setSettings, status }) {
  const catalog = sanitizeModelCatalog(modelCatalog);
  const supplierOptions = Object.keys(catalog);
  const modelOptions = catalog[settings.supplier] || catalog[getFirstSupplier(catalog)] || [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-2xl font-semibold">设置</h2>
        <p className="mt-2 text-sm text-muted-foreground">保存模型参数。API Key 会写入后端环境配置。</p>

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
            <Input type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="sk-..." />
          </SettingField>
          <SettingField label="temperature">
            <input
              className="w-full accent-current"
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
          <Button onClick={onSave}>
            <Check data-icon="inline-start" />
            保存
          </Button>
          <Button variant="outline" onClick={onInspectModels}>
            测试模型列表
          </Button>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-panel p-4 text-sm">
          <StatusLine label="连接" value={status} />
          <StatusLine label="模型列表" value={modelListStatus} />
        </div>
      </div>
    </div>
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
