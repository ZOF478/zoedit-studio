import type {
  AspectRatio,
  BrandKit,
  FpsOption,
  SceneItem,
  SfxConfig,
  StickmanPose,
  VisualStyle,
} from '../types/studio';
import { MAX_SCENE_SFX_VOLUME, resolveSceneSfxUrl } from './sfx';

function isDarkHexColor(color: string): boolean {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return true;
  const value = parseInt(color.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

function getRenderResolution(aspectRatio: AspectRatio): { width: number; height: number } {
  if (aspectRatio === '16:9') return { width: 1280, height: 720 };
  if (aspectRatio === '1:1') return { width: 720, height: 720 };
  return { width: 720, height: 1280 };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapArabicText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawCanvasStickman(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  pose: StickmanPose,
  t: number,
  strokeColor: string,
  accentColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const bob = pose === 'happy' ? Math.abs(Math.sin(t * 7)) * -10 : Math.sin(t * 3) * 3;
  ctx.translate(0, bob);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Head (faceless)
  const headTilt = pose === 'thinking' ? 0.14 : pose === 'sad' ? 0.18 : 0;
  ctx.save();
  ctx.rotate(headTilt);
  ctx.beginPath();
  ctx.arc(0, -72, 24, 0, Math.PI * 2);
  ctx.fillStyle = strokeColor;
  ctx.fill();
  ctx.restore();

  // Torso
  const lean = pose === 'explaining' ? -0.06 : pose === 'sad' ? 0.08 : 0;
  ctx.save();
  ctx.rotate(lean);
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(0, 26);
  ctx.stroke();

  // Arms by pose
  ctx.beginPath();
  if (pose === 'explaining') {
    const wave = Math.sin(t * 6) * 14;
    ctx.moveTo(0, -34);
    ctx.lineTo(-42, -16 + wave);
    ctx.lineTo(-56, -34 + wave);
    ctx.moveTo(0, -34);
    ctx.lineTo(36, -12);
    ctx.lineTo(44, 14);
  } else if (pose === 'thinking') {
    ctx.moveTo(0, -34);
    ctx.lineTo(-28, -22);
    ctx.lineTo(-14, -52);
    ctx.moveTo(0, -34);
    ctx.lineTo(26, -8);
    ctx.lineTo(18, 18);
  } else if (pose === 'shocked') {
    const shake = Math.sin(t * 16) * 4;
    ctx.moveTo(0, -34);
    ctx.lineTo(-42, -56 + shake);
    ctx.lineTo(-34, -84 + shake);
    ctx.moveTo(0, -34);
    ctx.lineTo(42, -56 - shake);
    ctx.lineTo(34, -84 - shake);
  } else if (pose === 'happy') {
    const cheer = Math.sin(t * 8) * 10;
    ctx.moveTo(0, -34);
    ctx.lineTo(-38, -68 + cheer);
    ctx.moveTo(0, -34);
    ctx.lineTo(38, -68 - cheer);
  } else if (pose === 'sad') {
    ctx.moveTo(0, -34);
    ctx.lineTo(-20, 4);
    ctx.lineTo(-14, 24);
    ctx.moveTo(0, -34);
    ctx.lineTo(20, 4);
    ctx.lineTo(14, 24);
  } else {
    ctx.moveTo(0, -34);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-26, 20);
    ctx.moveTo(0, -34);
    ctx.lineTo(28, 0);
    ctx.lineTo(26, 20);
  }
  ctx.stroke();
  ctx.restore();

  // Legs
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.lineTo(-22, 86);
  ctx.moveTo(0, 26);
  ctx.lineTo(22, 86);
  ctx.stroke();

  // Pose visual cues (no face)
  if (pose === 'shocked') {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, -98);
    ctx.lineTo(48, -116);
    ctx.moveTo(46, -82);
    ctx.lineTo(64, -90);
    ctx.stroke();
  } else if (pose === 'thinking') {
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(38, -94, 4, 0, Math.PI * 2);
    ctx.arc(52, -108, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawRemotionSceneFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: SceneItem,
  sceneProgress: number,
  elapsedSec: number,
  visualStyle: VisualStyle,
  brandKit: BrandKit,
  sceneIndex: number,
  totalScenes: number
) {
  const bg = brandKit.bgColor || (visualStyle === 'editorial-clean' ? '#F4F3EF' : '#0B0F17');
  const darkBg = isDarkHexColor(bg);
  const fg = darkBg ? '#F8FAFC' : '#111827';
  const muted = darkBg ? 'rgba(248,250,252,0.65)' : 'rgba(17,24,39,0.65)';
  const cardBg = darkBg ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,39,0.05)';
  const cardBorder = darkBg ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.12)';
  const accent = brandKit.accentColor || '#E77B40';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural grid
  ctx.strokeStyle = darkBg ? 'rgba(255,255,255,0.04)' : 'rgba(17,24,39,0.05)';
  ctx.lineWidth = 1;
  const gridGap = 48;
  for (let gx = 0; gx < width; gx += gridGap) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += gridGap) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  const entrance = Math.min(1, sceneProgress / 0.18);
  const ease = 1 - Math.pow(1 - entrance, 3);
  const ySlide = (1 - ease) * 28;

  // Watermark & Scene index header
  ctx.save();
  ctx.fillStyle = muted;
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`0${sceneIndex + 1} / 0${totalScenes}`, 36, 48);

  if (brandKit.watermarkEnabled && brandKit.watermark.trim()) {
    const position = brandKit.watermarkPosition ?? 'top-left';
    const isBottom = position === 'bottom-left' || position === 'bottom-right';
    const isLeft = position === 'top-left' || position === 'bottom-left';
    ctx.textAlign = isLeft ? 'left' : 'right';
    ctx.font = '600 20px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      brandKit.watermark.trim(),
      isLeft ? 36 : width - 36,
      isBottom ? height - 96 : position === 'top-left' ? 84 : 48
    );
  }
  ctx.restore();

  const isPortrait = height > width;

  // Visual element block
  ctx.save();
  ctx.globalAlpha = ease;
  ctx.translate(0, ySlide);

  const cardW = isPortrait ? width - 88 : Math.min(540, width * 0.48);
  const cardH = isPortrait ? 240 : 230;
  const cardX = isPortrait ? 44 : width - cardW - 56;
  const cardY = isPortrait ? height * 0.14 : height * 0.2;

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.strokeStyle = cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Accent bar inside visual card
  drawRoundedRect(ctx, cardX + cardW - 140, cardY + 24, 112, 4, 2);
  ctx.fillStyle = accent;
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = muted;
  ctx.font = '600 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(scene.visualLabel || scene.title, cardX + cardW - 28, cardY + 62);

  ctx.fillStyle = fg;
  const valFontSize = scene.visualType === 'stat-number' ? 54 : 34;
  ctx.font = `700 ${valFontSize}px "Cairo", "IBM Plex Sans Arabic", sans-serif`;
  const valLines = wrapArabicText(ctx, scene.visualValue || scene.title, cardW - 56);
  valLines.slice(0, 3).forEach((line, i) => {
    ctx.fillStyle = i === 0 && scene.visualType === 'stat-number' ? accent : fg;
    ctx.fillText(line, cardX + cardW - 28, cardY + 122 + i * 44);
  });

  if (scene.visualType === 'bar-chart') {
    const bars = [0.42, 0.68, 0.94, 0.78];
    const barW = 28;
    const gap = 18;
    const baseX = cardX + 36;
    const baseY = cardY + cardH - 28;
    bars.forEach((ratio, idx) => {
      const h = ratio * 95 * ease;
      ctx.fillStyle = idx === 2 ? accent : cardBorder;
      drawRoundedRect(ctx, baseX + idx * (barW + gap), baseY - h, barW, h, 6);
      ctx.fill();
    });
  }
  ctx.restore();

  // Stickman or geometric centerpiece
  const dataHeavy = ['generative-scene', 'comparison-box', 'bar-chart', 'line-chart', 'circular-gauge', 'step-timeline'].includes(
    scene.visualType
  );
  const showsCharacter =
    visualStyle === 'stickman' ||
    (visualStyle === 'smart-mix' && (scene.showCharacter ?? !dataHeavy));
  if (showsCharacter) {
    const stickX = isPortrait ? width / 2 : width * 0.26;
    const stickY = isPortrait ? height * 0.56 : height * 0.46;
    const stickScale = isPortrait ? 1.35 : 1.25;
    drawCanvasStickman(ctx, stickX, stickY, stickScale, scene.pose, elapsedSec, fg, accent);
  } else {
    const orbX = isPortrait ? width / 2 : width * 0.25;
    const orbY = isPortrait ? height * 0.54 : height * 0.45;
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 72 + Math.sin(elapsedSec * 2.5) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = cardBg;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Compact 2-4 word caption chunk synced to scene progress
  ctx.save();
  ctx.globalAlpha = ease;
  const captionWords = (scene.narration || '').trim().split(/\s+/).filter(Boolean);
  const chunkSize = captionWords.length <= 3 ? Math.max(2, captionWords.length) : 3;
  const chunkCount = Math.max(1, Math.ceil(captionWords.length / chunkSize));
  const chunkIndex = Math.min(
    chunkCount - 1,
    Math.floor(sceneProgress * chunkCount)
  );
  const chunkWords = captionWords.slice(
    chunkIndex * chunkSize,
    chunkIndex * chunkSize + chunkSize
  );
  const captionPad = 40;
  const captionFont = isPortrait ? 34 : 30;
  ctx.font = `700 ${captionFont}px "IBM Plex Sans Arabic", sans-serif`;
  const chunkText = chunkWords.join(' ');
  const textWidth = Math.min(width - captionPad * 2, ctx.measureText(chunkText).width + 72);
  const boxW = Math.max(180, textWidth);
  const boxH = captionFont + 40;
  const boxX = (width - boxW) / 2;
  const boxY = height - boxH - 44;

  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.fillStyle = darkBg ? 'rgba(9,13,22,0.82)' : 'rgba(17,24,39,0.9)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(chunkText, width / 2, boxY + 40);
  const activeWidth = ctx.measureText(
    chunkWords[Math.max(0, chunkWords.length - 2)] || ''
  ).width;
  drawRoundedRect(
    ctx,
    width / 2 - activeWidth / 2 - 8,
    boxY + boxH - 12,
    activeWidth + 16,
    4,
    2
  );
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.restore();

  // Bottom progress track
  ctx.fillStyle = cardBorder;
  ctx.fillRect(0, height - 6, width, 6);
  const overallProgress = (sceneIndex + sceneProgress) / Math.max(1, totalScenes);
  ctx.fillStyle = accent;
  ctx.fillRect(0, height - 6, width * overallProgress, 6);
}

