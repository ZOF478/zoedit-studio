import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Layout } from "../../layout";
import { alpha, type Theme } from "../../theme";
import type { ComparisonSide, SceneElement } from "../../types";
import type { WcagPalette } from "../../utils/wcagPalette";
import { Icon } from "../Icon";

type Props = {
  el: Extract<SceneElement, { type: "comparison_box" }>;
  theme: Theme;
  layout: Layout;
  delay: number;
  durationInFrames?: number;
  wcag?: WcagPalette;
};

export const ComparisonBox = ({
  el,
  theme,
  layout,
  delay,
  durationInFrames = 120,
  wcag,
}: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.max(1, durationInFrames);
  const leftBeat = delay;
  const rightBeat =
    delay + Math.max(Math.round(fps * 0.55), Math.round(totalFrames * 0.2));
  const sideBeat = (index: number) => (index === 0 ? leftBeat : rightBeat);
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2 * 1.4);

  const renderSide = (
    side: ComparisonSide,
    index: number,
    sideLabel: string,
  ) => {
    const tone =
      side.tone === "positive"
        ? theme.colors.success
        : side.tone === "negative"
          ? theme.colors.danger
          : theme.colors.primary;
    const pointIcon = side.tone === "negative" ? "x" : "check";
    const enter = spring({
      frame: frame - sideBeat(index),
      fps,
      config: { damping: 18, mass: 0.6, stiffness: 150 },
    });
    const eased = Math.min(1, Math.max(0, enter));
    const isActive =
      index === 0 ? frame < rightBeat : frame >= rightBeat - Math.round(fps * 0.1);

    return (
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          flex: 1,
          minWidth: 0,
          background: theme.card.background,
          backgroundImage: `linear-gradient(145deg, ${alpha(
            tone,
            0.16,
          )} 0%, transparent 52%)`,
          border: `${Math.max(2, Math.round(layout.unit * 2))}px solid ${alpha(
            tone,
            0.45,
          )}`,
          borderRadius: theme.card.radius,
          boxShadow: isActive
            ? `${theme.card.shadow}, 0 0 ${Math.round(
                layout.unit * (26 + pulse * 22),
              )}px ${alpha(tone, 0.4)}, inset 0 0 0 ${Math.max(
                2,
                Math.round(layout.unit * 3),
              )}px ${alpha(tone, 0.35 + pulse * 0.35)}`
            : theme.card.shadow,
          backdropFilter: theme.card.backdropFilter,
          padding: layout.cardPadding,
          display: "flex",
          flexDirection: "column",
          gap: Math.round(layout.gap * 0.7),
          opacity: eased,
          translate: `0px ${(1 - eased) * layout.unit * 44}px`,
          scale: `${0.94 + eased * 0.06}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: Math.round(-layout.unit * 18),
            bottom: Math.round(-layout.unit * 34),
            opacity: 0.07,
            pointerEvents: "none",
          }}
        >
          <Icon
            name={side.icon}
            size={Math.round(layout.unit * 190)}
            color={tone}
            strokeWidth={1.2}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(layout.gap * 0.6),
            flexDirection: "row",
          }}
        >
          <div
            style={{
              width: Math.round(layout.unit * 58),
              height: Math.round(layout.unit * 58),
              borderRadius: "50%",
              background: alpha(tone, 0.16),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon
              name={side.icon}
              size={Math.round(layout.unit * 32)}
              color={tone}
              strokeWidth={2}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: theme.displayFamily,
                fontSize: Math.max(30, Math.round(layout.bodySize * 1.25)),
                fontWeight: 800,
                color: theme.colors.text,
                lineHeight: 1.3,
              }}
            >
              {side.title}
            </div>
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: Math.max(30, Math.round(layout.smallSize * 0.9)),
                fontWeight: 700,
                color: tone,
                letterSpacing: "0.02em",
                lineHeight: 1.4,
              }}
            >
              {side.subtitle ?? sideLabel}
            </div>
          </div>
        </div>

        {side.points?.length ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: Math.round(layout.unit * 12),
            }}
          >
            {side.points.map((point, pointIndex) => {
              const pointEnter = spring({
                frame:
                  frame -
                  sideBeat(index) -
                  Math.round(fps * 0.16) -
                  pointIndex * Math.round(fps * 0.08),
                fps,
                config: { damping: 200, mass: 0.5, stiffness: 140 },
              });
              const pointEase = Math.min(1, Math.max(0, pointEnter));
              return (
                <div
                  key={`${point}-${pointIndex}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: Math.round(layout.gap * 0.45),
                    fontFamily: theme.fontFamily,
                    fontSize: Math.max(30, Math.round(layout.smallSize * 1.02)),
                    fontWeight: 600,
                    color: wcag?.primaryText ?? theme.colors.text,
                    lineHeight: 1.45,
                    opacity: pointEase,
                    translate: `${(1 - pointEase) * layout.unit * 18}px 0px`,
                  }}
                >
                  <span
                    style={{
                      width: Math.round(layout.unit * 26),
                      height: Math.round(layout.unit * 26),
                      borderRadius: "50%",
                      background: alpha(tone, 0.16),
                      color: tone,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      name={pointIcon}
                      size={Math.round(layout.unit * 15)}
                      color={tone}
                      strokeWidth={2.6}
                    />
                  </span>
                  <span>{point}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: Math.round(layout.gap * 0.7),
        width: "100%",
      }}
    >
      {el.title ? (
        <div
          style={{
            fontFamily: theme.displayFamily,
            fontSize: Math.max(30, Math.round(layout.bodySize * 0.85)),
            fontWeight: 800,
            color: wcag?.secondaryText ?? theme.colors.muted,
            lineHeight: 1.3,
          }}
        >
          {el.title}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: layout.isPortrait ? "column" : "row",
          gap: Math.round(layout.gap * 0.9),
          width: "100%",
        }}
      >
        {renderSide(el.left, 0, "الخيار الأول")}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: layout.isPortrait ? "100%" : Math.round(layout.unit * 48),
            height: layout.isPortrait ? Math.round(layout.unit * 48) : "auto",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 48 48"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              inset: 0,
              transform: layout.isPortrait ? "rotate(90deg)" : undefined,
            }}
          >
            <line
              x1="2"
              y1="24"
              x2="46"
              y2="24"
              stroke={alpha(theme.colors.primary, 0.55)}
              strokeWidth="2"
              strokeDasharray="5 7"
              strokeLinecap="round"
              strokeDashoffset={-((frame / fps) * 26)}
            />
          </svg>
          <span
            style={{
              position: "relative",
              width: Math.round(layout.unit * 36),
              height: Math.round(layout.unit * 36),
              borderRadius: "50%",
              background: theme.colors.primary,
              color: theme.isDark ? theme.colors.background : "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: theme.displayFamily,
              fontSize: Math.max(30, Math.round(layout.smallSize * 0.82)),
              fontWeight: 900,
              transform: `scale(${0.7 + pulse * 0.3})`,
              boxShadow: `0 0 ${Math.round(layout.unit * 22)}px ${alpha(
                theme.colors.primary,
                0.5,
              )}`,
            }}
          >
            VS
          </span>
        </div>
        {renderSide(el.right, 1, "الخيار الثاني")}
      </div>
    </div>
  );
};
