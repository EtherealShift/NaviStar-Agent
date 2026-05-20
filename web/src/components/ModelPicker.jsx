import { Check, ChevronDown, Cpu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MODEL_OPTIONS = [
  'deepseek-v4-flash',
  'deepseek-v4-pro',
];

function normalizeGroups(groups) {
  if (!groups || typeof groups !== 'object') {
    return { DEFAULT: MODEL_OPTIONS };
  }

  const entries = Object.entries(groups)
    .map(([provider, models]) => [
      provider,
      Array.isArray(models) ? models.filter(Boolean) : [],
    ])
    .filter(([, models]) => models.length > 0);

  return entries.length ? Object.fromEntries(entries) : { DEFAULT: MODEL_OPTIONS };
}

export default function ModelPicker({ value, groups, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const modelGroups = normalizeGroups(groups);

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div className="model-picker" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className="model-picker__button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="选择模型"
      >
        <Cpu className="h-4 w-4 text-zinc-500" aria-hidden="true" />
        <span className="model-picker__text">{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="model-menu" role="listbox" aria-label="选择模型">
          {Object.entries(modelGroups).map(([provider, models]) => (
            <div key={provider} className="model-menu__group">
              <div className="model-menu__group-label">{provider}</div>
              {models.map((model) => {
                const selected = model === value;
                return (
                  <button
                    key={`${provider}-${model}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`model-menu__item ${selected ? 'model-menu__item--selected' : ''}`}
                    onClick={() => {
                      onChange(model);
                      setOpen(false);
                    }}
                  >
                    <span>{model}</span>
                    {selected && <Check className="h-4 w-4 text-teal-300" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
