import { Check, Copy, UserCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import LoadingDots from './LoadingDots.jsx';

function AssistantAvatar() {
  return (
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-glow">
      N
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-700 text-zinc-100">
      <UserCircle className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

function CodeBlock({ inline, className, children, node: _node, ...props }) {
  const [copied, setCopied] = useState(false);
  const code = String(children || '').replace(/\n$/, '');
  const language = /language-(\w+)/.exec(className || '')?.[1];
  const isInlineCode = inline ?? (!className && !code.includes('\n'));

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  if (isInlineCode) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="code-frame">
      <div className="code-frame__bar">
        <span>{language || 'code'}</span>
        <button type="button" onClick={copyCode} className="code-frame__copy">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyMessage = async () => {
    if (!message.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <article className={`group flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <AssistantAvatar />}
      <div className={`flex max-w-[min(860px,78%)] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'rounded-tr-md bg-teal-700 text-white'
              : message.status === 'error'
                ? 'rounded-tl-md border border-red-400/30 bg-red-500/10 text-red-100'
                : 'rounded-tl-md border border-white/10 bg-[#242428] text-zinc-100'
          }`}
        >
          {message.thinking && (
            <details className="mb-3 rounded-xl border border-orange-400/20 bg-orange-500/10 p-3 text-sm text-orange-100">
              <summary className="cursor-pointer text-xs font-medium text-orange-200">深度思考过程</summary>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-orange-100/80">{message.thinking}</p>
            </details>
          )}
          {message.status === 'loading' && !message.content ? (
            <div className="flex h-7 items-center text-zinc-400">
              <LoadingDots />
            </div>
          ) : (
            <div className={`markdown-body ${isUser ? 'markdown-user' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ children }) => children,
                  code: CodeBlock,
                }}
              >
                {message.content || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className={`mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <button
            type="button"
            onClick={copyMessage}
            disabled={!message.content}
            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
      {isUser && <UserAvatar />}
    </article>
  );
}
