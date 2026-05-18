import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  Globe,
  Search,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  User,
  Trash2,
  Settings,
} from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { deleteThread } from "@/utils/api";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ConvItem {
  threadId: string;
  title: string;
  isNetwork?: boolean;
  updatedAt: number;
}

function groupConversations(convs: ConvItem[]) {
  const now = Date.now();
  const dayMs = 86400000;

  const today: ConvItem[] = [];
  const yesterday: ConvItem[] = [];
  const week: ConvItem[] = [];
  const older: ConvItem[] = [];

  convs.forEach((c) => {
    const diff = now - c.updatedAt;
    if (diff < dayMs) today.push(c);
    else if (diff < dayMs * 2) yesterday.push(c);
    else if (diff < dayMs * 7) week.push(c);
    else older.push(c);
  });

  const groups: { label: string; items: ConvItem[] }[] = [];
  if (today.length) groups.push({ label: "今天", items: today });
  if (yesterday.length) groups.push({ label: "昨天", items: yesterday });
  if (week.length) groups.push({ label: "近7天", items: week });
  if (older.length) groups.push({ label: "更早", items: older });
  return groups;
}

export default function Sidebar() {
  const {
    conversations,
    activeThreadId,
    sidebarOpen,
    setActiveThread,
    removeConversation,
    toggleSidebar,
  } = useChatStore();

  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNew = useCallback(() => {
    useChatStore.setState({ activeThreadId: null, messages: [] });
  }, []);

  const handleSelect = useCallback(
    (threadId: string) => {
      setActiveThread(threadId);
    },
    [setActiveThread]
  );

  const handleDelete = useCallback(
    async (threadId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleting(threadId);
      await deleteThread(threadId);
      removeConversation(threadId);
      setDeleting(null);
    },
    [removeConversation]
  );

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((c) => c.title.toLowerCase().includes(q));
  }, [sorted, searchQuery]);

  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-screen flex flex-col overflow-hidden shrink-0 relative"
            style={{ backgroundColor: "var(--bg-sidebar)" }}
          >
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleNew}
                  className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
                    color: "#fff",
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  新对话
                </button>
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-card)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <PanelLeftClose size={17} />
                </button>
              </div>

              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <Search size={14} style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索对话..."
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {groups.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <MessageSquare size={24} style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {searchQuery ? "未找到匹配对话" : "暂无对话"}
                  </span>
                </div>
              )}
              {groups.map((group) => (
                <div key={group.label} className="mb-2">
                  <div
                    className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group.label}
                  </div>
                  {group.items.map((conv) => {
                    const isActive = activeThreadId === conv.threadId;
                    const isHovered = hoveredId === conv.threadId;
                    return (
                      <motion.div
                        key={conv.threadId}
                        onClick={() => handleSelect(conv.threadId)}
                        onMouseEnter={() => setHoveredId(conv.threadId)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 mb-0.5 relative"
                        style={{
                          backgroundColor: isActive
                            ? "var(--bg-card)"
                            : isHovered
                            ? "var(--bg-card-hover)"
                            : "transparent",
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                            style={{ backgroundColor: "var(--accent)" }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                        {conv.isNetwork ? (
                          <Globe size={14} className="shrink-0" style={{ color: "var(--accent)" }} />
                        ) : (
                          <MessageSquare
                            size={14}
                            className="shrink-0"
                            style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
                          />
                        )}
                        <span
                          className="flex-1 truncate text-[13px]"
                          style={{
                            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {conv.title}
                        </span>
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.12 }}
                              className="flex items-center shrink-0"
                            >
                              <button
                                onClick={(e) => handleDelete(conv.threadId, e)}
                                className="p-1 rounded-md transition-colors duration-100 hover:bg-[var(--bg-card)]"
                                style={{ color: "var(--text-muted)" }}
                                disabled={deleting === conv.threadId}
                              >
                                <Trash2 size={12} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-3 px-4 py-3 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
                }}
              >
                <User size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  用户
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  免费版
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-card)]"
                style={{ color: "var(--text-muted)" }}
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!sidebarOpen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed top-3 left-3 z-50 flex items-center gap-1 p-1.5 rounded-2xl"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <motion.button
            onClick={toggleSidebar}
            className="p-2 rounded-xl transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
            style={{ color: "var(--text-secondary)" }}
            whileTap={{ scale: 0.9 }}
          >
            <PanelLeft size={16} />
          </motion.button>
          <motion.button
            onClick={handleNew}
            className="p-2 rounded-xl transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
            style={{ color: "var(--text-secondary)" }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus size={16} />
          </motion.button>
          <motion.button
            onClick={() => navigate("/mcp")}
            className="p-2 rounded-xl transition-colors duration-150 hover:bg-[var(--bg-card-hover)]"
            style={{ color: "var(--text-secondary)" }}
            whileTap={{ scale: 0.9 }}
          >
            <Settings size={16} />
          </motion.button>
        </motion.div>
      )}
    </>
  );
}
