import { continueRender, delayRender } from "remotion";
import { getInfo } from "@remotion/google-fonts/Cairo";

export const FONT_FAMILY =
  "'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif";

const WEIGHTS = ["400", "500", "600", "700", "800", "900"] as const;
const SUBSETS = ["arabic", "latin"] as const;
const STYLE_ID = "zof-cairo-font-faces";

let injected = false;
let fontHandle: number | null = null;

const isPlayer = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    (window as Window & { remotion_isPlayer?: boolean }).remotion_isPlayer ===
    true
  );
};

const releaseHandle = () => {
  if (fontHandle !== null) {
    continueRender(fontHandle);
    fontHandle = null;
  }
};

export const ensureCairoFont = () => {
  if (typeof document === "undefined" || injected) return;
  injected = true;

  if (!document.getElementById(STYLE_ID)) {
    const info = getInfo();
    const faces: string[] = [];

    for (const weight of WEIGHTS) {
      for (const subset of SUBSETS) {
        const src = info.fonts.normal?.[weight]?.[subset];
        if (!src) continue;
        const range = info.unicodeRanges[subset];
        faces.push(
          `@font-face{font-family:'Cairo';font-style:normal;font-weight:${weight};font-display:swap;src:url(${src}) format('woff2');${
            range ? `unicode-range:${range};` : ""
          }}`,
        );
      }
    }

    if (faces.length > 0) {
      const styleElement = document.createElement("style");
      styleElement.id = STYLE_ID;
      styleElement.textContent = faces.join("\n");
      document.head.appendChild(styleElement);
    }
  }

  if (isPlayer() || !("fonts" in document)) return;

  fontHandle = delayRender("Loading Cairo font", {
    timeoutInMilliseconds: 9000,
  });
  const timeout = setTimeout(releaseHandle, 6500);

  Promise.all([
    document.fonts.load("700 64px Cairo"),
    document.fonts.load("400 32px Cairo"),
  ])
    .catch(() => undefined)
    .then(() => {
      clearTimeout(timeout);
      releaseHandle();
    });
};
