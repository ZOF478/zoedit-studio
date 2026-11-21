import type {
  BackgroundPresetId as ParentBackgroundPresetId,
  Scene as ParentScene,
  VideoData,
} from '../../../src/types';
import { buildStaggeredSfxCues } from '../../../src/utils/sfxCues';
import type {
  AspectRatio,
  BrandKit,
  CaptionAnimationStyle,
  FpsOption,
  SceneItem,
  VisualStyle,
  WordsPerScreen,
} from '../types/studio';
import { SFX_CATALOG, autoMatchSfx } from './sfx';

const VISUAL_TYPES = new Set([
  'title-hero',
  'stat-number',
  'comparison-box',
  'bar-chart',
  'line-chart',
  'circular-gauge',
  'step-timeline',
  'notification-card',
  'warning-card',
  'editorial-quote',
  'bullet-list',
  'cta',
  'custom',
  'custom-tsx',
  'generative-scene',
]);

const LEGACY_VISUAL_TYPE_MAP: Record<string, string> = {
  'stat-card': 'stat-number',
  comparison: 'comparison-box',
  quote: 'editorial-quote',
  'chart-bar': 'bar-chart',
  'bullet-list': 'bullet-list',
  'title-hero': 'title-hero',
};

const GENERATIVE_MOTIFS = ['orbit', 'network', 'flow', 'funnel', 'cycle', 'constellation'] as const;

const SCENE_BACKGROUND_PRESETS = [
  'animated-mesh',
  'kinetic-grid',
  'floating-orbs',
  'deep-wave',
  'particle-field',
  'editorial-paper',
  'neon-cyber',
] as const;

const hashTopic = (value: string): number =>
  Array.from(value).reduce(
    (total, char, index) => (total + char.charCodeAt(0) * (index + 5)) % 100000,
    0
  );

function applySceneVariety(
  scenes: SceneItem[],
  requestedPreset: string,
  topic: string
): SceneItem[] {
  const preset = SCENE_BACKGROUND_PRESETS.includes(
    requestedPreset as (typeof SCENE_BACKGROUND_PRESETS)[number]
  )
    ? requestedPreset
    : 'ai-free';
  const seed = hashTopic(topic || scenes.map((scene) => scene.title).join(' '));
  const layouts = ['split', 'overlay', 'stacked', 'centered'] as const;
  const cameras = [
    'slow-zoom-in',
    'pan-left',
    'push-in',
    'slow-zoom-out',
    'pan-right',
  ] as const;
  let previousLayout: string | undefined;
  let previousCamera: string | undefined;
  let previousBackground: string | undefined;

  return scenes.map((scene, index) => {
    let layout = scene.layout;
    if (!layout || layout === previousLayout) {
      layout = layouts[(index + seed) % layouts.length];
      if (layout === previousLayout) {
        layout = layouts[(layouts.indexOf(layout) + 1) % layouts.length];
      }
    }
    let camera = scene.camera;
    if (!camera || camera === previousCamera) {
      camera = cameras[(index + seed) % cameras.length];
      if (camera === previousCamera) {
        camera = cameras[(cameras.indexOf(camera) + 1) % cameras.length];
      }
    }
    let backgroundPreset: string;
    if (preset === 'ai-free') {
      backgroundPreset =
        SCENE_BACKGROUND_PRESETS[(seed + index * 3) % SCENE_BACKGROUND_PRESETS.length];
      if (backgroundPreset === previousBackground) {
        const currentIndex = SCENE_BACKGROUND_PRESETS.indexOf(
          backgroundPreset as (typeof SCENE_BACKGROUND_PRESETS)[number]
        );
        backgroundPreset =
          SCENE_BACKGROUND_PRESETS[(currentIndex + 1) % SCENE_BACKGROUND_PRESETS.length];
      }
    } else {
      backgroundPreset = preset;
    }
    previousLayout = layout;
    previousCamera = camera;
    previousBackground = backgroundPreset;
    return {
      ...scene,
      layout,
      camera,
      backgroundPreset: backgroundPreset as SceneItem['backgroundPreset'],
    };
  });
}

