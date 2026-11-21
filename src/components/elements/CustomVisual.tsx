import { Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "custom_visual" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const CustomVisual = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.75, stiffness: 105 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const svgSrc = el.svg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(el.svg)}`
    : null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: theme.card.background,
        backgroundImage: `linear-gradient(135deg, ${alpha(
          theme.colors.primary,
          0.18,
        )} 0%, transparent 62%)`,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.45),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 42}px`,
        scale: `${0.96 + eased * 0.04}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(layout.gap * 0.55),
        }}
      >
        <div
          style={{
            width: Math.round(layout.unit * 56),
            height: Math.round(layout.unit * 56),
            borderRadius: Math.round(layout.unit * 16),
            background: alpha(theme.colors.primary, 0.15),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon
            name={el.icon ?? "spark"}
            size={Math.round(layout.unit * 30)}
            color={theme.colors.primary}
          />
        </div>
        <div
          style={{
            minWidth: 0,
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 1.2)),
            fontWeight: 900,
            color: theme.colors.text,
            lineHeight: 1.3,
          }}
        >
          {el.title}
        </div>
      </div>

      {svgSrc ? (
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${Math.round(layout.unit * 8)}px 0`,
          }}
        >
          <Img
            src={svgSrc}
            alt={el.title}
            style={{
              width: "100%",
              maxHeight: Math.round(layout.unit * 320),
              objectFit: "contain",
            }}
          />
        </div>
      ) : null}

      {el.text ? (
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.smallSize * 1.02)),
            fontWeight: 600,
            color: theme.colors.muted,
            lineHeight: 1.5,
          }}
        >
          {el.text}
        </div>
      ) : null}

      {el.prompt ? (
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.smallSize * 0.72)),
            fontWeight: 600,
            color: theme.colors.muted,
            fontStyle: "italic",
            lineHeight: 1.4,
          }}
        >
          {el.prompt}
        </div>
      ) : null}
    </div>
  );
};
