import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";

type Props = {
  el: Extract<SceneElement, { type: "layer_stack" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

const parseItem = (raw: string) => {
  const parts = raw.split(/\s*[|·]\s*/).filter(Boolean);
  return {
    title: parts[0] ?? raw,
    description: parts.slice(1).join(" · "),
  };
};

export const LayerStack = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.success,
    theme.colors.accent,
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.55),
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

      {el.items.map((rawItem, index) => {
        const item = parseItem(rawItem);
        const color = colors[index % colors.length];
        const enter = spring({
          frame: frame - delay - index * Math.round(fps * 0.16),
          fps,
          config: { damping: 200, mass: 0.7, stiffness: 120 },
        });
        const eased = Math.min(1, Math.max(0, enter));

        return (
          <div
            key={`${rawItem}-${index}`}
            style={{
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: Math.round(layout.gap * 0.7),
              background: theme.card.background,
              backgroundImage: `linear-gradient(90deg, ${alpha(
                color,
                0.14,
              )} 0%, transparent 58%)`,
              border: theme.card.border,
              borderInlineStart: `${Math.max(
                6,
                Math.round(layout.unit * 7),
              )}px solid ${color}`,
              borderRadius: theme.card.radius,
              boxShadow: theme.card.shadow,
              backdropFilter: theme.card.backdropFilter,
              padding: `${Math.round(layout.cardPadding * 0.78)}px ${Math.round(
                layout.cardPadding,
              )}px`,
              opacity: eased,
              translate: `${(1 - eased) * layout.unit * 56}px 0px`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: Math.round(layout.cardPadding * 0.4),
                bottom: Math.round(-layout.unit * 34),
                fontFamily: theme.displayFamily,
                fontSize: Math.round(layout.unit * 150),
                fontWeight: 900,
                lineHeight: 1,
                color: alpha(color, 0.07),
                pointerEvents: "none",
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                width: Math.round(layout.unit * 64),
                height: Math.round(layout.unit * 64),
                borderRadius: Math.round(layout.unit * 18),
                background: color,
                color: theme.isDark ? theme.colors.background : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: theme.displayFamily,
                fontSize: Math.max(30, Math.round(layout.bodySize * 1.2)),
                fontWeight: 900,
                flexShrink: 0,
                boxShadow: `0 8px 24px ${alpha(color, 0.35)}`,
              }}
            >
              {index + 1}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: theme.displayFamily,
                  fontSize: Math.max(30, Math.round(layout.bodySize * 1.18)),
                  fontWeight: 800,
                  color: theme.colors.text,
                  lineHeight: 1.35,
                }}
              >
                {item.title}
              </div>
              {item.description ? (
                <div
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: Math.max(30, Math.round(layout.smallSize)),
                    fontWeight: 600,
                    color: theme.colors.muted,
                    lineHeight: 1.5,
                    marginTop: Math.round(layout.unit * 4),
                  }}
                >
                  {item.description}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
