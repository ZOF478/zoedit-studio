import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "grid_nodes" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const GridNodes = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = el.items.length;
  const columns =
    count <= 2
      ? Math.max(1, count)
      : count === 3
        ? 3
        : layout.isPortrait || layout.isSquare
          ? 2
          : Math.min(count, 4);
  const palette = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.success,
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.6),
        width: "100%",
      }}
    >
      {el.title ? (
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.85)),
            fontWeight: 800,
            color: theme.colors.muted,
            lineHeight: 1.3,
          }}
        >
          {el.title}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: Math.round(layout.gap * 0.65),
          width: "100%",
        }}
      >
        {el.items.map((node, index) => {
          const color = palette[index % palette.length];
          const enter = spring({
            frame: frame - delay - index * Math.round(fps * 0.1),
            fps,
            config: { damping: 15, mass: 0.7, stiffness: 130 },
          });
          const eased = Math.min(1, Math.max(0, enter));

          return (
            <div
              key={`${node.label}-${index}`}
              style={{
                minWidth: 0,
                height: "100%",
                boxSizing: "border-box",
                background: theme.card.background,
                border: theme.card.border,
                borderRadius: theme.card.radius,
                boxShadow: theme.card.shadow,
                backdropFilter: theme.card.backdropFilter,
                padding: Math.round(layout.cardPadding * 0.72),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: Math.round(layout.unit * 10),
                opacity: eased,
                scale: `${0.72 + eased * 0.28}`,
                translate: `0px ${(1 - eased) * layout.unit * 24}px`,
              }}
            >
              <div
                style={{
                  width: Math.round(layout.unit * 62),
                  height: Math.round(layout.unit * 62),
                  borderRadius: "50%",
                  background: alpha(color, 0.15),
                  border: `1px solid ${alpha(color, 0.3)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  name={node.icon}
                  size={Math.round(layout.unit * 34)}
                  color={color}
                  strokeWidth={1.9}
                />
              </div>
              <div
                style={{
                  fontFamily: theme.displayFamily,
                  fontSize: Math.max(30, Math.round(layout.smallSize * 1.06)),
                  fontWeight: 800,
                  color: theme.colors.text,
                  lineHeight: 1.35,
                }}
              >
                {node.label}
              </div>
              {node.caption ? (
                <div
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: Math.max(30, Math.round(layout.smallSize * 0.82)),
                    fontWeight: 600,
                    color: theme.colors.muted,
                    lineHeight: 1.4,
                  }}
                >
                  {node.caption}
                </div>
              ) : null}
              {node.value ? (
                <div
                  style={{
                    fontFamily: theme.displayFamily,
                    fontSize: Math.max(30, Math.round(layout.smallSize * 1.1)),
                    fontWeight: 900,
                    color,
                    lineHeight: 1.3,
                  }}
                >
                  {node.value}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