const SCENE_LAYOUTS = ['centered', 'split', 'stacked', 'overlay', 'split'] as const;
const SCENE_CAMERAS = [
  'slow-zoom-in',
  'pan-left',
  'push-in',
  'slow-zoom-out',
  'pan-right',
] as const;

const normalizeVisualType = (raw: string): string => {
  const value = raw.trim().toLowerCase();
  const mapped = LEGACY_VISUAL_TYPE_MAP[value] || value;
  return VISUAL_TYPES.has(mapped) ? mapped : 'stat-number';
};

const numericValue = (raw: string): number | string => {
  const normalized = raw.replace(/[٬,]/g, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return raw;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : raw;
};

const splitValues = (raw: string): string[] =>
  raw
    .split(/\s*(?:\||\/|·|vs\.?|مقابل|\n)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

const firstNumber = (raw: string): number | null => {
  const value = numericValue(raw);
  return typeof value === 'number' ? value : null;
};

const extractNumbers = (raw: string): number[] => {
  const matches = raw.replace(/[٬,]/g, '').match(/-?\d+(?:\.\d+)?/g) || [];
  return matches.map(Number).filter((value) => Number.isFinite(value));
};

const parseChartItems = (
  raw: string,
  fallbackLabel: string
): Array<{ label: string; value: number }> => {
  const parts = splitValues(raw);
  const items = parts
    .map((part, index) => {
      const number = firstNumber(part);
      if (number === null) return null;
      const label = part
        .replace(/-?\d+(?:\.\d+)?/g, '')
        .replace(/[|·:/%٪]/g, ' ')
        .trim();
      return {
        label: label || (parts.length === 1 ? fallbackLabel : `#${index + 1}`),
        value: number,
      };
    })
    .filter((item): item is { label: string; value: number } => item !== null);

  if (items.length > 0) return items.slice(0, 6);

  const numbers = extractNumbers(raw);
  if (numbers.length > 1) {
    return numbers.slice(0, 6).map((value, index) => ({
      label: parts[index]?.replace(/-?\d+(?:\.\d+)?/g, '').trim() || `#${index + 1}`,
      value,
    }));
  }

  const single = numbers[0] ?? 60;
  return [
    { label: fallbackLabel, value: single },
    { label: 'B', value: Math.round(single * 1.25) },
    { label: 'C', value: Math.round(single * 1.55) },
    { label: 'D', value: Math.round(single * 1.85) },
  ];
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildCustomSvg = (title: string, prompt: string, accent: string): string => {
  const safeTitle = escapeXml(title.slice(0, 52));
  const seed = Array.from(prompt).reduce((total, char) => total + char.charCodeAt(0), 0);
  const bars = [0.42, 0.62, 0.8, 0.96].map((base, index) =>
    Math.min(0.98, Math.max(0.18, base + (((seed >> index) % 7) - 3) * 0.03))
  );
  const barWidth = 64;
  const gap = 34;
  const baseX = 250;
  const baseY = 296;
  const barShapes = bars
    .map((ratio, index) => {
      const height = Math.round(ratio * 168);
      return `<rect x="${baseX + index * (barWidth + gap)}" y="${
        baseY - height
      }" width="${barWidth}" height="${height}" rx="18" fill="${
        index === bars.length - 1 ? accent : '#94A3B8'
      }" fill-opacity="${index === bars.length - 1 ? '0.95' : '0.32'}"/>`;
    })
    .join('');
  const points = bars
    .map((ratio, index) => {
      const x = baseX + index * (barWidth + gap) + barWidth / 2;
      const y = baseY - Math.round(ratio * 168) - 18;
      return `${x},${y}`;
    })
    .join(' ');
  const dots = Array.from({ length: 7 * 4 })
    .map((_, index) => {
      const col = index % 7;
      const row = Math.floor(index / 7);
      return `<circle cx="${72 + col * 34}" cy="${
        86 + row * 34
      }" r="2.2" fill="#94A3B8" fill-opacity="0.22"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#0B1220" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="720" height="400" rx="32" fill="url(#bg)"/>
  ${dots}
  <path d="M72 330 H648" stroke="#94A3B8" stroke-opacity="0.28" stroke-width="2"/>
  ${barShapes}
  <polyline points="${points}" fill="none" stroke="url(#line)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="543" cy="104" r="42" fill="${accent}" fill-opacity="0.16"/>
  <circle cx="543" cy="104" r="20" fill="${accent}" fill-opacity="0.85"/>
  <text x="72" y="86" fill="#E2E8F0" font-family="'IBM Plex Sans Arabic', 'Cairo', sans-serif" font-size="26" font-weight="700">${safeTitle}</text>
  <text x="72" y="120" fill="#94A3B8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="16" font-weight="600" letter-spacing="2">AI CUSTOM VISUAL</text>
  <text x="72" y="368" fill="#94A3B8" font-family="'IBM Plex Sans Arabic', sans-serif" font-size="15" font-weight="500">Generated from your prompt</text>
</svg>`;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#E77B40';
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
};

const resolveSfxSrc = (
  selection: string | undefined,
  visualType: string
): string | undefined => {
  const autoMatch = autoMatchSfx(normalizeVisualType(visualType));
  const chosen = selection === 'auto' ? autoMatch : (selection || 'none').trim();
  if (chosen === 'none' || !chosen) return undefined;
  const catalogItem = SFX_CATALOG.find((item) => item.id === chosen);
  if (catalogItem) return `sfx/${catalogItem.file}`;
  const candidate = chosen.replace(/^\/?sfx\//, '');
  if (!candidate.includes('..') && /^[a-zA-Z0-9._-]+\.(mp3|wav|ogg)$/.test(candidate)) {
    return `sfx/${candidate}`;
  }
  return `sfx/${autoMatch}.wav`;
};

const parentCaptionStyle = (value: CaptionAnimationStyle): string => {
  switch (value) {
    case 'word-pop-glow':
      return 'word_pop_glow';
    case 'dynamic-karaoke':
      return 'dynamic_karaoke';
    case 'smooth-chunk-slide':
      return 'smooth_chunk_slide';
    case 'kinetic-typewriter':
      return 'kinetic_typewriter';
    default:
      return 'auto';
  }
};

const parentWordsPerScreen = (value: WordsPerScreen): number | 'auto' => {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric >= 2 && numeric <= 5 ? numeric : 'auto';
};

const mapVisualStyle = (style: VisualStyle): string => {
  if (style === 'modern-dark') return 'modern_dark';
  if (style === 'editorial-clean') return 'editorial_clean';
  if (style === 'smart-mix') return 'smart_mix';
  return 'stickman';
};

const aspectDimensions = (aspectRatio: AspectRatio): { width: number; height: number } => {
  if (aspectRatio === '16:9') return { width: 1920, height: 1080 };
  if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
};

const buildParentScene = (
  scene: SceneItem,
  index: number,
  accent: string,
  visualStyle: VisualStyle,
  voiceoverEnabled: boolean,
  fps: number,
  sfxEnabled: boolean
): ParentScene => {
  const label = scene.visualLabel || 'معلومة رئيسية';
  const value = scene.visualValue || '';
  const type = normalizeVisualType(scene.visualType);
  const dataHeavyTypes = new Set([
    'generative-scene',
    'comparison-box',
    'bar-chart',
    'line-chart',
    'circular-gauge',
    'step-timeline',
    'grid-nodes',
    'progress-bar',
  ]);
  const showCharacter =
    visualStyle === 'stickman'
      ? true
      : visualStyle === 'smart-mix'
        ? (scene.showCharacter ?? (!dataHeavyTypes.has(type) && index % 2 === 0))
        : false;
  let elements: Array<Record<string, unknown>> = [];

  if (type === 'title-hero') {
    elements = [
      {
        type: 'hero_title',
        title: label,
        subtitle: value || scene.narration,
        kicker: scene.title,
        badge: 'ZOF STUDIO',
      },
    ];
  } else if (type === 'stat-number') {
    elements = [{ type: 'stat_number', value: numericValue(value), label, icon: 'chart' }];
  } else if (type === 'comparison-box') {
    const parts = splitValues(value);
    elements = [
      {
        type: 'comparison_box',
        title: label,
        left: {
          title: parts[0] || 'الوضع الحالي',
          icon: 'alert',
          tone: 'negative',
          points: parts.length > 2 ? parts.slice(1, -1) : [],
        },
        right: {
          title: parts[1] || value || 'النتيجة',
          icon: 'trend',
          tone: 'positive',
          points: [],
        },
      },
    ];
  } else if (type === 'bar-chart') {
    elements = [
      {
        type: 'bar_chart',
        title: label,
        items: parseChartItems(value, label),
        suffix: /%/.test(value) ? '%' : '',
      },
    ];
  } else if (type === 'line-chart') {
    let points = extractNumbers(value);
    if (points.length < 2) {
      const base = points[0] ?? 40;
      points = [
        Math.round(base * 0.5),
        Math.round(base * 0.68),
        Math.round(base * 0.82),
        base,
        Math.round(base * 1.2),
      ];
    }
    elements = [
      {
        type: 'line_chart',
        title: label,
        label,
        points: points.slice(0, 8),
        suffix: /%/.test(value) ? '%' : '',
      },
    ];
  } else if (type === 'circular-gauge') {
    const number = firstNumber(value) ?? 75;
    elements = [
      {
        type: 'circular_gauge',
        title: label,
        label: /%/.test(value) ? '' : scene.narration,
        value: number,
        max: /%/.test(value) || number <= 100 ? 100 : Math.round(number * 1.2),
        suffix: /%/.test(value) ? '%' : '',
        icon: 'target',
      },
    ];
  } else if (type === 'step-timeline') {
    const steps = splitValues(value);
    elements = [
      {
        type: 'step_timeline',
        title: label,
        steps: (steps.length > 0 ? steps : [value || label]).slice(0, 5).map((step) => ({
          label: step,
        })),
      },
    ];
  } else if (type === 'notification-card') {
    elements = [
      {
        type: 'notification_card',
        app: scene.title,
        title: label,
        message: value || scene.narration,
        time: 'now',
        icon: 'spark',
        tone: 'success',
      },
    ];
  } else if (type === 'warning-card') {
    const parts = splitValues(value);
    elements = [
      {
        type: 'warning_card',
        title: label,
        badge: scene.title,
        myth: parts[0],
        truth: parts[1],
        text: parts.length > 2 ? parts.slice(2).join(' · ') : scene.narration,
        tone: 'warning',
      },
    ];
  } else if (type === 'editorial-quote') {
    elements = [
      {
        type: 'editorial_quote',
        title: scene.title,
        quote: value || scene.narration,
        author: label,
        source: 'ZOF STUDIO',
      },
    ];
  } else if (type === 'bullet-list') {
    const items = splitValues(value);
    elements = [
      {
        type: 'bullet_list',
        title: label,
        icon: 'check',
        items: (items.length > 0 ? items : [value || label]).slice(0, 6),
      },
    ];
  } else if (type === 'cta') {
    elements = [
      {
        type: 'cta',
        title: label,
        subtitle: value || scene.narration,
        buttonLabel: scene.title,
        icon: 'rocket',
      },
    ];
  } else if (type === 'custom') {
    elements = [
      {
        type: 'custom_visual',
        title: label,
        text: value || scene.narration,
        prompt: scene.visualPrompt,
        svg:
          scene.visualSvg ||
          buildCustomSvg(label, scene.visualPrompt || value, accent),
        icon: 'spark',
      },
    ];
  } else if (type === 'custom-tsx') {
    const keywords =
      scene.visualKeywords && scene.visualKeywords.length > 0
        ? scene.visualKeywords
        : (splitValues(value).length > 0
            ? splitValues(value)
            : [label, scene.title]
          ).slice(0, 5);
    if (scene.generatedComponent) {
      elements = [
        {
          type: 'custom_tsx',
          component: scene.generatedComponent,
          title: label,
          text: value || scene.narration,
          keywords: keywords.slice(0, 5),
          data: {
            narration: scene.narration,
            visualType: scene.visualType,
            motif: scene.motif,
          },
        },
      ];
    } else {
      const motif =
        typeof scene.motif === 'string' &&
        (GENERATIVE_MOTIFS as readonly string[]).includes(scene.motif)
          ? scene.motif
          : GENERATIVE_MOTIFS[index % GENERATIVE_MOTIFS.length];
      elements = [
        {
          type: 'generative_scene',
          title: label,
          headline: value || scene.title || label,
          keywords: keywords.slice(0, 5),
          motif,
          badge: scene.title,
        },
      ];
    }
  } else if (type === 'generative-scene') {
    const keywords =
      scene.visualKeywords && scene.visualKeywords.length > 0
        ? scene.visualKeywords
        : (splitValues(value).length > 0
            ? splitValues(value)
            : [label, scene.title]
          ).slice(0, 5);
    const motif =
      typeof scene.motif === 'string' &&
      (GENERATIVE_MOTIFS as readonly string[]).includes(scene.motif)
        ? scene.motif
        : GENERATIVE_MOTIFS[index % GENERATIVE_MOTIFS.length];
    elements = [
      {
        type: 'generative_scene',
        title: label,
        headline: value || scene.title || label,
        keywords: keywords.slice(0, 5),
        motif,
        badge: scene.title,
      },
    ];
  } else {
    elements = [
      {
        type: 'highlight_card',
        title: label,
        text: value || scene.narration,
        icon: 'spark',
        badge: 'ZOF STUDIO',
      },
    ];
  }

  const layout = scene.layout || SCENE_LAYOUTS[index % SCENE_LAYOUTS.length];
  const camera = scene.camera || SCENE_CAMERAS[index % SCENE_CAMERAS.length];
  const background =
    scene.background ||
    [
      `linear-gradient(135deg, ${hexToRgba(accent, 0.22)} 0%, transparent 58%)`,
      `linear-gradient(215deg, ${hexToRgba(accent, 0.16)} 0%, transparent 62%)`,
      `radial-gradient(circle at 82% 18%, ${hexToRgba(accent, 0.24)} 0%, transparent 46%)`,
      `linear-gradient(160deg, transparent 20%, ${hexToRgba(accent, 0.18)} 100%)`,
    ][index % 4];

  const sfxCues = sfxEnabled
    ? buildStaggeredSfxCues({
        fps,
        durationSec: scene.durationSec,
        elements,
        mode: voiceoverEnabled ? 'voiceover' : 'silent',
      })
    : [];

  return {
    id: scene.id,
    kicker: label,
    title: scene.title,
    subtitle: label,
    caption: scene.narration,
    duration: scene.durationSec,
    audioSrc: voiceoverEnabled
      ? scene.audioSrc ||
        (scene.audioDataUrl?.startsWith('/audio/') ? scene.audioDataUrl.slice(1) : undefined)
      : undefined,
    audioDuration: scene.audioDuration,
    sfxSrc: resolveSfxSrc(scene.sfxId, scene.visualType),
    sfxAt: scene.sfxAt,
    ...(sfxCues.length > 0 ? { sfxCues } : {}),
    layout,
    camera,
    background,
    backgroundPreset: scene.backgroundPreset as ParentBackgroundPresetId | undefined,
    ...(visualStyle === 'smart-mix' || showCharacter
      ? {
          character: {
            pose: scene.pose,
            side: index % 2 === 0 ? 'left' : 'right',
            accessory: index % 3 === 0 ? 'badge' : 'tie',
            enabled: showCharacter,
          },
        }
      : {}),
    ...(visualStyle === 'stickman' || (visualStyle === 'smart-mix' && showCharacter)
      ? scene.characters && scene.characters.length > 0
        ? {
            characters: scene.characters.map((character, characterIndex) => ({
              pose: character.pose || 'idle',
              side: character.side || (characterIndex === 0 ? 'left' : 'right'),
              accessory: character.accessory || 'none',
              ...(character.label ? { label: character.label } : {}),
              ...(character.scale !== undefined ? { scale: character.scale } : {}),
              enabled: character.enabled !== false,
            })),
            ...(scene.characterLayout ? { characterLayout: scene.characterLayout } : {}),
          }
        : {}
      : {}),
    ...(scene.ambientScene ? { ambientScene: scene.ambientScene } : {}),
    elements: elements as ParentScene['elements'],
  };
};

export interface BuildPreviewDataOptions {
  scenes: SceneItem[];
  topic: string;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  fps: FpsOption;
  scriptLanguage: 'ar' | 'en';
  scriptDepth: string;
  creativeCodeMode: string;
  scriptPacing: string;
  captionAnimationStyle: CaptionAnimationStyle;
  wordsPerScreen: WordsPerScreen;
  captionsEnabled: boolean;
  brandKit: BrandKit;
  sfxEnabled: boolean;
  sfxVolume: number;
  backgroundPreset: string;
  voiceoverEnabled: boolean;
}

export function buildPreviewVideoData(options: BuildPreviewDataOptions): VideoData {
  const { width, height } = aspectDimensions(options.aspectRatio);
  const accent = /^#[0-9a-fA-F]{6}$/.test(options.brandKit.accentColor)
    ? options.brandKit.accentColor
    : '#E77B40';
  const background = /^#[0-9a-fA-F]{6}$/.test(options.brandKit.bgColor)
    ? options.brandKit.bgColor
    : '#0B0F17';
  const firstTitle = options.scenes[0]?.title || 'Zof Studio';

  return {
    meta: {
      title: firstTitle.slice(0, 80),
      topic: options.topic.trim() || 'zof-studio',
      description: options.scenes
        .map((scene) => scene.title)
        .join(' · ')
        .slice(0, 240),
    },
    width,
    height,
    fps: options.fps,
    style: mapVisualStyle(options.visualStyle) as VideoData['style'],
    script_language: options.scriptLanguage,
    script_pacing: options.scriptPacing as VideoData['script_pacing'],
    caption: {
      animation_style: parentCaptionStyle(
        options.captionAnimationStyle
      ) as NonNullable<VideoData['caption']>['animation_style'],
      words_per_screen:
        parentWordsPerScreen(options.wordsPerScreen) as NonNullable<
          VideoData['caption']
        >['words_per_screen'],
      lead_in: 0.2,
      enabled: options.captionsEnabled && options.voiceoverEnabled,
    },
    brand_kit: {
      name: 'ZOF',
      primary: accent,
      secondary: '#FBBF24',
      accent,
      success: '#16A34A',
      danger: '#DC2626',
      background,
      watermark: options.brandKit.watermark.slice(0, 60),
      watermark_enabled: options.brandKit.watermarkEnabled,
      watermark_position: options.brandKit.watermarkPosition ?? 'top-left',
    },
    sfx: {
      enabled: options.sfxEnabled,
      volume: options.sfxVolume,
    },
    scenes: applySceneVariety(options.scenes, options.backgroundPreset, options.topic).map((scene, index) =>
      buildParentScene(
        scene,
        index,
        accent,
        options.visualStyle,
        options.voiceoverEnabled,
        options.fps,
        options.sfxEnabled
      )
    ),
  };
}
