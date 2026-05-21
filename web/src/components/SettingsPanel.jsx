import { Check, Eye, EyeOff, KeyRound, Search, Server, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';

function secretValue(value) {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

export default function SettingsPanel({
  open,
  loading,
  saving,
  settings,
  onClose,
  onReload,
  onSave,
}) {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [mcpConfigText, setMcpConfigText] = useState('{\n  "mcpServers": {}\n}');
  const [activeTab, setActiveTab] = useState('keys');
  const [jsonError, setJsonError] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeepseekKey(settings?.providers?.DEEPSEEK?.api_key || '');
    setTavilyKey(settings?.tools?.TAVILY?.api_key || '');
    setMcpConfigText(JSON.stringify(settings?.mcp?.config || { mcpServers: {} }, null, 2));
    setJsonError('');
  }, [open, settings]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    let mcpConfig;
    try {
      mcpConfig = JSON.parse(mcpConfigText || '{}');
      setJsonError('');
    } catch (err) {
      setJsonError(err.message || 'JSON 格式错误');
      return;
    }

    onSave({
      providers: {
        DEEPSEEK: { api_key: deepseekKey },
      },
      tools: {
        TAVILY: { api_key: tavilyKey },
      },
      mcp: {
        config: mcpConfig,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4">
      <section className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#1d1d21] shadow-2xl shadow-black/50">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-200">
              <Settings className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">设置</h2>
              <p className="truncate text-xs text-zinc-500">{settings?.env_path || '系统配置目录 .env'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="desktop-icon-button"
            aria-label="关闭设置"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-5 px-5 py-5">
          <div className="settings-tabs" role="tablist" aria-label="设置分类">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'keys'}
              onClick={() => setActiveTab('keys')}
              className="settings-tab"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              API Key
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'mcp'}
              onClick={() => setActiveTab('mcp')}
              className="settings-tab"
            >
              <Server className="h-4 w-4" aria-hidden="true" />
              MCP
              {settings?.mcp?.server_count ? (
                <span className="settings-tab__badge">{settings.mcp.server_count}</span>
              ) : null}
            </button>
          </div>

          {activeTab === 'keys' ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">API Key 配置</p>
                  <p className="mt-1 text-xs text-zinc-500">保存后立即写入当前环境配置目录，并对后续请求生效。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecrets((value) => !value)}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSecrets ? '隐藏' : '显示'}
                </button>
              </div>

              <label className="settings-field">
                <span className="settings-field__label">
                  <KeyRound className="h-4 w-4 text-teal-300" aria-hidden="true" />
                  DeepSeek API Key
                </span>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={deepseekKey}
                  onChange={(event) => setDeepseekKey(event.target.value)}
                  placeholder={secretValue(settings?.providers?.DEEPSEEK?.api_key) || 'sk-...'}
                  className="settings-field__input"
                  autoComplete="off"
                />
              </label>

              <label className="settings-field">
                <span className="settings-field__label">
                  <Search className="h-4 w-4 text-orange-300" aria-hidden="true" />
                  Tavily API Key
                </span>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={tavilyKey}
                  onChange={(event) => setTavilyKey(event.target.value)}
                  placeholder={secretValue(settings?.tools?.TAVILY?.api_key) || 'tvly-...'}
                  className="settings-field__input"
                  autoComplete="off"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">MCP 工具配置</p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {settings?.mcp?.path || 'mcp_tools.json'}
                </p>
              </div>
              <label className="settings-field">
                <span className="settings-field__label">
                  <Server className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  mcpServers JSON
                </span>
                <textarea
                  value={mcpConfigText}
                  onChange={(event) => setMcpConfigText(event.target.value)}
                  spellCheck={false}
                  className="settings-field__textarea"
                />
              </label>
              {jsonError ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {jsonError}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-6 text-zinc-500">
                  示例：`mcpServers` 下每个 key 是服务名，`type: streamable_http` 会自动转换为 LangChain MCP 的 `transport: http`。
                </div>
              )}
            </div>
          )}

          <footer className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onReload}
              disabled={loading || saving}
              className="h-9 cursor-pointer rounded-xl px-3 text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '读取中...' : '重新读取'}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 cursor-pointer rounded-xl px-4 text-sm text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
