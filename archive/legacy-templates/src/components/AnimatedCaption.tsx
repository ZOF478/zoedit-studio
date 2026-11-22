import {
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Layout } from "../layout";
import { alpha, type Theme } from "../theme";
import type { CaptionAnimationStyle } from "../types";
import type { WcagPalette } from "../utils/wcagPalette";

const RTL_CHARS = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

const isRtlText = (words: string[]): boolean => {
  if (words.length === 0) {
    return false;
  }
  const rtlCount = words.filter((word) => RTL_CHARS.test(word)).length;
  return rtlCount > words.length / 2;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const HARD_STOP = /[.!?؟…]$/;
const SOFT_STOP = /[,،;؛:]$/;

const wordWeight = (word: string): number => {
  const letters = word.replace(/[^\w\u0600-\u06FF]/g, "").length;
  let weight = 1 + Math.min(letters, 12) / 16;
  if (HARD_STOP.test(word)) weight += 0.85;
  else if (SOFT_STOP.test(word)) weight += 0.35;
  if (word.length > 8) weight += 0.2;
  return weight;
};

type Chunk = {
  start: number;
  end: number;
};

const buildChunks = (wordCount: number, size: number): Chunk[] => {
  const chunks: Chunk[] = [];
  for (let start = 0; start < wordCount; start += size) {
    chunks.push({ start, end: Math.min(wordCount, start + size) });
  }
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1];
    if (last.end - last.start < 2) {
      const previous = chunks[chunks.length - 2];
      previous.end = last.end;
      chunks.pop();
    }
  }
  return chunks;
};

type AnimatedCaptionProps = {
  text?: string;
  language: string;
  theme: Theme;
  layout: Layout;
  durationInFrames: number;
  audioDuration?: number;
  rtl?: boolean;
  animationStyle?: CaptionAnimationStyle;
  wordsPerScreen?: number | "auto";
  leadIn?: number;
  wcag?: WcagPalette;
};

