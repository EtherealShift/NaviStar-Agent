import { useState, useRef, useEffect, useId } from "react";
import { Send, Loader2, Globe, Zap, Brain, Paperclip, X, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chatStore";
import { uploadFile } from "@/utils/api";
import { showToast } from "@/components/Toast";
import type { ChatMode, FileAttachment } from "@/types";

interface InputAreaProps {
  onSend: (text: string) => void;
  isNetwork: boolean;
  setIsNetwork: (v: boolean) => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(ct: string): boolean {
  return ct.startsWith("image/");
}

function AttachmentPreview({ file, onRemove }: { file: FileAttachment; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative group flex items-center gap-2 px-2.5 py-2 rounded-lg"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {isImageType(file.contentType) ? (
        <div className="w-8 h-8 rounded overflow-hidden shrink-0">
          <img src={file.accessUrl} alt={file.filename} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-8 h-8 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--accent-dim)" }}
        >
          <FileText size={14} style={{ color: "var(--accent)" }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {file.filename}
        </div>
        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {formatSize(file.size)}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
        style={{ color: "var(--text-muted)" }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

export default function InputArea({ onSend, isNetwork, setIsNetwork, chatMode, setChatMode }: InputAreaProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const attachments = useChatStore((s) => s.attachments);
  const addAttachment = useChatStore((s) => s.addAttachment);
  const removeAttachment = useChatStore((s) => s.removeAttachment);
  const clearAttachments = useChatStore((s) => s.clearAttachments);
  const inputId = useId();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleSend = () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isStreaming) return;
    onSend(text);
    setInput("");
    clearAttachments();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadFile(files[i]);
        addAttachment(result);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "上传失败", "error");
      }
    }
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canSend = (input.trim() || attachments.length > 0) && !isStreaming;

  return (
    <div
      className="px-4 pb-4 pt-2"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-2xl border transition-all duration-300 overflow-hidden"
          style={{
            backgroundColor: "var(--bg-input)",
            borderColor: canSend ? "var(--accent)" : "var(--border)",
            boxShadow: canSend
              ? "0 0 0 1px var(--accent), 0 0 20px rgba(75, 159, 255, 0.06)"
              : "none",
          }}
        >
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                  {attachments.map((file) => (
                    <AttachmentPreview
                      key={file.id}
                      file={file}
                      onRemove={() => removeAttachment(file.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 pt-3 pb-1">
            <textarea
              id={inputId}
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="给小星发送消息..."
              rows={1}
              disabled={isStreaming}
              className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
              style={{
                color: "var(--text-primary)",
                maxHeight: 150,
              }}
            />
          </div>

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <div
                className="inline-flex items-center rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setChatMode("fast")}
                  className="flex items-center justify-center p-2 transition-all duration-200"
                  style={{
                    backgroundColor: chatMode === "fast" ? "var(--accent-dim)" : "transparent",
                    color: chatMode === "fast" ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  <motion.div
                    animate={chatMode === "fast" ? {
                      filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                      scale: [1, 1.15, 1],
                    } : {}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Zap size={14} />
                  </motion.div>
                </button>
                <button
                  onClick={() => setChatMode("thinking")}
                  className="flex items-center justify-center p-2 transition-all duration-200"
                  style={{
                    backgroundColor: chatMode === "thinking" ? "rgba(168, 85, 247, 0.1)" : "transparent",
                    color: chatMode === "thinking" ? "#a855f7" : "var(--text-muted)",
                  }}
                >
                  <motion.div
                    animate={chatMode === "thinking" ? {
                      filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
                      scale: [1, 1.15, 1],
                    } : {}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Brain size={14} />
                  </motion.div>
                </button>
              </div>

              <motion.button
                onClick={() => setIsNetwork(!isNetwork)}
                className="relative p-2 rounded-lg transition-all duration-200"
                style={{
                  color: isNetwork ? "var(--accent)" : "var(--text-muted)",
                  backgroundColor: isNetwork ? "var(--accent-dim)" : "transparent",
                }}
                whileTap={{ scale: 0.9 }}
              >
                <Globe size={16} />
                {isNetwork && (
                  <motion.span
                    className="absolute inset-0 rounded-lg"
                    style={{ border: "1.5px solid var(--accent)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </motion.button>
            </div>

            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
              />
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isStreaming}
                className="p-2 rounded-lg transition-all duration-200 disabled:opacity-40"
                style={{
                  color: attachments.length > 0 ? "var(--accent)" : "var(--text-muted)",
                  backgroundColor: attachments.length > 0 ? "var(--accent-dim)" : "transparent",
                }}
                whileTap={{ scale: 0.9 }}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}
              </motion.button>

              <motion.button
                onClick={handleSend}
                disabled={!canSend}
                className="p-2 rounded-xl transition-all duration-200 disabled:opacity-25"
                style={{
                  backgroundColor: canSend ? "var(--accent)" : "var(--bg-card)",
                  color: canSend ? "#fff" : "var(--text-muted)",
                }}
                whileTap={canSend ? { scale: 0.9 } : {}}
              >
                {isStreaming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        <div className="text-center mt-2.5">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            小星可能会犯错，请核实重要信息
          </span>
        </div>
      </div>
    </div>
  );
}
