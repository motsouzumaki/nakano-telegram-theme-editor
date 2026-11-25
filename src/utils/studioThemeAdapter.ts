import type { ThemeColors, ThemeSettings } from '../types/theme';
import type { ExtractedWallpaperPalette } from './wallpaperThemeExtractor';
import {
  hexToRgb,
  rgbToHsl,
  hslToHex,
  getBaseRgbHex,
  getLuminance,
  getContrastRatio,
} from './colorUtils';

export interface AdaptiveStudioTheme {
  cssVars: Record<string, string>;
  primaryHex: string;
  secondaryHex: string;
  surfaceBaseHex: string;
  isAmoled: boolean;
  isLightWallpaper: boolean;
  moodLabel: string;
  scrimOpacity: number;
}

export const DEFAULT_STUDIO_CSS_VARS: Record<string, string> = {
  '--color-brand-50': '#eef8ff',
  '--color-brand-100': '#d9f0ff',
  '--color-brand-300': '#7dd3fc',
  '--color-brand-400': '#38bdf8',
  '--color-brand-500': '#2AABEE',
  '--color-brand-600': '#0284c7',
  '--color-brand-700': '#0369a1',
  '--color-brand-secondary': '#6366f1',
  '--color-brand-on-primary': '#ffffff',
  '--color-brand-glow': 'rgba(42, 171, 238, 0.35)',
  '--color-brand-glow-strong': 'rgba(42, 171, 238, 0.48)',
  '--color-accent': '#2AABEE',
  '--color-accent-bright': '#38bdf8',
  '--color-surface-base': '#090a0f',
  '--color-surface-panel': '#10121a',
  '--color-surface-card': '#161922',
  '--color-surface-cardHover': '#1c202c',
  '--color-surface-border': '#232838',
  '--color-canvas-bg': '#0b0c10',
  '--color-canvas-dot': '#1e2230',
  '--color-scrollbar-thumb': '#272d3f',
  '--color-scrollbar-thumb-hover': '#39425d',
  '--shadow-glow-cyan': '0 0 20px -3px rgba(42, 171, 238, 0.45)',
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function isValidHex(val?: string): val is string {
  if (!val) return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim());
}

/**
 * Ensures a foreground accent color meets a target WCAG contrast ratio on a dark surface
 * by incrementally lifting lightness while preserving hue.
 */
function ensureAccentContrastOnDark(
  hue: number,
  sat: number,
  startLightness: number,
  bgHex: string,
  minRatio = 4.8
): string {
  let l = clamp(startLightness, 48, 86);
  let candidate = hslToHex(hue, sat, l);
  let guard = 0;
  while (getContrastRatio(bgHex, candidate) < minRatio && l < 88 && guard < 20) {
    l = Math.min(88, l + 3);
    candidate = hslToHex(hue, Math.max(25, sat - guard * 1.5), l);
    guard++;
  }
  return candidate;
}

/**
 * Computes a complete, contrast-guaranteed adaptive Studio UI theme derived
 * directly from the active wallpaper (photo, gradient, or theme palette).
 */
