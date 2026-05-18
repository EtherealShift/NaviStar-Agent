import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type: "error" | "success" | "info";
}

let addToastFn: ((toast: Omit<ToastItem, "id">) => void) | null = null;

export function setAddToast(fn: (toast: Omit<ToastItem, "id">) => void) {
  addToastFn = fn;
}

export function showToast(message: string, type: ToastItem["type"] = "error") {
  if (addToastFn) {
    addToastFn({ message, type });
  }
}

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: AlertCircle,
};

const COLORS = {
  error: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171" },
  success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#4ade80" },
  info: { bg: "rgba(75,159,255,0.12)", border: "rgba(75,159,255,0.3)", text: "#4b9fff" },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  setAddToast(addToast);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          const color = COLORS[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => removeToast(toast.id)}
              className="pointer-events-auto cursor-pointer flex items-center gap-2.5 px-4 py-3 rounded-xl backdrop-blur-sm max-w-sm shadow-lg"
              style={{
                backgroundColor: color.bg,
                border: `1px solid ${color.border}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <Icon size={16} style={{ color: color.text, flexShrink: 0 }} />
              <span
                className="text-sm leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {toast.message}
              </span>
              <X size={14} className="ml-auto shrink-0" style={{ color: "var(--text-muted)" }} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
