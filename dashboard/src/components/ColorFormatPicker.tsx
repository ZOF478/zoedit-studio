import { useEffect, useState } from 'react';
import { colord } from 'colord';

export type ColorFormat = 'HEX' | 'RGB' | 'HSL';

const FORMATS: ColorFormat[] = ['HEX', 'RGB', 'HSL'];
const SWATCHES = ['#E77B40', '#1D150C', '#0B0F17', '#1A85D1', '#10B981'];

const parseColorInput = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = /^[0-9a-f]{3,8}$/i.test(trimmed) ? `#${trimmed}` : trimmed;
  const parsed = colord(normalized);
  return parsed.isValid() ? parsed.toHex().toUpperCase() : null;
};

const formatColor = (value: string, format: ColorFormat): string => {
  const parsed = colord(value);
  if (!parsed.isValid()) return value;
  if (format === 'HEX') return parsed.toHex().toUpperCase();
  if (format === 'RGB') {
    const { r, g, b } = parsed.toRgb();
    return `rgb(${r}, ${g}, ${b})`;
  }
  const { h, s, l } = parsed.toHsl();
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
};

interface ColorFormatPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function ColorFormatPicker({
  label,
  value,
  onChange,
  compact = false,
  disabled = false,
}: ColorFormatPickerProps) {
  const [format, setFormat] = useState<ColorFormat>('HEX');
  const [draft, setDraft] = useState(() => formatColor(value, 'HEX'));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatColor(value, format));
  }, [value, format, focused]);

  const parsedValue = colord(value);
  const colorInputValue = parsedValue.isValid() ? parsedValue.toHex() : '#000000';

  const handleFormat = (next: ColorFormat) => {
    setFormat(next);
    setDraft(formatColor(value, next));
  };

  const commitDraft = () => {
    const parsed = parseColorInput(draft);
    if (parsed) {
      onChange(parsed);
      setDraft(formatColor(parsed, format));
    } else {
      setDraft(formatColor(value, format));
    }
  };

  return (
    <div
      className={`min-w-0 rounded-lg border border-white/10 bg-[#0B0E14] ${
        compact ? 'space-y-1.5 p-1.5' : 'space-y-2 p-2.5'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span
          className={`min-w-0 truncate font-semibold text-slate-300 ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {label}
        </span>
        <div
          className="inline-flex shrink-0 rounded-md border border-white/10 bg-[#10141D] p-0.5"
          dir="ltr"
        >
          {FORMATS.map((option) => {
            const active = format === option;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => handleFormat(option)}
                aria-pressed={active}
                className={`rounded font-mono font-bold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
                } ${
                  active
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/20">
          <span
            className="absolute inset-0"
            style={{ backgroundColor: parsedValue.isValid() ? parsedValue.toHex() : '#000000' }}
          />
          <input
            type="color"
            value={colorInputValue}
            disabled={disabled}
            onChange={(event) => {
              const parsed = parseColorInput(event.target.value);
              if (parsed) {
                onChange(parsed);
                setDraft(formatColor(parsed, format));
              }
            }}
            aria-label={label}
            className="relative h-6 w-6 cursor-pointer border-0 bg-transparent p-0 opacity-0 disabled:cursor-not-allowed"
          />
        </span>
        <input
          type="text"
          dir="ltr"
          value={draft}
          spellCheck={false}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const parsed = parseColorInput(next);
            if (parsed) onChange(parsed);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitDraft();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className={`min-w-0 flex-1 rounded-md border border-white/10 bg-[#10141D] px-2 font-mono text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
            compact ? 'py-1 text-[9px]' : 'py-1.5 text-[10px]'
          }`}
        />
      </div>

      <div className="flex min-w-0 items-center gap-1">
        {SWATCHES.map((swatch) => {
          const active = parsedValue.isValid() && parsedValue.toHex() === colord(swatch).toHex();
          return (
            <button
              key={swatch}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(swatch);
                setDraft(formatColor(swatch, format));
              }}
              title={swatch}
              aria-label={`${label} ${swatch}`}
              aria-pressed={active}
              className={`rounded-full border transition-transform cursor-pointer hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 ${
                compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
              } ${active ? 'border-white ring-2 ring-sky-400/70' : 'border-white/25'}`}
              style={{ backgroundColor: swatch }}
            />
          );
        })}
      </div>
    </div>
  );
}