export function computeStudioTheme(params: {
  colors: ThemeColors;
  settings: ThemeSettings;
  extractedPalette: ExtractedWallpaperPalette | null;
  enabled: boolean;
}): AdaptiveStudioTheme {
  const { colors, settings, extractedPalette, enabled } = params;

  if (!enabled) {
    return {
      cssVars: { ...DEFAULT_STUDIO_CSS_VARS },
      primaryHex: '#2AABEE',
      secondaryHex: '#6366f1',
      surfaceBaseHex: '#090a0f',
      isAmoled: false,
      isLightWallpaper: false,
      moodLabel: 'Default Studio',
      scrimOpacity: 0,
    };
  }

  // 1. Detect OLED / Light states from active Telegram theme & wallpaper
  const windowBg = getBaseRgbHex(colors.windowBackgroundWhite || '#0e1621');
  const wallBg = getBaseRgbHex(colors.chat_wallpaper || '#0e1621');
  const isAmoled =
    getLuminance(windowBg) < 0.008 &&
    getLuminance(wallBg) < 0.012 &&
    !(settings.wallpaperType === 'image' && extractedPalette && !extractedPalette.isDarkWallpaper);

  const isLightTheme = getLuminance(windowBg) > 0.55;
  const isLightWallpaper =
    settings.wallpaperType === 'image' && extractedPalette
      ? !extractedPalette.isDarkWallpaper
      : settings.wallpaperType === 'gradient'
      ? (getLuminance(getBaseRgbHex(settings.wallpaperGradient.color1)) +
          getLuminance(getBaseRgbHex(settings.wallpaperGradient.color2))) /
          2 >
        0.45
      : isLightTheme;

  // 2. Resolve primary, secondary, and surface seed colors
  const themeAccentRaw = [
    colors.chats_unreadCounter,
    colors.chat_messagePanelSend,
    colors.chats_actionFAB,
    colors.actionBarTabActiveText,
    colors.chat_outBubble,
  ].find(isValidHex);

  const themeAccent = themeAccentRaw ? getBaseRgbHex(themeAccentRaw) : undefined;
  const themeAccentHsl = themeAccent
    ? rgbToHsl(hexToRgb(themeAccent).r, hexToRgb(themeAccent).g, hexToRgb(themeAccent).b)
    : null;

  let primarySeedHex = '#2AABEE';
  let secondarySeedHex = '#6366f1';
  let surfaceHue = 215;
  let surfaceBaseSat = 18;
  let moodLabel = 'Adaptive Theme';

  if (settings.wallpaperType === 'image' && extractedPalette) {
    // Prefer the active theme accent if it is chromatic (respects user clicking Extracted Seeds),
    // otherwise fall back directly to the wallpaper's Oklab-extracted primary color.
    if (themeAccent && themeAccentHsl && themeAccentHsl.s >= 14) {
      primarySeedHex = themeAccent;
    } else {
      primarySeedHex = getBaseRgbHex(extractedPalette.primary);
    }

    secondarySeedHex = getBaseRgbHex(extractedPalette.secondary);
    surfaceHue = extractedPalette.dominantHue;
    const domRgb = hexToRgb(getBaseRgbHex(extractedPalette.dominant));
    const domHsl = rgbToHsl(domRgb.r, domRgb.g, domRgb.b);
    surfaceBaseSat = domHsl.s < 10 ? 5 : clamp(Math.round(domHsl.s * 0.34), 12, 24);
    moodLabel = extractedPalette.moodDescription;
  } else if (settings.wallpaperType === 'gradient') {
    const g1 = getBaseRgbHex(settings.wallpaperGradient.color1 || '#0e1621');
    const g2 = getBaseRgbHex(settings.wallpaperGradient.color2 || '#1b2838');
    const g1Hsl = rgbToHsl(hexToRgb(g1).r, hexToRgb(g1).g, hexToRgb(g1).b);
    const g2Hsl = rgbToHsl(hexToRgb(g2).r, hexToRgb(g2).g, hexToRgb(g2).b);

    // Pick whichever gradient stop is more vibrant if theme accent is uncustomized
    const vibrantStop = g1Hsl.s >= g2Hsl.s ? g1 : g2;
    const otherStop = g1Hsl.s >= g2Hsl.s ? g2 : g1;
    primarySeedHex = themeAccent && themeAccentHsl && themeAccentHsl.s >= 18 ? themeAccent : vibrantStop;
    secondarySeedHex = otherStop;
    surfaceHue = g1Hsl.s >= g2Hsl.s ? g1Hsl.h : g2Hsl.h;
    surfaceBaseSat = clamp(Math.round(Math.max(g1Hsl.s, g2Hsl.s) * 0.32), 10, 22);
    moodLabel = 'Gradient Atmosphere';
  } else {
    primarySeedHex = themeAccent || '#2AABEE';
    const wallRgb = hexToRgb(wallBg);
    const wallHsl = rgbToHsl(wallRgb.r, wallRgb.g, wallRgb.b);
    const primRgb = hexToRgb(primarySeedHex);
    const primHsl = rgbToHsl(primRgb.r, primRgb.g, primRgb.b);

    surfaceHue = wallHsl.s > 8 ? wallHsl.h : primHsl.h;
    surfaceBaseSat = primHsl.s < 10 ? 5 : clamp(Math.round(primHsl.s * 0.28), 10, 20);
    secondarySeedHex = hslToHex((primHsl.h + 28) % 360, clamp(primHsl.s, 45, 85), 55);
    moodLabel = 'Theme Synchronized';
  }

  // 3. Build wallpaper-tinted dark glass surface scale (avoids muddy browns)
  const isWarmBrownBand = surfaceHue >= 18 && surfaceHue <= 58;
  const tunedSurfSat = isWarmBrownBand ? Math.min(surfaceBaseSat, 14) : surfaceBaseSat;

  const surfaceBase = isAmoled
    ? '#020203'
    : hslToHex(surfaceHue, tunedSurfSat, 5);
  const surfacePanel = isAmoled
    ? hslToHex(surfaceHue, Math.min(12, tunedSurfSat), 3.5)
    : hslToHex(surfaceHue, tunedSurfSat, 8.5);
  const surfaceCard = isAmoled
    ? hslToHex(surfaceHue, Math.min(16, tunedSurfSat), 6.5)
    : hslToHex(surfaceHue, Math.min(25, tunedSurfSat + 2), 12.5);
  const surfaceCardHover = isAmoled
    ? hslToHex(surfaceHue, Math.min(20, tunedSurfSat + 2), 10.5)
    : hslToHex(surfaceHue, Math.min(28, tunedSurfSat + 3), 16.5);
  const surfaceBorder = isAmoled
    ? hslToHex(surfaceHue, Math.min(28, tunedSurfSat + 8), 16)
    : hslToHex(surfaceHue, Math.min(30, tunedSurfSat + 6), 22);
  const canvasBg = isAmoled
    ? '#000000'
    : hslToHex(surfaceHue, tunedSurfSat, 4.5);
  const canvasDot = isAmoled
    ? hslToHex(surfaceHue, Math.min(28, tunedSurfSat + 8), 19)
    : hslToHex(surfaceHue, Math.min(32, tunedSurfSat + 8), 26);
  const scrollbarThumb = hslToHex(surfaceHue, Math.min(26, tunedSurfSat + 5), isAmoled ? 18 : 24);
  const scrollbarThumbHover = hslToHex(surfaceHue, Math.min(34, tunedSurfSat + 8), isAmoled ? 28 : 34);

  // 4. Build contrast-safe Brand / Accent scale from primarySeedHex
  const primRgb = hexToRgb(primarySeedHex);
  const primHsl = rgbToHsl(primRgb.r, primRgb.g, primRgb.b);
  const isMonochrome = primHsl.s < 12;

  const brandH = primHsl.h;
  const brandS = isMonochrome ? 14 : clamp(primHsl.s, 48, 88);

  // Yellow/lime band (45-105deg) has high perceptual luminance; keep 500 slightly richer
  const isBrightHueBand = brandH >= 45 && brandH <= 110;
  const brand500L = isMonochrome ? 52 : isBrightHueBand ? 45 : clamp(primHsl.l, 45, 56);
  const brand500 = hslToHex(brandH, brandS, brand500L);
  const brand600 = hslToHex(brandH, Math.min(92, brandS + 4), clamp(brand500L - 8, 32, 48));
  const brand700 = hslToHex(brandH, Math.min(94, brandS + 6), clamp(brand500L - 15, 24, 40));

  // Ensure brand-400 (text accents, active tabs, icons) has >= 4.8:1 contrast on surfaceCard
  const brand400 = ensureAccentContrastOnDark(
    brandH,
    isMonochrome ? 16 : clamp(brandS + 4, 52, 92),
    clamp(brand500L + 13, 62, 74),
    surfaceCard,
    4.8
  );

  // Lighter tints for badges, code tags, and highlights
  const brand300 = ensureAccentContrastOnDark(
    brandH,
    isMonochrome ? 18 : clamp(brandS, 48, 86),
    78,
    surfaceCard,
    7.0
  );
  const brand100 = hslToHex(brandH, isMonochrome ? 15 : clamp(brandS - 10, 35, 80), 91);
  const brand50 = hslToHex(brandH, isMonochrome ? 12 : clamp(brandS - 18, 25, 75), 96);

  // Secondary harmonious accent for logo gradient & ambient spotlight
  const secRgb = hexToRgb(secondarySeedHex);
  const secHsl = rgbToHsl(secRgb.r, secRgb.g, secRgb.b);
  const brandSecondary = hslToHex(
    secHsl.s < 12 ? (brandH + 34) % 360 : secHsl.h,
    isMonochrome ? 16 : clamp(secHsl.s, 45, 84),
    clamp(secHsl.l, 48, 60)
  );

  // Primary button foreground color (guaranteed contrast on brand-500)
  const brandOnPrimary = getContrastRatio(brand500, '#ffffff') >= 4.0 ? '#ffffff' : '#090a0f';

  // Glow rgba values derived from brand500
  const b500Rgb = hexToRgb(brand500);
  const brandGlow = `rgba(${b500Rgb.r}, ${b500Rgb.g}, ${b500Rgb.b}, 0.36)`;
  const brandGlowStrong = `rgba(${b500Rgb.r}, ${b500Rgb.g}, ${b500Rgb.b}, 0.5)`;

  // Scrim opacity controls how prominently the blurred wallpaper shines through the canvas
  const scrimOpacity = isAmoled ? 0.82 : isLightWallpaper ? 0.52 : 0.6;

  return {
    cssVars: {
      '--color-brand-50': brand50,
      '--color-brand-100': brand100,
      '--color-brand-300': brand300,
      '--color-brand-400': brand400,
      '--color-brand-500': brand500,
      '--color-brand-600': brand600,
      '--color-brand-700': brand700,
      '--color-brand-secondary': brandSecondary,
      '--color-brand-on-primary': brandOnPrimary,
      '--color-brand-glow': brandGlow,
      '--color-brand-glow-strong': brandGlowStrong,
      '--color-accent': brand500,
      '--color-accent-bright': brand400,
      '--color-surface-base': surfaceBase,
      '--color-surface-panel': surfacePanel,
      '--color-surface-card': surfaceCard,
      '--color-surface-cardHover': surfaceCardHover,
      '--color-surface-border': surfaceBorder,
      '--color-canvas-bg': canvasBg,
      '--color-canvas-dot': canvasDot,
      '--color-scrollbar-thumb': scrollbarThumb,
      '--color-scrollbar-thumb-hover': scrollbarThumbHover,
      '--shadow-glow-cyan': `0 0 20px -3px ${brandGlowStrong}`,
    },
    primaryHex: brand500,
    secondaryHex: brandSecondary,
    surfaceBaseHex: surfaceBase,
    isAmoled,
    isLightWallpaper,
    moodLabel,
    scrimOpacity,
  };
}

/**
 * Applies the computed CSS custom properties to the document root.
 */
export function applyStudioThemeToDocument(cssVars: Record<string, string>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }
}
