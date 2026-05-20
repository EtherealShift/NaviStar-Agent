import { Bot, BrainCircuit, Globe2, PanelLeftOpen, Zap } from 'lucide-react';

export default function ChatHeader({
  title,
  mode,
  networkEnabled,
  sidebarCollapsed,
  onToggleSidebar,
}) {
  return (
    <header className="app-drag flex h-[58px] shrink-0 items-center justify-between border-b border-zinc-800 bg-[#111113] pl-5 pr-[138px]">
      <div className="app-no-drag flex min-w-0 items-center gap-3">
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="cursor-pointer rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
            aria-label="展开侧边栏"
          >
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-500/15 text-teal-200">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-zinc-100">
            {title || '新对话'}
          </h2>
          <p className="truncate text-xs text-zinc-500">
            NaviStar Desktop · 本地后端接口
          </p>
        </div>
      </div>
      <div className="app-no-drag flex items-center gap-2">
        <div className="desktop-status-chip desktop-status-chip--icon" title={mode === 'deep' ? '深度思考' : '快速模式'}>
          {mode === 'deep' ? (
            <BrainCircuit className="h-3.5 w-3.5 text-orange-300" aria-hidden="true" />
          ) : (
            <Zap className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
          )}
        </div>
        <div
          className={`desktop-status-chip desktop-status-chip--icon ${networkEnabled ? 'text-teal-200' : ''}`}
          title={networkEnabled ? '联网开启' : '离线'}
        >
          <Globe2 className={`h-3.5 w-3.5 ${networkEnabled ? 'text-teal-300' : 'text-zinc-600'}`} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
