export type Layout = {
  width: number;
  height: number;
  fps: number;
  unit: number;
  isPortrait: boolean;
  isWide: boolean;
  isSquare: boolean;
  padding: number;
  safeInsetX: number;
  safeTop: number;
  contentMaxHeightRatio: number;
  gap: number;
  captionSpace: number;
  titleSize: number;
  subtitleSize: number;
  kickerSize: number;
  bodySize: number;
  smallSize: number;
  bigNumberSize: number;
  cardPadding: number;
  characterHeight: number;
  characterWidth: number;
};

export const getLayout = (width: number, height: number, fps: number): Layout => {
  const unit = Math.min(width, height) / 1080;
  const ratio = width / height;
  const isPortrait = ratio < 0.85;
  const isWide = ratio >= 1.2;
  const isSquare = !isPortrait && !isWide;
  const safeInsetX = isWide
    ? Math.max(64, Math.round(width * 0.038))
    : isSquare
      ? Math.max(56, Math.round(width * 0.052))
      : Math.max(64, Math.round(width * 0.059));
  const safeTop = isWide
    ? Math.max(48, Math.round(height * 0.048))
    : isSquare
      ? Math.max(48, Math.round(height * 0.052))
      : Math.max(80, Math.round(height * 0.042));
  const padding = safeInsetX;
  const gap = Math.round(Math.min(width, height) * 0.022);
  const captionSpace = Math.max(
    220,
    Math.round(height * (isPortrait ? 0.155 : isSquare ? 0.18 : 0.19)),
  );
  const contentMaxHeightRatio = isWide ? 0.72 : isSquare ? 0.9 : 1;

  const rawTitleSize = isWide
    ? Math.min(width * 0.056, height * 0.11)
    : isSquare
      ? Math.min(width * 0.064, height * 0.085)
      : Math.min(width * 0.078, height * 0.058);
  const titleSize = isPortrait
    ? Math.min(68, Math.max(54, Math.round(rawTitleSize)))
    : Math.round(rawTitleSize);

  const bodySize = isWide
    ? width * 0.018
    : isSquare
      ? width * 0.022
      : width * 0.029;

  return {
    width,
    height,
    fps,
    unit,
    isPortrait,
    isWide,
    isSquare,
    padding,
    safeInsetX,
    safeTop,
    contentMaxHeightRatio,
    gap,
    captionSpace,
    titleSize,
    subtitleSize: Math.max(
      30,
      Math.round(
        isWide ? width * 0.021 : isSquare ? width * 0.026 : width * 0.034,
      ),
    ),
    kickerSize: Math.max(
      26,
      Math.round(
        isWide ? width * 0.014 : isSquare ? width * 0.016 : width * 0.019,
      ),
    ),
    bodySize: Math.max(30, Math.round(bodySize)),
    smallSize: Math.max(30, Math.round(bodySize * 0.82)),
    bigNumberSize: Math.round(
      isWide ? width * 0.12 : isSquare ? width * 0.1 : width * 0.155,
    ),
    cardPadding: Math.round(
      width * (isWide ? 0.018 : isSquare ? 0.02 : 0.034),
    ),
    characterHeight: Math.round(
      isWide
        ? height * 0.72
        : isSquare
          ? height * 0.55
          : Math.min(height * 0.22, width * 0.56),
    ),
    characterWidth: Math.round(
      isWide
        ? width * 0.38
        : isSquare
          ? width * 0.32
          : Math.min(width * 0.5, height * 0.2),
    ),
  };
};
