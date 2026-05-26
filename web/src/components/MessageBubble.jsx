import { Brain, Check, Copy, Download, FileText, Table2, UserCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useEffect, useState } from 'react';
import { resolveApiUrl } from '../api/chatApi.js';
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

function formatFileSize(size) {
  if (!size || Number.isNaN(size)) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function GeneratedFileItem({ file }) {
  const [href, setHref] = useState('');

  useEffect(() => {
    let mounted = true;
    resolveApiUrl(file.downloadUrl).then((url) => {
      if (mounted) setHref(url);
    });
    return () => {
      mounted = false;
    };
  }, [file.downloadUrl]);

  return (
    <div className="generated-file">
      <div className="generated-file__icon">
        {file.extension?.toLowerCase().includes('xls') ? (
          <Table2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <FileText className="h-4 w-4" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-100">{file.name}</div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {file.extension?.toUpperCase().replace('.', '') || 'FILE'}
          {file.size ? ` · ${formatFileSize(file.size)}` : ''}
        </div>
      </div>
      <a
        href={href || '#'}
        download={file.name}
        className="generated-file__download"
        title="下载文件"
        aria-label={`下载 ${file.name}`}
        onClick={(event) => {
          if (!href) event.preventDefault();
        }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}

function GeneratedFiles({ files = [] }) {
  if (!files.length) return null;

  return (
    <div className="mt-3 flex w-full flex-col gap-2">
      {files.map((file) => (
        <GeneratedFileItem key={file.fileId} file={file} />
      ))}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyMessage = async () => {
    const copyText =
      !isUser && message.thinking
        ? `AI 思考过程:\n${message.thinking}\n\nAI 回复:\n${message.content || ''}`.trim()
        : message.content;
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
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
          {!isUser && message.thinking && (
            <details className="mb-3 rounded-xl border border-orange-400/20 bg-orange-500/10 p-3 text-sm text-orange-100">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-orange-200">
                <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                <span>AI 思考过程</span>
                <span className="ml-auto text-orange-200/60">展开/收起</span>
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-orange-100/80">
                {message.thinking}
              </p>
            </details>
          )}
          {!message.content && (message.status === 'loading' || message.status === 'streaming') ? (
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
          {!isUser && <GeneratedFiles files={message.files || []} />}
          {isUser && <GeneratedFiles files={message.attachments || message.files || []} />}
        </div>
        <div className={`mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <button
            type="button"
            onClick={copyMessage}
            disabled={!message.content && !message.thinking}
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
