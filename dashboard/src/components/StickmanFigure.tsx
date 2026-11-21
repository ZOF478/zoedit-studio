import { useI18n } from '../i18n';
import type { StickmanPose } from '../types/studio';

interface StickmanFigureProps {
  pose: StickmanPose;
  strokeColor?: string;
  accentColor?: string;
  className?: string;
}

export function StickmanFigure({
  pose,
  strokeColor = '#F8FAFC',
  accentColor = '#E77B40',
  className = 'h-32 w-32',
}: StickmanFigureProps) {
  const { t } = useI18n();
  return (
    <svg
      viewBox="0 0 180 220"
      fill="none"
      className={className}
      aria-label={t(`شخصية Stickman بوضعية ${pose}`, `Stickman character in ${pose} pose`)}
    >
      {/* Smooth neck keeps the pure circle head connected without artifacts */}
      <path
        d="M90 52 L90 80"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Faceless Head: a pure, smooth circle */}
      <circle
        cx={pose === 'thinking' ? 94 : 90}
        cy={pose === 'sad' ? 54 : 46}
        r="21"
        fill={strokeColor}
      />

      {/* Torso */}
      <path
        d={
          pose === 'sad'
            ? 'M90 67 Q95 96 90 128'
            : pose === 'explaining'
              ? 'M90 67 Q86 96 90 128'
              : 'M90 67 L90 128'
        }
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Arms */}
      {pose === 'idle' && (
        <>
          <path d="M90 80 L64 108 L66 128" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L116 108 L114 128" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {pose === 'walking' && (
        <>
          <path d="M90 80 L62 96 L48 112" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L118 98 L132 116" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M76 128 L64 160 L72 186" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M104 128 L116 158 L108 186" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {pose === 'explaining' && (
        <>
          <path d="M90 80 L54 92 L40 72" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L122 98 L130 122" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="34" cy="64" r="4" fill={accentColor} />
        </>
      )}

      {pose === 'thinking' && (
        <>
          <path d="M90 80 L68 94 L80 62" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L112 104 L106 128" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="128" cy="30" r="3.5" fill={accentColor} />
          <circle cx="140" cy="18" r="5" fill={accentColor} />
        </>
      )}

      {pose === 'shocked' && (
        <>
          <path d="M90 80 L52 60 L60 34" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L128 60 L120 34" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M124 22 L136 10 M134 32 L148 26" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {pose === 'happy' && (
        <>
          <path d="M90 80 L54 44" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M90 80 L126 44" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M44 30 L52 20 M136 30 L128 20" stroke={accentColor} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}

      {pose === 'sad' && (
        <>
          <path d="M90 82 L72 114 L78 134" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 82 L108 114 L102 134" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {pose === 'pointing' && (
        <>
          <path d="M90 80 L62 100 L58 122" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L132 70 L160 64" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="166" cy="62" r="5" fill={accentColor} />
        </>
      )}

      {pose === 'celebrating' && (
        <>
          <path d="M90 80 L52 46 L44 28" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L128 46 L136 28" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M36 20 L44 12 M144 20 L136 12 M154 38 L164 36" stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {pose === 'idea' && (
        <>
          <path d="M90 80 L64 102 L60 124" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L112 60 L120 36" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="132" cy="20" r="7" fill={accentColor} opacity="0.9" />
          <path d="M132 8 L132 2 M144 20 L150 20 M142 10 L148 4" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {pose === 'facepalm' && (
        <>
          <path d="M90 80 L66 104 L70 128" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M90 80 L116 62 L106 38" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M106 38 Q116 30 124 40" stroke={accentColor} strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      )}

      {pose !== 'walking' && (
        <>
          <path d="M90 128 L70 186" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M90 128 L110 186" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
