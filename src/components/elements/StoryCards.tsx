import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { SceneElement } from "../../types";
import type { WcagPalette } from "../../utils/wcagPalette";
import { Icon } from "../Icon";

type TimelineProps = {
  el: Extract<SceneElement, { type: "step_timeline" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
  durationInFrames?: number;
  wcag?: WcagPalette;
};

export const StepTimeline = ({
  el,
  theme,
  layout,
  delay,
  durationInFrames = 120,
  wcag,
}: TimelineProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steps = el.steps.slice(0, 5);
  const totalFrames = Math.max(1, durationInFrames);
  const revealSpan = Math.max(
    Math.round(fps * 0.9),
    totalFrames - delay - Math.round(fps * 0.5),
  );
  const stepGap = revealSpan / Math.max(1, steps.length);
  const stepBeat = (index: number) => delay + index * stepGap;
  const activeStep =
    frame < delay
      ? -1
      : Math.min(
          steps.length - 1,
          Math.floor((frame - delay) / Math.max(1, stepGap)),
        );
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2 * 1.5);

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
        gap: Math.round(layout.gap * 0.3),
      }}
    >
      {el.title ? (
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.92)),
            fontWeight: 800,
            color: wcag?.secondaryText ?? theme.colors.muted,
            marginBottom: Math.round(layout.unit * 8),
          }}
        >
          {el.title}
        </div>
      ) : null}

      {steps.map((step, index) => {
        const enter = spring({
          frame: frame - stepBeat(index),
          fps,
          config: { damping: 18, mass: 0.55, stiffness: 150 },
        });
        const eased = Math.min(1, Math.max(0, enter));
        const isLast = index === steps.length - 1;
        const isActive = index === activeStep;

        return (
          <div
            key={`${step.label}-${index}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: Math.round(layout.gap * 0.7),
              opacity: eased,
              translate: `${(1 - eased) * layout.unit * 34}px 0px`,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: Math.round(layout.unit * 58),
                  height: Math.round(layout.unit * 58),
                  borderRadius: "50%",
                  background: theme.colors.primary,
                  color: theme.isDark ? theme.colors.background : "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: theme.displayFamily,
                  fontSize: Math.max(30, Math.round(layout.bodySize * 1.05)),
                  fontWeight: 900,
                  scale: isActive ? `${1 + pulse * 0.08}` : "1",
                  boxShadow: isActive
                    ? `0 0 ${Math.round(
                        layout.unit * (22 + pulse * 20),
                      )}px ${alpha(theme.colors.primary, 0.55)}, 0 0 0 ${Math.max(
                        2,
                        Math.round(layout.unit * 3),
                      )}px ${alpha(theme.colors.primary, 0.4)}`
                    : `0 0 ${Math.round(layout.unit * 20)}px ${alpha(
                        theme.colors.primary,
                        0.4,
                      )}`,
                }}
              >
                {index + 1}
              </div>
              {!isLast ? (
                <div
                  style={{
                    width: Math.max(2, Math.round(layout.unit * 3)),
                    height: Math.round(layout.unit * 48),
                    borderRadius: 999,
                    backgroundImage: `repeating-linear-gradient(180deg, ${theme.colors.primary} 0 ${Math.round(
                      layout.unit * 8,
                    )}px, transparent ${Math.round(
                      layout.unit * 8,
                    )}px ${Math.round(layout.unit * 18)}px)`,
                    backgroundPositionY: `${(frame / fps) * 26}px`,
                    opacity: 0.7,
                  }}
                />
              ) : null}
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
                paddingTop: Math.round(layout.unit * 4),
                paddingBottom: isLast ? 0 : Math.round(layout.unit * 12),
              }}
            >
              <div
                style={{
                  fontFamily: theme.displayFamily,
                  fontSize: Math.max(30, Math.round(layout.bodySize * 1.15)),
                  fontWeight: 800,
                  color: theme.colors.text,
                  lineHeight: 1.3,
                }}
              >
                {step.label}
              </div>
              {step.caption ? (
                <div
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: Math.max(30, Math.round(layout.smallSize)),
                    fontWeight: 600,
                    color: wcag?.secondaryText ?? theme.colors.muted,
                    lineHeight: 1.5,
                    marginTop: Math.round(layout.unit * 4),
                  }}
                >
                  {step.caption}
                </div>
              ) : null}
            </div>

            {step.value ? (
              <div
                style={{
                  fontFamily: theme.displayFamily,
                  fontSize: Math.max(30, Math.round(layout.bodySize * 1.1)),
                  fontWeight: 900,
                  color: theme.colors.primary,
                  flexShrink: 0,
                  paddingTop: Math.round(layout.unit * 8),
                  direction: "ltr",
                }}
              >
                {step.value}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

type NotificationProps = {
  el: Extract<SceneElement, { type: "notification_card" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const NotificationCard = ({ el, theme, layout, delay }: NotificationProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone =
    el.tone === "success"
      ? theme.colors.success
      : el.tone === "warning"
        ? theme.colors.secondary
        : theme.colors.primary;
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 120 },
  });
  const eased = Math.min(1, Math.max(0, enter));

  return (
    <div
      style={{
        width: "100%",
        background: theme.card.background,
        border: `${Math.max(1, Math.round(layout.unit * 2))}px solid ${alpha(
          tone,
          0.4,
        )}`,
        borderRadius: Math.max(18, Math.round(layout.unit * 26)),
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: `${Math.round(layout.cardPadding * 0.78)}px ${Math.round(
          layout.cardPadding,
        )}px`,
        display: "flex",
        alignItems: "flex-start",
        gap: Math.round(layout.gap * 0.65),
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 40}px`,
        scale: `${0.96 + eased * 0.04}`,
      }}
    >
      <div
        style={{
          width: Math.round(layout.unit * 64),
          height: Math.round(layout.unit * 64),
          borderRadius: Math.round(layout.unit * 18),
          background: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 0 ${Math.round(layout.unit * 20)}px ${alpha(tone, 0.4)}`,
        }}
      >
        <Icon
          name={el.icon ?? "spark"}
          size={Math.round(layout.unit * 34)}
          color={theme.isDark ? theme.colors.background : "#FFFFFF"}
          strokeWidth={2}
        />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: Math.round(layout.unit * 8),
          }}
        >
          <span
            style={{
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 0.82)),
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: tone,
            }}
          >
            {el.app ?? "ZOF STUDIO"}
          </span>
          <span
            style={{
              fontFamily: theme.fontFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 0.75)),
              fontWeight: 600,
              color: theme.colors.muted,
            }}
          >
            {el.time ?? "now"}
          </span>
        </div>
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 1.08)),
            fontWeight: 800,
            color: theme.colors.text,
            lineHeight: 1.35,
            marginTop: Math.round(layout.unit * 5),
          }}
        >
          {el.title}
        </div>
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
          {el.message}
        </div>
      </div>
    </div>
  );
};

type WarningProps = {
  el: Extract<SceneElement, { type: "warning_card" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const WarningCard = ({ el, theme, layout, delay }: WarningProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone =
    el.tone === "myth"
      ? theme.colors.secondary
      : el.tone === "danger"
        ? theme.colors.danger
        : theme.colors.accent;
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.75, stiffness: 115 },
  });
  const eased = Math.min(1, Math.max(0, enter));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: theme.card.background,
        backgroundImage: `linear-gradient(135deg, ${alpha(tone, 0.2)} 0%, transparent 60%)`,
        border: `${Math.max(2, Math.round(layout.unit * 2))}px solid ${alpha(
          tone,
          0.48,
        )}`,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        backdropFilter: theme.card.backdropFilter,
        padding: layout.cardPadding,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.5),
        opacity: eased,
        translate: `${(1 - eased) * layout.unit * 36}px 0px`,
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
            width: Math.round(layout.unit * 60),
            height: Math.round(layout.unit * 60),
            borderRadius: "50%",
            background: alpha(tone, 0.18),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon
            name="alert"
            size={Math.round(layout.unit * 34)}
            color={tone}
            strokeWidth={2.2}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          {el.badge ? (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize * 0.78)),
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: tone,
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
              lineHeight: 1.3,
            }}
          >
            {el.title}
          </div>
        </div>
      </div>

      {el.myth || el.truth ? (
        <div style={{ display: "flex", flexDirection: "column", gap: Math.round(layout.unit * 10) }}>
          {el.myth ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: Math.round(layout.gap * 0.45),
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize)),
                fontWeight: 600,
                color: theme.colors.muted,
                lineHeight: 1.45,
              }}
            >
              <Icon
                name="x"
                size={Math.round(layout.unit * 22)}
                color={theme.colors.danger}
                strokeWidth={2.4}
              />
              <span>{el.myth}</span>
            </div>
          ) : null}
          {el.truth ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: Math.round(layout.gap * 0.45),
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize)),
                fontWeight: 700,
                color: theme.colors.text,
                lineHeight: 1.45,
              }}
            >
              <Icon
                name="check"
                size={Math.round(layout.unit * 22)}
                color={theme.colors.success}
                strokeWidth={2.6}
              />
              <span>{el.truth}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {el.text ? (
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.smallSize)),
            fontWeight: 600,
            color: theme.colors.muted,
            lineHeight: 1.5,
          }}
        >
          {el.text}
        </div>
      ) : null}
    </div>
  );
};

type CtaProps = {
  el: Extract<SceneElement, { type: "cta" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
};

export const CallToAction = ({ el, theme, layout, delay }: CtaProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 0.75, stiffness: 110 },
  });
  const eased = Math.min(1, Math.max(0, enter));
  const pulse = 1 + Math.sin(Math.max(0, frame - delay) / Math.max(1, fps) * 4) * 0.02;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`,
        borderRadius: theme.card.radius,
        boxShadow: theme.card.shadow,
        padding: `${Math.round(layout.cardPadding * 1.1)}px ${Math.round(
          layout.cardPadding * 1.15,
        )}px`,
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.45),
        color: theme.isDark ? theme.colors.background : "#FFFFFF",
        opacity: eased,
        translate: `0px ${(1 - eased) * layout.unit * 44}px`,
        scale: `${0.95 + eased * 0.05}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: Math.round(-layout.unit * 20),
          top: Math.round(-layout.unit * 30),
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <Icon
          name="rocket"
          size={Math.round(layout.unit * 210)}
          color="#FFFFFF"
          strokeWidth={1.2}
        />
      </div>

      <div
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: Math.round(layout.unit * 8),
          fontFamily: theme.fontFamily,
          fontSize: Math.max(30, Math.round(layout.smallSize * 0.82)),
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: "rgba(255,255,255,0.2)",
          borderRadius: 999,
          padding: `${Math.round(layout.unit * 5)}px ${Math.round(layout.unit * 16)}px`,
        }}
      >
        <Icon
          name={el.icon ?? "spark"}
          size={Math.round(layout.unit * 20)}
          color={theme.isDark ? theme.colors.background : "#FFFFFF"}
        />
        {el.buttonLabel ?? "START NOW"}
      </div>

      <div
        style={{
          fontFamily: theme.displayFamily,
          fontSize: Math.round(layout.titleSize * 0.64),
          fontWeight: 900,
          lineHeight: 1.15,
          textWrap: "balance",
          position: "relative",
        }}
      >
        {el.title}
      </div>

      {el.subtitle ? (
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.98)),
            fontWeight: 600,
            lineHeight: 1.45,
            opacity: 0.92,
            position: "relative",
          }}
        >
          {el.subtitle}
        </div>
      ) : null}

      <div
        style={{
          alignSelf: "flex-start",
          marginTop: Math.round(layout.unit * 8),
          padding: `${Math.round(layout.unit * 12)}px ${Math.round(layout.unit * 34)}px`,
          borderRadius: 999,
          background: theme.isDark ? theme.colors.background : "#FFFFFF",
          color: theme.isDark ? theme.colors.text : theme.colors.primary,
          fontFamily: theme.displayFamily,
          fontSize: Math.max(30, Math.round(layout.bodySize * 1.02)),
          fontWeight: 900,
          boxShadow: `0 10px 30px ${alpha(theme.colors.background, 0.25)}`,
          scale: `${pulse}`,
        }}
      >
        {el.buttonLabel ?? "START NOW"}
      </div>
    </div>
  );
};
