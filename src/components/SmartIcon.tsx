import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { continueRender, delayRender } from "remotion";

export type SmartIconProps = {
  query: string;
  size?: number;
  color?: string;
  brand?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

type SearchResponse = {
  icons?: unknown;
};

const ICONIFY_API = "https://api.iconify.design";
const RESOLVE_TIMEOUT_MS = 4000;
const SEARCH_LIMIT = 5;

const BRAND_PREFIXES = ["logos", "skill-icons", "simple-icons"];
const CONCEPT_PREFIXES = [
  "mdi",
  "tabler",
  "game-icons",
  "ph",
  "material-symbols",
];

const SVG_CACHE = new Map<string, string | null>();
const SEARCH_CACHE = new Map<string, string | null>();
const IN_FLIGHT = new Map<string, Promise<string | null>>();

const isRemotionPlayer = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    (window as Window & { remotion_isPlayer?: boolean }).remotion_isPlayer ===
    true
  );
};

const svgCacheKey = (
  query: string,
  brand: boolean,
  color?: string,
): string => `${brand ? "brand" : "concept"}|${color ?? ""}|${query.toLowerCase()}`;

const normalizeIconId = (value: string): string | null => {
  const trimmed = value.trim();
  const separator = trimmed.indexOf(":");
  if (separator <= 0 || separator === trimmed.length - 1) return null;
  const prefix = trimmed.slice(0, separator).trim().toLowerCase();
  const name = trimmed.slice(separator + 1).trim().toLowerCase();
  if (!prefix || !name) return null;
  return `${prefix}:${name}`;
};

const pickIcon = (icons: string[], brand: boolean): string | null => {
  const prefixes = brand ? BRAND_PREFIXES : CONCEPT_PREFIXES;
  for (const prefix of prefixes) {
    const match = icons.find((icon) => icon.startsWith(`${prefix}:`));
    if (match) return match;
  }
  const prefixed = icons.find((icon) => /^[a-z0-9-]+:[a-z0-9-]+$/i.test(icon));
  return prefixed ?? null;
};

const searchIconId = async (
  query: string,
  brand: boolean,
): Promise<string | null> => {
  const cacheKey = `${brand ? "brand" : "concept"}|${query.toLowerCase()}`;
  if (SEARCH_CACHE.has(cacheKey)) {
    return SEARCH_CACHE.get(cacheKey) ?? null;
  }

  const base = `${ICONIFY_API}/search?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`;
  const urls = brand ? [`${base}&prefix=logos`, base] : [base];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const payload = (await response.json()) as SearchResponse;
      if (!Array.isArray(payload.icons)) continue;
      const icons = payload.icons.filter(
        (icon): icon is string => typeof icon === "string",
      );
      const chosen = pickIcon(icons, brand);
      if (chosen) {
        SEARCH_CACHE.set(cacheKey, chosen);
        return chosen;
      }
    } catch {
      // Network unavailable or malformed response: try the next candidate.
    }
  }

  SEARCH_CACHE.set(cacheKey, null);
  return null;
};

const fetchIconSvg = async (
  iconId: string,
  color?: string,
): Promise<string | null> => {
  const separator = iconId.indexOf(":");
  const prefix = iconId.slice(0, separator);
  const name = iconId.slice(separator + 1);
  const colorParam = color ? `?color=${encodeURIComponent(color)}` : "";
  const url = `${ICONIFY_API}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg${colorParam}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const markup = await response.text();
    if (!markup.includes("<svg")) return null;
    return markup.trim();
  } catch {
    return null;
  }
};

const loadIconSvg = async (
  query: string,
  brand: boolean,
  color?: string,
): Promise<string | null> => {
  const cacheKey = svgCacheKey(query, brand, color);
  if (SVG_CACHE.has(cacheKey)) {
    return SVG_CACHE.get(cacheKey) ?? null;
  }

  const existing = IN_FLIGHT.get(cacheKey);
  if (existing) return existing;

  const task = (async () => {
    try {
      const iconId =
        normalizeIconId(query) ?? (await searchIconId(query, brand));
      if (!iconId) {
        SVG_CACHE.set(cacheKey, null);
        return null;
      }
      const svg = await fetchIconSvg(iconId, color);
      SVG_CACHE.set(cacheKey, svg);
      return svg;
    } catch {
      SVG_CACHE.set(cacheKey, null);
      return null;
    } finally {
      IN_FLIGHT.delete(cacheKey);
    }
  })();

  IN_FLIGHT.set(cacheKey, task);
  return task;
};

const inlineSvg = (markup: string, size: number): string => {
  const start = markup.indexOf("<svg");
  const svg = start >= 0 ? markup.slice(start) : markup;
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attributes: string) => {
    const cleaned = attributes
      .replace(/\swidth\s*=\s*"[^"]*"/i, "")
      .replace(/\sheight\s*=\s*"[^"]*"/i, "")
      .replace(/\sstyle\s*=\s*"[^"]*"/i, "");
    return `<svg${cleaned} width="${size}" height="${size}" style="display:block;width:100%;height:100%">`;
  });
};

const monogramFor = (query: string): string => {
  const words = query
    .split(/[:\s._-]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  return letters || "?";
};

export const SmartIcon = ({
  query,
  size = 48,
  color,
  brand = false,
  className,
  style,
  title,
}: SmartIconProps) => {
  const trimmed = query.trim();
  const cacheKey = svgCacheKey(trimmed, brand, color);
  const accent = color ?? "currentColor";

  const [renderHandle] = useState<{ id: number; key: string } | null>(() => {
    if (SVG_CACHE.has(cacheKey)) return null;
    if (typeof window === "undefined" || isRemotionPlayer()) return null;
    return {
      id: delayRender(`Loading smart icon: ${trimmed || "unknown"}`),
      key: cacheKey,
    };
  });

  const blockingHandle =
    renderHandle && renderHandle.key === cacheKey ? renderHandle.id : null;

  const [svg, setSvg] = useState<string | null>(
    () => SVG_CACHE.get(cacheKey) ?? null,
  );

  useEffect(() => {
    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      if (blockingHandle !== null) continueRender(blockingHandle);
    };

    const releaseAfterPaint = () => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(release));
      }
      setTimeout(release, 250);
    };

    const cached = SVG_CACHE.get(cacheKey);
    if (cached !== undefined) {
      setSvg(cached);
      releaseAfterPaint();
      return;
    }

    let cancelled = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = (result: string | null) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      if (cancelled) {
        release();
        return;
      }
      setSvg(result);
      releaseAfterPaint();
    };

    if (blockingHandle !== null) {
      timer = setTimeout(() => settle(null), RESOLVE_TIMEOUT_MS);
    }
    loadIconSvg(trimmed, brand, color).then(settle, () => settle(null));

    return () => {
      cancelled = true;
      if (!settled) {
        settled = true;
        if (timer !== null) clearTimeout(timer);
      }
      release();
    };
  }, [blockingHandle, cacheKey, trimmed, brand, color]);

  const badgeStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    border: `${Math.max(1.5, size * 0.05)}px solid ${accent}`,
    borderRadius: size * 0.24,
    color: accent,
    fontSize: size * 0.4,
    fontWeight: 700,
    lineHeight: 1,
  };

  return (
    <span
      className={className}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        lineHeight: 0,
        color: accent,
        ...style,
      }}
    >
      {svg ? (
        <span
          style={{ display: "block", width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: inlineSvg(svg, size) }}
        />
      ) : (
        <span style={badgeStyle}>{monogramFor(trimmed)}</span>
      )}
    </span>
  );
};
