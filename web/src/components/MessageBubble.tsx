import { memo, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Copy, Check, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Message } from "@/types";
import { stripAnswerTags } from "@/utils/api";

interface MessageBubbleProps {
  message: Message;
}

function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium mb-2 transition-colors duration-150 hover:opacity-80"
        style={{ color: "var(--accent)" }}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Brain size={13} />
        <span>思考过程</span>
        {isStreaming && (
          <span className="cursor-blink text-xs" style={{ color: "var(--accent)" }} />
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div
              className="pl-3 py-2.5 text-[13px] leading-relaxed border-l-2 rounded-r-lg"
              style={{
                borderColor: "var(--accent)",
                backgroundColor: "var(--accent-dim)",
                color: "var(--text-secondary)",
              }}
            >
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubbleInner({ message }: MessageBubbleProps) {
  const isHuman = message.role === "human";
  const [copied, setCopied] = useState(false);

  const displayContent = useMemo(() => stripAnswerTags(message.content), [message.content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isHuman) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex justify-end mb-5"
      >
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
        >
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex mb-6"
    >
      <div className="shrink-0 mr-3 mt-0.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, #3a7bd5 100%)",
          }}
        >
          <Bot size={14} className="text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0 max-w-3xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
            小星
          </span>
          {message.thinkingContent && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(168, 85, 247, 0.1)",
                color: "#a855f7",
              }}
            >
              <Brain size={9} />
              深度思考
            </span>
          )}
          {!message.thinkingContent && message.isStreaming && (
            <span className="cursor-blink text-xs" style={{ color: "var(--accent)" }} />
          )}
        </div>

        {message.thinkingContent && (
          <ThinkingBlock
            content={message.thinkingContent}
            isStreaming={message.isStreaming && !message.content}
          />
        )}

        <div className="markdown-body text-sm" style={{ color: "var(--text-primary)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayContent}
          </ReactMarkdown>
        </div>

        {message.isStreaming && displayContent && (
          <span className="cursor-blink text-xs" style={{ color: "var(--accent)" }} />
        )}

        {!message.isStreaming && displayContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1 mt-2"
          >
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg transition-all duration-150 hover:bg-[var(--bg-card)]"
              style={{ color: "var(--text-muted)" }}
            >
              {copied ? (
                <Check size={13} style={{ color: "var(--success)" }} />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(MessageBubbleInner);
