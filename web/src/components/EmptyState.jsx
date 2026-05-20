import { Bot } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-8 text-center">
      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-500/15 text-teal-200 shadow-glow">
        <Bot className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-4xl font-semibold tracking-normal text-zinc-50">
        NaviStar Chat
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        在底部选择响应模式，输入问题开始对话。
      </p>
    </div>
  );
}
