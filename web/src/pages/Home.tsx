import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { sendMessage, fetchThreadHistory } from "@/utils/api";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";

export default function Home() {
  const {
    activeThreadId,
    messages,
    isNetwork,
    chatMode,
    addMessage,
    appendToThinkingContent,
    appendToLastMessage,
    finishStreaming,
    setIsStreaming,
    setMessages,
    conversations,
    setIsNetwork,
    setChatMode,
  } = useChatStore();

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(false);

  useEffect(() => {
    if (activeThreadId && !loadingRef.current) {
      loadingRef.current = true;
      fetchThreadHistory(activeThreadId)
        .then((msgs) => {
          if (msgs.length > 0) {
            setMessages(msgs);
          }
        })
        .finally(() => {
          loadingRef.current = false;
        });
    }
  }, [activeThreadId, setMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      let threadId = activeThreadId;
      const isNewThread = !threadId;

      if (isNewThread) {
        threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      const currentAttachments = useChatStore.getState().attachments;
      const displayContent = (() => {
        let content = text;
        if (currentAttachments.length > 0) {
          const fileLinks = currentAttachments
            .map((a) => `[${a.filename}](${a.accessUrl})`)
            .join("\n");
          content = text ? `${text}\n\n${fileLinks}` : fileLinks;
        }
        return content || "（发送了附件）";
      })();

      addMessage({
        id: `msg-${Date.now()}-human`,
        role: "human",
        content: displayContent,
      });

      addMessage({
        id: `msg-${Date.now()}-ai`,
        role: "ai",
        content: "",
        isStreaming: true,
        thinkingContent: chatMode === "thinking" ? "" : undefined,
      });

      if (isNewThread) {
        useChatStore.setState({
          activeThreadId: threadId,
          conversations: [
            {
              threadId,
              title: text.slice(0, 30) + (text.length > 30 ? "..." : ""),
              lastMessage: text,
              updatedAt: Date.now(),
              isNetwork,
              isThinking: chatMode === "thinking",
            },
            ...conversations,
          ],
        });
        localStorage.setItem(
          "agent-chat-conversations",
          JSON.stringify(useChatStore.getState().conversations)
        );
      } else {
        const conv = conversations.find((c) => c.threadId === threadId);
        if (conv && conv.title === "新对话") {
          const updated = conversations.map((c) =>
            c.threadId === threadId
              ? { ...c, title: text.slice(0, 30) + (text.length > 30 ? "..." : "") }
              : c
          );
          useChatStore.setState({ conversations: updated });
          localStorage.setItem("agent-chat-conversations", JSON.stringify(updated));
        }
      }

      setIsStreaming(true);

      await sendMessage(
        {
          message: text,
          thread_id: threadId,
          is_network: isNetwork,
          is_thinking: chatMode === "thinking",
          attachments: currentAttachments.map((a) => ({
            filename: a.filename,
            content_type: a.contentType,
            access_url: a.accessUrl,
            size: a.size,
          })),
        },
        (chunk) => {
          if (chunk.type === "thinking") {
            appendToThinkingContent(chunk.content);
          } else {
            appendToLastMessage(chunk.content);
          }
        },
        () => {
          finishStreaming();
        },
        (err) => {
          appendToLastMessage(`\n\n⚠️ 错误: ${err}`);
          finishStreaming();
        }
      );
    },
    [activeThreadId, isNetwork, chatMode, conversations, addMessage, appendToThinkingContent, appendToLastMessage, finishStreaming, setIsStreaming]
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend]
  );

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Sidebar />
      <ChatArea
        messages={messages}
        onSend={handleSend}
        onSuggestionClick={handleSuggestionClick}
        isNetwork={isNetwork}
        setIsNetwork={setIsNetwork}
        chatMode={chatMode}
        setChatMode={setChatMode}
      />
    </div>
  );
}