export const AnimatedCaption = ({
  text,
  language,
  theme,
  layout,
  durationInFrames,
  audioDuration,
  rtl,
  animationStyle = "auto",
  wordsPerScreen = "auto",
  leadIn,
  wcag,
}: AnimatedCaptionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return null;
  }

  const direction =
    rtl ?? (language.match(/^(ar|fa|ur|he|yi)/) ? true : isRtlText(words));
  const fontSize = Math.round(
    layout.isWide ? layout.width * 0.023 : layout.width * 0.04,
  );
  const sceneSeconds = durationInFrames / fps;
  const audioSeconds =
    typeof audioDuration === "number" && Number.isFinite(audioDuration)
      ? audioDuration
      : 0;
  const hasMeasuredAudio = audioSeconds > 0.4;
  const leadInSeconds = Math.max(
    0.2,
    typeof leadIn === "number" && Number.isFinite(leadIn) ? leadIn : 0.2,
  );
  const startSeconds = Math.min(leadInSeconds, Math.max(0, sceneSeconds - 0.4));
  const endSeconds = hasMeasuredAudio
    ? Math.max(
        startSeconds + 0.45,
        Math.min(audioSeconds - 0.06, sceneSeconds - 0.12),
      )
    : Math.max(startSeconds + 0.6, sceneSeconds - 0.18);

  const weights = words.map(wordWeight);
  const totalWeight = weights.reduce((total, value) => total + value, 0) || 1;
  const speechSpan = Math.max(0.2, endSeconds - startSeconds);
  let cursor = startSeconds;
  const wordStarts = weights.map((weight) => {
    const at = cursor;
    cursor += (weight / totalWeight) * speechSpan;
    return at;
  });
  const wordEnds = wordStarts.map((start, index) =>
    index === words.length - 1 ? endSeconds : wordStarts[index + 1],
  );

  const autoChunkSize =
    words.length <= 4
      ? words.length
      : words.some((word) => word.length > 10)
        ? 2
        : words.length > 16
          ? 3
          : 4;
  const requestedChunk =
    typeof wordsPerScreen === "number"
      ? wordsPerScreen
      : Number.parseInt(String(wordsPerScreen), 10);
  const chunkSize = clamp(
    Number.isFinite(requestedChunk) && requestedChunk > 0
      ? requestedChunk
      : autoChunkSize,
    2,
    5,
  );
  const chunks = buildChunks(words.length, chunkSize);

  const time = frame / fps;
  const firstChunkStart = wordStarts[chunks[0].start];
  if (time < firstChunkStart) {
    return null;
  }

  let activeChunkIndex = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    if (time >= wordStarts[chunks[index].start] - 0.001) {
      activeChunkIndex = index;
    }
  }
  const activeChunk = chunks[activeChunkIndex];
  const chunkStartSeconds = wordStarts[activeChunk.start];

  let activeWord = activeChunk.start;
  for (let index = activeChunk.start; index < activeChunk.end; index += 1) {
    if (time >= wordStarts[index] - 0.001) {
      activeWord = index;
    }
  }

  const resolvedStyle: Exclude<CaptionAnimationStyle, "auto"> =
    animationStyle && animationStyle !== "auto"
      ? animationStyle
      : chunkSize >= 4
        ? "dynamic_karaoke"
        : "word_pop_glow";

  const chunkEnter = spring({
    frame: frame - Math.round(chunkStartSeconds * fps),
    fps,
    config: { damping: 18, mass: 0.5, stiffness: 170 },
  });
  const chunkEase = clamp(chunkEnter, 0, 1);
  const accent = wcag?.captionHighlight ?? theme.caption.highlight;
  const captionText = wcag?.captionText ?? theme.caption.text;
  const captionBackground = wcag?.captionBg ?? theme.caption.background;
  const chunkText = words
    .slice(activeChunk.start, activeChunk.end)
    .join(" ");

  const containerBackground =
    resolvedStyle === "dynamic_karaoke"
      ? "transparent"
      : captionBackground;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: Math.round(layout.padding * 0.7),
        display: "flex",
        justifyContent: "center",
        paddingLeft: layout.padding,
        paddingRight: layout.padding,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div
        dir={direction ? "rtl" : "ltr"}
        style={{
          maxWidth: layout.isWide ? "78%" : "90%",
          background: containerBackground,
          borderRadius: Math.max(14, theme.radius * 0.8),
          border: `1.5px solid ${accent}`,
          boxShadow:
            resolvedStyle === "dynamic_karaoke"
              ? `0 10px 34px rgba(0, 0, 0, 0.28)`
              : `0 16px 44px rgba(0, 0, 0, 0.34), 0 0 28px ${alpha(accent, 0.2)}`,
          backdropFilter: "blur(16px)",
          padding: `${Math.round(fontSize * 0.36)}px ${Math.round(
            fontSize * 0.62,
          )}px`,
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: "center",
          alignItems: "center",
          gap: `${Math.round(fontSize * 0.16)}px`,
          fontFamily: theme.fontFamily,
          opacity: chunkEase,
          transform: `translateY(${(1 - chunkEase) * 16}px) scale(${
            0.94 + chunkEase * 0.06
          })`,
          minHeight: Math.round(fontSize * 1.9),
        }}
      >
        {words.slice(activeChunk.start, activeChunk.end).map((word, offset) => {
          const index = activeChunk.start + offset;
          const wordStart = wordStarts[index];
          const wordEnd = wordEnds[index];
          const isActive = index === activeWord;
          const wordEnter = spring({
            frame: frame - Math.round(wordStart * fps),
            fps,
            config: { damping: 16, mass: 0.45, stiffness: 190 },
          });
          const wordEase = clamp(wordEnter, 0, 1);
          const wordProgress = clamp(
            (time - wordStart) / Math.max(0.08, wordEnd - wordStart),
            0,
            1,
          );
          const proximity = clamp(1 - Math.abs(time - wordStart) * 2.4, 0, 1);

          const highlightBackground =
            isActive && (resolvedStyle === "word_pop_glow")
              ? accent
              : "transparent";
          const highlightColor = isActive ? accent : captionText;

          const baseStyle = {
            display: "inline-block",
            fontSize:
              resolvedStyle === "smooth_chunk_slide"
                ? fontSize
                : Math.round(fontSize * 1.04),
            fontWeight: isActive ? 900 : 750,
            lineHeight: 1.2,
            padding: `${Math.round(fontSize * 0.05)}px ${Math.round(
              fontSize * 0.16,
            )}px`,
            borderRadius: Math.round(fontSize * 0.24),
            whiteSpace: "nowrap" as const,
            color: isActive ? accent : captionText,
            textShadow:
              isActive && (resolvedStyle === "dynamic_karaoke")
                ? `0 0 ${Math.round(fontSize * 0.5)}px ${accent}`
                : undefined,
          };

          if (resolvedStyle === "kinetic_typewriter") {
            const visibleChars =
              time < wordStart
                ? 0
                : Math.ceil(word.length * clamp(wordProgress * 1.35, 0, 1));
            const visible = word.slice(0, visibleChars);
            return (
              <span
                key={`${word}-${index}`}
                style={{
                  ...baseStyle,
                  color: highlightColor,
                  background: "transparent",
                  opacity: time < wordStart ? 0 : 1,
                  scale: isActive ? "1.03" : "1",
                }}
              >
                {time < wordStart ? "" : visible}
                {isActive ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: Math.max(2, Math.round(fontSize * 0.06)),
                      height: `${fontSize * 0.9}px`,
                      marginLeft: Math.round(fontSize * 0.06),
                      background: accent,
                      opacity: 0.55 + 0.45 * Math.sin(time * 18),
                    }}
                  />
                ) : null}
              </span>
            );
          }

          if (resolvedStyle === "smooth_chunk_slide") {
            return (
              <span
                key={`${word}-${index}`}
                style={{
                  ...baseStyle,
                  color: highlightColor,
                  background: "transparent",
                  borderBottom: isActive
                    ? `${Math.max(2, Math.round(fontSize * 0.07))}px solid ${accent}`
                    : "none",
                  opacity: time < wordStart ? 0 : chunkEase,
                  transform: `translateY(${(1 - chunkEase) * 10}px)`,
                }}
              >
                {word}
              </span>
            );
          }

          return (
            <span
              key={`${word}-${index}`}
              style={{
                ...baseStyle,
                color: isActive
                  ? resolvedStyle === "word_pop_glow"
                    ? theme.caption.highlightText
                    : accent
                  : captionText,
                background: highlightBackground,
                boxShadow:
                  isActive && resolvedStyle === "word_pop_glow"
                    ? `0 0 ${Math.round(fontSize * 0.8)}px ${alpha(
                        accent,
                        0.3 + proximity * 0.55,
                      )}`
                    : undefined,
                opacity:
                  time < wordStart
                    ? 0
                    : resolvedStyle === "dynamic_karaoke"
                      ? 0.55 + 0.45 * wordEase
                      : wordEase,
                scale:
                  isActive
                    ? `${1 + 0.08 * proximity}`
                    : `${0.9 + wordEase * 0.1}`,
                translate:
                  resolvedStyle === "dynamic_karaoke"
                    ? "0px"
                    : `0px ${(1 - wordEase) * 12}px`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {resolvedStyle === "dynamic_karaoke" ? (
        <div
          style={{
            position: "absolute",
            bottom: Math.round(layout.padding * 0.7) - Math.round(fontSize * 0.18),
            left: "50%",
            width: `${clamp(30 + chunkText.length * 1.4, 30, 62)}%`,
            height: 3,
            transform: "translateX(-50%)",
            borderRadius: 999,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            opacity: 0.85,
          }}
        />
      ) : null}
    </div>
  );
};
