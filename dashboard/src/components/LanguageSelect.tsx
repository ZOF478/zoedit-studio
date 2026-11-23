import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Languages, Search } from "lucide-react";
import { useI18n } from "../i18n";
import {
  formatVideoLanguageLabel,
  getVideoLanguage,
  searchVideoLanguages,
} from "../types/languages";

interface LanguageSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
}: LanguageSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = getVideoLanguage(value);
  const results = useMemo(() => searchVideoLanguages(query), [query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const timer = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  const selectLanguage = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      selectLanguage(results[0].code);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("لغة الفيديو", "Video language")}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#10141D] px-2.5 py-1.5 text-start text-[11px] text-slate-100 transition-colors hover:border-sky-400/40 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          <span className="truncate font-semibold">
            {formatVideoLanguageLabel(selected.code)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate-400">
            {selected.dir}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-sky-400/30 bg-[#0B0E14] shadow-2xl shadow-black/60">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t(
                "ابحث بالاسم الإنجليزي أو الأصلي…",
                "Search by English or native name…",
              )}
              className="w-full bg-transparent text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-[11px] text-slate-500">
                {t("لا توجد لغة مطابقة.", "No matching language.")}
              </li>
            ) : (
              results.map((language) => {
                const active = language.code === selected.code;
                return (
                  <li key={language.code} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => selectLanguage(language.code)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-start text-[11px] transition-colors cursor-pointer ${
                        active
                          ? "bg-sky-500/15 text-sky-100"
                          : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {formatVideoLanguageLabel(language.code)}
                      </span>
                      {active ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
