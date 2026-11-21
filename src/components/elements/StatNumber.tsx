import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "stat_number" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

const formatNumber = (value: number, decimals: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const StatNumber = ({ el, theme, layout, delay }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delay);
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 200, mass: 0.8, stiffness: 90 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const decimals = el.decimals ?? 0;

  const progress = interpolate(local, [0, Math.round(fps * 1.25)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const display =
    typeof el.value === "number"
      ? formatNumber(el.value * progress, decimals)
      : String(el.value);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: theme.card.background,
        backgroundImage: `linear-gradient(125deg, ${alpha(
          theme.colors.primary,
          0.16,
        )} 0%, transparent 62%)`,
        border: theme.card.border,
        borderInlineStart: `${Math.max(
          7,
          Math.round(layout.unit * 8),
        )}px solid ${theme.colors.primary}`,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: `${Math.round(layout.cardPadding * 0.9)}px ${Math.round(
          layout.cardPadding,
        )}px`,
        display: "flex",
        alignItems: "center",
        gap: Math.round(layout.gap * 0.8),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 36}px`,
        scale: `${0.96 + eased * 0.04}`,
      }}
    >
      {el.icon ? (
        <div
          style={{
            width: Math.round(layout.unit * 92),
            height: Math.round(layout.unit * 92),
            borderRadius: Math.round(layout.unit * 26),
            background: alpha(theme.colors.primary, 0.14),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon
            name={el.icon}
            size={Math.round(layout.unit * 48)}
            color={theme.colors.primary}
            strokeWidth={1.8}
          />
        </div>
      ) : null}

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            direction: "ltr",
            justifyContent: "flex-start",
            gap: Math.round(layout.unit * 2),
            fontFamily: theme.displayFamily,
            fontSize: layout.bigNumberSize,
            fontWeight: 900,
            lineHeight: 1,
            color: theme.colors.primary,
            letterSpacing: "-0.02em",
            textShadow: `0 ${Math.round(layout.unit * 6)}px ${Math.round(
              layout.unit * 26,
            )}px ${alpha(theme.colors.primary, 0.22)}`,
          }}
        >
          {el.prefix ? <span>{el.prefix}</span> : null}
          <span>{display}</span>
          {el.suffix ? <span>{el.suffix}</span> : null}
        </div>
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.98)),
            fontWeight: 700,
            color: theme.colors.muted,
            lineHeight: 1.5,
            marginTop: Math.round(layout.unit * 8),
          }}
        >
          {el.label}
        </div>
      </div>
    </div>
  );
};
