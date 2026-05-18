import { create } from "zustand";
import type { Message, Conversation, ChatMode, FileAttachment } from "@/types";

interface ChatState {
  conversations: Conversation[];
  activeThreadId: string | null;
  messages: Message[];
  isStreaming: boolean;
  sidebarOpen: boolean;
  isNetwork: boolean;
  chatMode: ChatMode;
  attachments: FileAttachment[];

  setActiveThread: (threadId: string) => void;
  addConversation: (conv: Conversation) => void;
  removeConversation: (threadId: string) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  appendToThinkingContent: (chunk: string) => void;
  appendToLastMessage: (chunk: string) => void;
  finishStreaming: () => void;
  setIsStreaming: (v: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setIsNetwork: (v: boolean) => void;
  setChatMode: (mode: ChatMode) => void;
  addAttachment: (file: FileAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
}

const STORAGE_KEY = "agent-chat-conversations";

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: loadConversations(),
  activeThreadId: null,
  messages: [],
  isStreaming: false,
  sidebarOpen: true,
  isNetwork: false,
  chatMode: "fast",
  attachments: [],

  setActiveThread: (threadId) => set({ activeThreadId: threadId, messages: [] }),

  addConversation: (conv) => {
    const updated = [conv, ...get().conversations];
    saveConversations(updated);
    set({ conversations: updated, activeThreadId: conv.threadId, messages: [] });
  },

  removeConversation: (threadId) => {
    const updated = get().conversations.filter((c) => c.threadId !== threadId);
    saveConversations(updated);
    const state = get();
    set({
      conversations: updated,
      activeThreadId:
        state.activeThreadId === threadId
          ? updated[0]?.threadId ?? null
          : state.activeThreadId,
      messages:
        state.activeThreadId === threadId ? [] : state.messages,
    });
  },

  setMessages: (msgs) => set({ messages: msgs }),

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  appendToThinkingContent: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "ai") {
        msgs[msgs.length - 1] = {
          ...last,
          thinkingContent: (last.thinkingContent ?? "") + chunk,
        };
      }
      return { messages: msgs };
    }),

  appendToLastMessage: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "ai") {
        msgs[msgs.length - 1] = {
          ...last,
          content: last.content + chunk,
        };
      }
      return { messages: msgs };
    }),

  finishStreaming: () =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.isStreaming) {
        msgs[msgs.length - 1] = { ...last, isStreaming: false };
      }
      const activeThread = s.activeThreadId;
      const convs = s.conversations.map((c) => {
        if (c.threadId === activeThread) {
          return {
            ...c,
            lastMessage: last?.content?.slice(0, 50) ?? "",
            updatedAt: Date.now(),
          };
        }
        return c;
      });
      saveConversations(convs);
      return { messages: msgs, isStreaming: false, conversations: convs };
    }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setIsNetwork: (v) => set({ isNetwork: v }),
  setChatMode: (mode) => set({ chatMode: mode }),
  addAttachment: (file) => set((s) => ({ attachments: [...s.attachments, file] })),
  removeAttachment: (id) => set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),
  clearAttachments: () => set({ attachments: [] }),
}));
