import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "progress_bar" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const ProgressBar = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = el.max && el.max > 0 ? el.max : 100;
  const targetPercent = Math.min(100, Math.max(0, (el.value / max) * 100));

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.7, stiffness: 100 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const fill = spring({
    frame: frame - delay - Math.round(fps * 0.25),
    fps,
    config: { damping: 18, mass: 1.1, stiffness: 70 },
  });
  const fillEased = Math.min(1, Math.max(0, fill));
  const shownPercent = Math.round(targetPercent * fillEased);
  const suffix = el.suffix ?? "%";
  const trackHeight = Math.round(layout.unit * 28);

  return (
    <div
      style={{
        width: "100%",
        background: theme.card.background,
        border: theme.card.border,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: `${Math.round(layout.cardPadding * 0.8)}px ${Math.round(
          layout.cardPadding,
        )}px`,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.5),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 32}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: Math.round(layout.gap * 0.6),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(layout.gap * 0.45),
            minWidth: 0,
          }}
        >
          {el.icon ? (
            <div
              style={{
                width: Math.round(layout.unit * 48),
                height: Math.round(layout.unit * 48),
                borderRadius: "50%",
                background: alpha(theme.colors.primary, 0.14),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon
                name={el.icon}
                size={Math.round(layout.unit * 26)}
                color={theme.colors.primary}
              />
            </div>
          ) : null}
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 1.05)),
              fontWeight: 700,
              color: theme.colors.text,
              lineHeight: 1.4,
            }}
          >
            {el.label}
          </div>
        </div>
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 1.4)),
            fontWeight: 900,
            color: theme.colors.primary,
            direction: "ltr",
            flexShrink: 0,
          }}
        >
          {shownPercent}
          {suffix}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: trackHeight,
          borderRadius: 999,
          background: alpha(theme.colors.text, theme.isDark ? 0.12 : 0.08),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${targetPercent * fillEased}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
            boxShadow: `0 0 ${Math.round(layout.unit * 26)}px ${alpha(
              theme.colors.primary,
              0.5,
            )}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${targetPercent * fillEased}%`,
            width: Math.round(trackHeight * 0.72),
            height: Math.round(trackHeight * 0.72),
            borderRadius: "50%",
            background: theme.isDark ? theme.colors.text : "#FFFFFF",
            border: `${Math.max(2, Math.round(layout.unit * 3))}px solid ${
              theme.colors.primary
            }`,
            translate: "-50% -50%",
            opacity: fillEased > 0.02 ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
};
