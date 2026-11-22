import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";

type Props = {
  el: Extract<SceneElement, { type: "editorial_quote" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const EditorialQuote = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.75, stiffness: 100 },
  });
  const eased = Math.min(1, Math.max(0, enter));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: `${Math.round(layout.cardPadding * 1.05)}px ${Math.round(
          layout.cardPadding * 1.15,
        )}px`,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.45),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 40}px`,
      }}
    >
      <div
        style={{
          fontFamily: theme.displayFamily,
          fontSize: Math.round(layout.unit * 150),
          fontWeight: 900,
          lineHeight: 0.7,
          color: alpha(theme.colors.primary, 0.24),
          height: Math.round(layout.unit * 68),
        }}
      >
        &ldquo;
      </div>

      <div
        style={{
          fontFamily: theme.displayFamily,
          fontSize: Math.max(30, Math.round(layout.bodySize * 1.5)),
          fontWeight: 800,
          fontStyle: "italic",
          color: theme.colors.text,
          lineHeight: 1.42,
          textWrap: "balance",
        }}
      >
        {el.quote}
      </div>

      <div
        style={{
          height: Math.max(3, Math.round(layout.unit * 4)),
          width: Math.round(layout.unit * 84),
          borderRadius: 999,
          background: theme.colors.primary,
          marginTop: Math.round(layout.unit * 4),
        }}
      />

      {el.author || el.source ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: Math.round(layout.unit * 3),
          }}
        >
          {el.author ? (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize * 1.05)),
                fontWeight: 800,
                color: theme.colors.text,
              }}
            >
              {el.author}
            </div>
          ) : null}
          {el.source ? (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize * 0.82)),
                fontWeight: 600,
                color: theme.colors.muted,
              }}
            >
              {el.source}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
