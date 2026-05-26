import {
  BrainCircuit,
  Eraser,
  Gauge,
  Globe2,
  Network,
  Paperclip,
  SendHorizontal,
  Square,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import ModelPicker from './ModelPicker.jsx';

function formatFileSize(size) {
  if (!size || Number.isNaN(size)) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function ChatInput({
  value,
  disabled,
  sending,
  uploading,
  attachments = [],
  mode,
  networkEnabled,
  temperature,
  modelName,
  modelGroups,
  onChange,
  onClear,
  onSubmit,
  onStop,
  onUploadFiles,
  onRemoveFile,
  onModeChange,
  onNetworkChange,
  onTemperatureChange,
  onModelChange,
}) {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !sending && !disabled && !uploading;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [value]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <footer className="shrink-0 border-t border-zinc-800 bg-[#17171a] px-6 py-4">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-white/10 bg-[#202024] p-3 shadow-2xl shadow-black/25 transition-colors focus-within:border-teal-400/60">
          <label htmlFor="chat-input" className="sr-only">
            输入消息
          </label>
          {attachments.length > 0 && (
            <div className="input-attachments" aria-label="已选择附件">
              {attachments.map((file) => (
                <div className="input-attachment" key={file.fileId}>
                  <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  {file.size ? <span className="shrink-0 text-zinc-500">{formatFileSize(file.size)}</span> : null}
                  <button
                    type="button"
                    className="input-attachment__remove"
                    title="移除附件"
                    aria-label={`移除附件 ${file.name}`}
                    onClick={() => onRemoveFile(file.fileId)}
                    disabled={sending}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={value}
            disabled={disabled || uploading}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uploading ? '附件上传中...' : '输入消息，Enter 发送，Shift + Enter 换行'}
            className="max-h-36 min-h-14 w-full resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pr-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                tabIndex={-1}
                onChange={(event) => {
                  onUploadFiles?.(event.target.files);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                title={uploading ? '正在上传' : '添加附件'}
                aria-label={uploading ? '正在上传' : '添加附件'}
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || uploading || disabled}
                className={`desktop-icon-button desktop-icon-button--framed ${attachments.length ? 'desktop-toggle--active' : ''}`}
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  title="快速模式"
                  aria-label="快速模式"
                  onClick={() => onModeChange('fast')}
                  className={`desktop-icon-button ${mode === 'fast' ? 'desktop-segment--active' : ''}`}
                >
                  <Zap className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="深度思考"
                  aria-label="深度思考"
                  onClick={() => onModeChange('deep')}
                  className={`desktop-icon-button ${mode === 'deep' ? 'desktop-segment--active-deep' : ''}`}
                >
                  <BrainCircuit className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                title={networkEnabled ? '关闭联网' : '开启联网'}
                aria-label={networkEnabled ? '关闭联网' : '开启联网'}
                onClick={() => onNetworkChange(!networkEnabled)}
                className={`desktop-icon-button desktop-icon-button--framed ${networkEnabled ? 'desktop-toggle--active' : ''}`}
                aria-pressed={networkEnabled}
              >
                {networkEnabled ? <Globe2 className="h-4 w-4" /> : <Network className="h-4 w-4" />}
              </button>

              <label className="desktop-temp-control">
                <Gauge className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                <span>温度 {temperature.toFixed(1)}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  disabled={sending}
                  onChange={(event) => onTemperatureChange(Number(event.target.value))}
                  className="desktop-range"
                  aria-label="模型温度"
                />
              </label>

              <ModelPicker
                value={modelName}
                groups={modelGroups}
                disabled={sending}
                onChange={onModelChange}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                disabled={(!value && !attachments.length) || sending}
                title="清空输入"
                aria-label="清空输入"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Eraser className="h-4 w-4" aria-hidden="true" />
              </button>
              {sending ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-500 max-sm:flex-1 max-sm:justify-center"
                >
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  停止
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSend}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-medium text-white shadow-glow transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500 disabled:shadow-none max-sm:flex-1 max-sm:justify-center"
                >
                  <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                  发送
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
