import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "bullet_list" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const BulletList = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palette = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.success,
    theme.colors.accent,
  ];
  const items = el.items.slice(0, 6);

  return (
    <div
      style={{
        width: "100%",
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.35),
      }}
    >
      {el.title ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(layout.gap * 0.5),
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.95)),
            fontWeight: 800,
            color: theme.colors.muted,
            marginBottom: Math.round(layout.unit * 6),
          }}
        >
          <Icon
            name={el.icon ?? "check"}
            size={Math.round(layout.unit * 28)}
            color={theme.colors.primary}
          />
          {el.title}
        </div>
      ) : null}

      {items.map((item, index) => {
        const color = palette[index % palette.length];
        const enter = spring({
          frame: frame - delay - index * Math.round(fps * 0.1),
          fps,
          config: { damping: 200, mass: 0.6, stiffness: 130 },
        });
        const eased = Math.min(1, Math.max(0, enter));

        return (
          <div
            key={`${item}-${index}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: Math.round(layout.gap * 0.55),
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 1.05)),
              fontWeight: 700,
              color: theme.colors.text,
              lineHeight: 1.45,
              opacity: eased,
              translate: `${(1 - eased) * layout.unit * 26}px 0px`,
            }}
          >
            <span
              style={{
                width: Math.round(layout.unit * 34),
                height: Math.round(layout.unit * 34),
                borderRadius: "50%",
                background: alpha(color, 0.16),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: Math.round(layout.unit * 2),
              }}
            >
              <Icon
                name="check"
                size={Math.round(layout.unit * 19)}
                color={color}
                strokeWidth={2.6}
              />
            </span>
            <span style={{ minWidth: 0 }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
};
