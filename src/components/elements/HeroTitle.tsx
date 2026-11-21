import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";

type Props = {
  el: Extract<SceneElement, { type: "hero_title" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const HeroTitle = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.75, stiffness: 100 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const line = spring({
    frame: frame - delay - Math.round(fps * 0.2),
    fps,
    config: { damping: 20, mass: 0.8, stiffness: 80 },
  });
  const lineEased = Math.min(1, Math.max(0, line));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: theme.card.background,
        backgroundImage: `linear-gradient(135deg, ${alpha(
          theme.colors.primary,
          0.24,
        )} 0%, transparent 58%)`,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: `${Math.round(layout.cardPadding * 1.05)}px ${Math.round(
          layout.cardPadding * 1.15,
        )}px`,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.55),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 48}px`,
        scale: `${0.95 + eased * 0.05}`,
      }}
    >
      {el.badge || el.kicker ? (
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: Math.round(layout.unit * 8),
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.smallSize * 0.85)),
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: theme.colors.primary,
            background: alpha(theme.colors.primary, 0.12),
            borderRadius: 999,
            padding: `${Math.round(layout.unit * 5)}px ${Math.round(
              layout.unit * 18,
            )}px`,
          }}
        >
          <span
            style={{
              width: Math.round(layout.unit * 8),
              height: Math.round(layout.unit * 8),
              borderRadius: "50%",
              background: theme.colors.primary,
            }}
          />
          {el.badge ?? el.kicker}
        </div>
      ) : null}

      <div
        style={{
          fontFamily: theme.displayFamily,
          fontSize: Math.round(layout.titleSize * 0.72),
          fontWeight: 900,
          color: theme.colors.text,
          lineHeight: 1.15,
          textWrap: "balance",
        }}
      >
        {el.title}
      </div>

      <div
        style={{
          height: Math.max(5, Math.round(layout.unit * 6)),
          width: `${lineEased * 38}%`,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
          boxShadow: `0 0 ${Math.round(layout.unit * 20)}px ${alpha(
            theme.colors.primary,
            0.4,
          )}`,
        }}
      />

      {el.subtitle ? (
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.95)),
            fontWeight: 600,
            color: theme.colors.muted,
            lineHeight: 1.5,
          }}
        >
          {el.subtitle}
        </div>
      ) : null}
    </div>
  );
};