export interface RenderedVideoResult {
  blobUrl: string;
  mimeType: string;
  extension: string;
  fileSizeBytes: number;
  downloadName?: string;
}

export async function renderScenesToVideo(params: {
  scenes: SceneItem[];
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  fps: FpsOption;
  brandKit: BrandKit;
  sfx: SfxConfig;
  onProgress?: (percent: number) => void;
}): Promise<RenderedVideoResult> {
  const { scenes, visualStyle, aspectRatio, fps, brandKit, sfx, onProgress } = params;
  const { width, height } = getRenderResolution(aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize the browser 2D rendering context.');
  }

  // Audio mix setup (SFX + any generated scene audio)
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  if (AudioCtx) {
    audioCtx = new AudioCtx();
    audioDest = audioCtx.createMediaStreamDestination();
    // Silent carrier to keep audio track active
    const silentOsc = audioCtx.createOscillator();
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0.0001;
    silentOsc.connect(silentGain);
    silentGain.connect(audioDest);
    silentOsc.start();

    let offsetSec = audioCtx.currentTime + 0.05;
    for (const scene of scenes) {
      if (sfx.enabled) {
        const sfxUrl = resolveSceneSfxUrl(scene.sfxId, scene.visualType);
        if (sfxUrl) {
          try {
            const resp = await fetch(sfxUrl);
            const arrBuf = await resp.arrayBuffer();
            const decoded = await audioCtx.decodeAudioData(arrBuf);
            const source = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            gain.gain.value = Math.min(MAX_SCENE_SFX_VOLUME, Math.max(0.01, sfx.volume));
            source.buffer = decoded;
            source.connect(gain);
            gain.connect(audioDest);
            source.start(offsetSec);
          } catch {
            // Ignore invalid/blocked sound effect
          }
        }
      }

      if (scene.audioDataUrl) {
        try {
          const resp = await fetch(scene.audioDataUrl);
          const arrBuf = await resp.arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(arrBuf);
          const source = audioCtx.createBufferSource();
          source.buffer = decoded;
          source.connect(audioDest);
          source.start(offsetSec);
        } catch {
          // Ignore invalid/blocked audio buffer
        }
      }

      offsetSec += scene.durationSec;
    }
    silentOsc.stop(offsetSec + 0.1);
  }

  const videoStream = canvas.captureStream(fps);
  const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
  if (audioDest) {
    combinedTracks.push(...audioDest.stream.getAudioTracks());
  }
  const combinedStream = new MediaStream(combinedTracks);

  const candidateTypes = [
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];

  const chosen =
    candidateTypes.find((c) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) || {
      mime: 'video/webm',
      ext: 'webm',
    };

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosen.mime,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const totalDurationSec = scenes.reduce((acc, s) => acc + s.durationSec, 0);

  return await new Promise<RenderedVideoResult>((resolve, reject) => {
    recorder.onerror = () => {
      if (audioCtx) void audioCtx.close();
      reject(new Error('Could not record the video stream in the browser.'));
    };

    recorder.onstop = () => {
      if (audioCtx) void audioCtx.close();
      const blob = new Blob(chunks, { type: chosen.mime });
      const blobUrl = URL.createObjectURL(blob);
      resolve({
        blobUrl,
        mimeType: chosen.mime,
        extension: chosen.ext,
        fileSizeBytes: blob.size,
      });
    };

    recorder.start(200);
    const startMs = performance.now();

    const tick = () => {
      const elapsedSec = (performance.now() - startMs) / 1000;
      if (elapsedSec >= totalDurationSec) {
        onProgress?.(100);
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        return;
      }

      let acc = 0;
      let currentIdx = scenes.length - 1;
      let sceneProgress = 1;
      for (let i = 0; i < scenes.length; i++) {
        const dur = scenes[i].durationSec;
        if (elapsedSec < acc + dur) {
          currentIdx = i;
          sceneProgress = (elapsedSec - acc) / Math.max(0.1, dur);
          break;
        }
        acc += dur;
      }

      drawRemotionSceneFrame(
        ctx,
        width,
        height,
        scenes[currentIdx],
        sceneProgress,
        elapsedSec,
        visualStyle,
        brandKit,
        currentIdx,
        scenes.length
      );

      onProgress?.(Math.min(99, Math.round((elapsedSec / totalDurationSec) * 100)));
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}
