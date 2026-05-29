import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function makeThreadId() {
  const random = Math.random().toString(16).slice(2, 8);
  return `desktop_${Date.now()}_${random}`;
}

export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function compactTitle(text) {
  const title = String(text || "").replace(/\s+/g, " ").trim();
  return title ? title.slice(0, 28) : "新对话";
}
