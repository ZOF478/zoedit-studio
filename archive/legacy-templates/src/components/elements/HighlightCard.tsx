import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "highlight_card" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const HighlightCard = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = theme.colors.accent;
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.75, stiffness: 110 },
  });
  const eased = Math.min(1, Math.max(0, enter));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: theme.card.background,
        backgroundImage: `linear-gradient(125deg, ${alpha(
          accent,
          0.16,
        )} 0%, transparent 65%)`,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        display: "flex",
        gap: Math.round(layout.gap * 0.7),
        alignItems: "flex-start",
        opacity: eased,
        translate: `${(1 - eased) * layout.unit * 42}px 0px`,
        scale: `${0.97 + eased * 0.03}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: Math.round(layout.unit * 12),
          bottom: -Math.round(layout.unit * 42),
          fontFamily: theme.displayFamily,
          fontSize: Math.round(layout.unit * 160),
          fontWeight: 900,
          color: alpha(accent, 0.08),
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        ”
      </div>

      <div
        style={{
          width: Math.round(layout.unit * 62),
          height: Math.round(layout.unit * 62),
          borderRadius: Math.round(layout.unit * 18),
          background: alpha(accent, 0.16),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon
          name={el.icon ?? "bulb"}
          size={Math.round(layout.unit * 34)}
          color={accent}
        />
      </div>

      <div style={{ minWidth: 0, position: "relative" }}>
        {el.badge ? (
          <div
            style={{
              display: "inline-block",
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 0.78)),
              fontWeight: 800,
              color: accent,
              background: alpha(accent, 0.12),
              borderRadius: 999,
              padding: `${Math.round(layout.unit * 4)}px ${Math.round(
                layout.unit * 16,
              )}px`,
              marginBottom: Math.round(layout.unit * 8),
              lineHeight: 1.3,
            }}
          >
            {el.badge}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 1.22)),
            fontWeight: 900,
            color: theme.colors.text,
            lineHeight: 1.35,
          }}
        >
          {el.title}
        </div>
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 1.02)),
            fontWeight: 600,
            color: theme.colors.muted,
            lineHeight: 1.55,
            marginTop: Math.round(layout.unit * 6),
          }}
        >
          {el.text}
        </div>
      </div>
    </div>
  );
};
