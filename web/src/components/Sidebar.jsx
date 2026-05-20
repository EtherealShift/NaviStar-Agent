import {
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Trash2,
  UserCircle,
} from 'lucide-react';

export default function Sidebar({
  collapsed,
  conversations,
  activeThreadId,
  loading,
  searchQuery,
  onToggleCollapsed,
  onCreateConversation,
  onDeleteConversation,
  onSelectConversation,
  onSearchChange,
  onOpenSettings,
}) {
  return (
    <aside
      className={`app-no-drag relative z-40 flex shrink-0 flex-col border-r border-zinc-800 bg-[#0f0f11] text-zinc-100 transition-[width] duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      <div className={`flex h-[58px] items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-glow transition-colors hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
            onClick={collapsed ? onToggleCollapsed : undefined}
            aria-label={collapsed ? '展开侧边栏' : 'NaviStar'}
          >
            N
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">NaviStar</p>
              <p className="truncate text-xs text-zinc-500">Desktop AI Agent</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`${collapsed ? 'hidden' : 'flex'} cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400`}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      <div className={`space-y-3 ${collapsed ? 'px-3' : 'px-4'}`}>
        <button
          type="button"
          onClick={onCreateConversation}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-zinc-100 transition-colors hover:border-teal-400/40 hover:bg-teal-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {!collapsed && <span>新建对话</span>}
        </button>

        {!collapsed && (
          <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-zinc-500 focus-within:border-teal-400/50">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">搜索会话</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-zinc-300 outline-none placeholder:text-zinc-600"
              placeholder="搜索历史会话"
            />
          </label>
        )}
      </div>

      <div className={`mt-4 flex-1 overflow-y-auto pb-3 ${collapsed ? 'px-3' : 'px-4'}`}>
        {!collapsed && (
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-normal text-zinc-600">
            历史会话
          </p>
        )}
        <div className="space-y-1">
          {loading && !conversations.length ? (
            <div className="px-2 py-3 text-sm text-zinc-500">正在加载...</div>
          ) : (
            conversations.length ? conversations.map((conversation) => {
              const active = conversation.thread_id === activeThreadId;
              return (
                <div
                  key={conversation.thread_id}
                  className={`group flex h-11 w-full items-center rounded-xl transition-colors ${
                    active
                      ? 'bg-teal-500/15 text-zinc-50 ring-1 ring-teal-400/25'
                      : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
                  }`}
                >
                  <button
                    type="button"
                    title={conversation.title}
                    onClick={() => onSelectConversation(conversation.thread_id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch rounded-xl px-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-teal-300' : 'bg-zinc-700'} ${collapsed ? 'mx-auto' : ''}`} />
                    {!collapsed && (
                      <span className="min-w-0 flex-1 truncate">{conversation.title || '未命名会话'}</span>
                    )}
                  </button>
                  {!collapsed && (
                    <button
                      type="button"
                      title="删除会话"
                      aria-label={`删除会话 ${conversation.title || conversation.thread_id}`}
                      onClick={() => onDeleteConversation(conversation.thread_id)}
                      className="mr-2 hidden h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300 group-hover:flex"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            }) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-zinc-500">
                未找到匹配会话
              </div>
            )
          )}
        </div>
      </div>

      <div className={`border-t border-white/10 ${collapsed ? 'p-3' : 'p-4'}`}>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <UserCircle className="h-6 w-6 shrink-0 text-zinc-400" aria-hidden="true" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-200">Local User</span>
                <span className="block truncate text-xs text-zinc-600">API connected</span>
              </span>
              <Settings className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      {collapsed && (
        <button
          type="button"
          className="absolute -right-3 top-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-zinc-300 shadow-lg transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
          onClick={onToggleCollapsed}
          aria-label="展开侧边栏"
        >
          <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
