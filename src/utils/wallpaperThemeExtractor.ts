import type { ThemeColors, GeneratorEngine } from '../types/theme';
import {
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToHex,
  normalizeThemeColors,
  getReadableTextColor,
  getContrastRatio,
  blend,
  adjustBrightness,
  getLuminance,
  createFullTelegramTheme,
  type ThemeTokens,
} from './colorUtils';

export type WallpaperThemeStyle =
  | 'tonal'        // Material You balanced (Default)
  | 'vibrant'      // High chroma, punchy
  | 'muted'        // Soft, elegant, pastel
  | 'expressive'   // Complementary / duo-tone
  | 'glass'        // Translucent blurred glass
  | 'moody';       // Deep atmospheric

export interface ExtractedColorEntry {
  hex: string;
  role: 'primary' | 'secondary' | 'tertiary' | 'dominant' | 'muted' | 'lightSurface' | 'darkSurface';
  label: string;
  score: number;
  population: number; // 0..1
  h: number;
  s: number;
  l: number;
  wcagLightContrast: number;
  wcagDarkContrast: number;
}

export interface ExtractedWallpaperPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  darkSurface: string;
  lightSurface: string;
  dominant: string;
  muted: string;
  swatches: string[];
  detailedSwatches: ExtractedColorEntry[];
  dominantHue: number;
  isDarkWallpaper: boolean;
  averageLuminance: number;
  moodDescription: string;
}

// ==========================================
// Perceptual Color Science (Oklab & Linear RGB)
// ==========================================

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

interface OklabColor {
  L: number;
  a: number;
  b: number;
  chroma: number;
  hue: number; // 0..360
}

/**
 * Converts sRGB to perceptual Oklab color space (L: 0..1, a: ~-0.4..0.4, b: ~-0.4..0.4)
 */
function rgbToOklab(r: number, g: number, b: number): OklabColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const chroma = Math.sqrt(a * a + b_ * b_);
  const hueRad = Math.atan2(b_, a);
  const hueDeg = ((hueRad * 180 / Math.PI) + 360) % 360;

  return { L, a, b: b_, chroma, hue: hueDeg };
}

/**
 * Calculates Euclidean perceptual distance in Oklab color space
 */
function oklabDistance(c1: OklabColor, c2: OklabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Calculates angular difference between two hues (0..180)
 */
function hueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// ==========================================
// Quantization & Perceptual Color Clustering
// ==========================================

interface ColorBin {
  rSum: number;
  gSum: number;
  bSum: number;
  count: number;
}

interface Cluster {
  r: number;
  g: number;
  b: number;
  hex: string;
  oklab: OklabColor;
  hsl: { h: number; s: number; l: number };
  count: number;
  population: number;
  themeScore: number;
}

/**
 * Extracts dominant, vibrant, and surface colors from an image source using
 * modern Oklab perceptual color clustering and Material You Monet-inspired scoring.
 */
export async function extractWallpaperColors(
  imageSource: string | Blob
): Promise<ExtractedWallpaperPalette> {
  let url = '';
  let shouldRevoke = false;

  if (typeof imageSource === 'string') {
    url = imageSource;
  } else {
    url = URL.createObjectURL(imageSource);
    shouldRevoke = true;
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load wallpaper image for color extraction'));
      img.src = url;
    });

    // Sample size: 128x128 provides 16,384 pixels for high-precision clustering in <15ms
    const sampleSize = 128;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    // 5-bit color space quantization (32x32x32 = 32,768 bins)
    const bins = new Map<number, ColorBin>();
    let totalValidPixels = 0;
    let totalLuminance = 0;

    for (let i = 0; i < imgData.length; i += 8) { // step by 2 pixels (8 bytes)
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const a = imgData[i + 3];

      if (a < 128) continue; // skip transparent

      // Quantize to 5 bits per channel
      const rBin = r >> 3;
      const gBin = g >> 3;
      const bBin = b >> 3;
      const key = (rBin << 10) | (gBin << 5) | bBin;

      const existing = bins.get(key);
      if (existing) {
        existing.rSum += r;
        existing.gSum += g;
        existing.bSum += b;
        existing.count++;
      } else {
        bins.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
      }

      totalValidPixels++;
      totalLuminance += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    if (totalValidPixels === 0) {
      totalValidPixels = 1;
    }

    const avgLuminance = totalLuminance / totalValidPixels;
    const isDarkWallpaper = avgLuminance < 0.42;

    // Convert non-trivial bins to cluster candidates
    const rawCandidates: { r: number; g: number; b: number; count: number; oklab: OklabColor }[] = [];
    const minPixelThreshold = Math.max(2, Math.floor(totalValidPixels * 0.0008));

    bins.forEach(bin => {
      if (bin.count >= minPixelThreshold) {
        const r = Math.round(bin.rSum / bin.count);
        const g = Math.round(bin.gSum / bin.count);
        const b = Math.round(bin.bSum / bin.count);
        rawCandidates.push({
          r,
          g,
          b,
          count: bin.count,
          oklab: rgbToOklab(r, g, b),
        });
      }
    });

    // Sort by count descending for greedy cluster merging
    rawCandidates.sort((a, b) => b.count - a.count);

    // Merge visually similar bins (Oklab distance < 0.065)
    const clusters: Cluster[] = [];
    const MERGE_DISTANCE = 0.065;

    for (const cand of rawCandidates) {
      let merged = false;
      for (const cl of clusters) {
        if (oklabDistance(cand.oklab, cl.oklab) < MERGE_DISTANCE) {
          // Weighted centroid update
          const newCount = cl.count + cand.count;
          cl.r = Math.round((cl.r * cl.count + cand.r * cand.count) / newCount);
          cl.g = Math.round((cl.g * cl.count + cand.g * cand.count) / newCount);
          cl.b = Math.round((cl.b * cl.count + cand.b * cand.count) / newCount);
          cl.count = newCount;
          cl.population = newCount / totalValidPixels;
          cl.hex = rgbToHex(cl.r, cl.g, cl.b);
          cl.oklab = rgbToOklab(cl.r, cl.g, cl.b);
          cl.hsl = rgbToHsl(cl.r, cl.g, cl.b);
          merged = true;
          break;
        }
      }

      if (!merged) {
        const hex = rgbToHex(cand.r, cand.g, cand.b);
        const hsl = rgbToHsl(cand.r, cand.g, cand.b);
        clusters.push({
          r: cand.r,
          g: cand.g,
          b: cand.b,
          hex,
          oklab: cand.oklab,
          hsl,
          count: cand.count,
          population: cand.count / totalValidPixels,
          themeScore: 0,
        });
      }
    }

    // Check if the entire wallpaper is monochromatic / grayscale
    const colorfulPixels = clusters
      .filter(c => c.oklab.chroma > 0.038)
      .reduce((sum, c) => sum + c.count, 0);
    const isMonochromeWallpaper = colorfulPixels / totalValidPixels < 0.12;

    // ==========================================
    // Advanced Scoring Formula (Material You Monet inspired)
    // ==========================================
    for (const c of clusters) {
      const p = c.population;
      // Population factor with diminishing returns (log scale)
      const popScore = Math.min(1.0, Math.log1p(35 * p) / Math.log(36));

      // Chroma factor: peak desirability at 0.12-0.18, penalizing grey mud or harsh neon outliers
      const optimalChroma = 0.14;
      const chromaDelta = c.oklab.chroma - optimalChroma;
      const chromaScore = Math.exp(-(chromaDelta * chromaDelta) / (2 * 0.065 * 0.065));

      // Lightness factor: ideal accent is around L=0.48-0.65; extremes get penalized
      const lightDistance = Math.abs(c.oklab.L - 0.52);
      const lightScore = Math.max(0, 1 - 2.2 * Math.pow(lightDistance, 1.4));

      // Aesthetic bonus for pleasing interface hues (blues 200-240, teals 160-190, warm golds 30-60)
      const h = c.hsl.h;
      let hueBonus = 0;
      if (h >= 190 && h <= 245) hueBonus = 0.15; // Blues & Cyans
      else if (h >= 246 && h <= 285) hueBonus = 0.12; // Purples & Violets
      else if (h >= 25 && h <= 55) hueBonus = 0.14; // Warm Golds & Ambers
      else if (h >= 140 && h <= 180) hueBonus = 0.12; // Emeralds & Mints

      if (isMonochromeWallpaper) {
        c.themeScore = popScore * 2.0 + lightScore * 1.5;
      } else {
        const greyPenalty = c.oklab.chroma < 0.035 ? 0.15 : 1.0;
        c.themeScore = (chromaScore * 2.3 + popScore * 1.4 + lightScore * 1.1 + hueBonus) * greyPenalty;
      }
    }

    // Sort clusters by score
    clusters.sort((a, b) => b.themeScore - a.themeScore);

    // 1. Dominant Color (highest population)
    const dominantCluster = [...clusters].sort((a, b) => b.population - a.population)[0] || clusters[0];
    const dominantHex = dominantCluster?.hex || '#4ea4f5';

    // 2. Primary Accent Color (highest theme score)
    const primaryCluster = clusters[0] || dominantCluster;
    const primaryHex = primaryCluster?.hex || dominantHex;
    const primHue = primaryCluster?.hsl.h ?? 210;

    // 3. Secondary Accent (Harmonious neighbor or complementary hue)
    const secondaryCandidate = clusters.find(c => {
      const diff = hueDifference(c.hsl.h, primHue);
      return diff >= 28 && diff <= 95 && c.oklab.chroma > 0.03;
    });
    const secondaryHex = secondaryCandidate?.hex || hslToHex((primHue + 42) % 360, Math.max(50, primaryCluster.hsl.s), 56);

    // 4. Tertiary Accent (Contrast / Complementary)
    const tertiaryCandidate = clusters.find(c => {
      const diff1 = hueDifference(c.hsl.h, primHue);
      const diff2 = secondaryCandidate ? hueDifference(c.hsl.h, secondaryCandidate.hsl.h) : 60;
      return diff1 >= 85 && diff2 >= 40 && c.oklab.chroma > 0.03;
    });
    const tertiaryHex = tertiaryCandidate?.hex || hslToHex((primHue + 160) % 360, Math.max(45, primaryCluster.hsl.s), 52);

    // 5. Muted / Pastel Tone
    const mutedCandidate = clusters.find(c => {
      return c.oklab.chroma >= 0.025 && c.oklab.chroma <= 0.09 && c.oklab.L >= 0.38 && c.oklab.L <= 0.72;
    });
    const mutedHex = mutedCandidate?.hex || hslToHex(primHue, Math.min(35, primaryCluster.hsl.s), 62);

    // 6. Dark Surface (Ambient dark tone from wallpaper)
    const darkSurfaceCandidate = clusters
      .filter(c => c.oklab.L >= 0.05 && c.oklab.L <= 0.22)
      .sort((a, b) => b.population - a.population)[0];
    let darkSurfaceHex = darkSurfaceCandidate?.hex || hslToHex(primHue, 12, 11);
    if (darkSurfaceCandidate) {
      const { h: dH, s: dS, l: dL } = darkSurfaceCandidate.hsl;
      // If candidate has muddy warm brown hue (10-45) or excessive dirty warmth, sanitize to clean dark slate
      if ((dH >= 10 && dH <= 50 && dS > 8) || (dS > 20 && dL < 15)) {
        darkSurfaceHex = hslToHex(dH, Math.min(dS, 8), Math.min(dL, 11));
      }
    }

    // 7. Light Surface (Ambient light tone from wallpaper)
    const lightSurfaceCandidate = clusters
      .filter(c => c.oklab.L >= 0.88 && c.oklab.L <= 0.98)
      .sort((a, b) => b.population - a.population)[0];
    const lightSurfaceHex = lightSurfaceCandidate?.hex || hslToHex(primHue, 12, 96);

    // Build curated diverse swatches (up to 12 rich colors from the wallpaper)
    const MAX_SWATCHES = 12;
    const swatches: string[] = [];
    const swatchLabs: OklabColor[] = [];
    const pushSwatch = (h: string, minDist = 0): boolean => {
      const lower = h.toLowerCase();
      if (swatches.includes(lower)) return false;
      const rgb = hexToRgb(lower);
      const lab = rgbToOklab(rgb.r, rgb.g, rgb.b);
      if (minDist > 0 && swatchLabs.some(existing => oklabDistance(lab, existing) < minDist)) {
        return false;
      }
      swatches.push(lower);
      swatchLabs.push(lab);
      return true;
    };

    // 1. Core accent & dominant tones first
    pushSwatch(primaryHex);
    pushSwatch(secondaryHex, 0.03);
    pushSwatch(tertiaryHex, 0.03);
    pushSwatch(dominantHex, 0.03);
    pushSwatch(mutedHex, 0.03);

    // 2. High-scoring vibrant / usable accent clusters (avoiding pure black/white extremes first)
    for (const c of clusters) {
      if (swatches.length >= MAX_SWATCHES) break;
      if (c.oklab.L < 0.16 || c.oklab.L > 0.92) continue;
      pushSwatch(c.hex, 0.06);
    }

    // 3. Relax perceptual distance to capture additional nuanced hues sorted by theme score
    for (const c of clusters) {
      if (swatches.length >= MAX_SWATCHES) break;
      if (c.oklab.L < 0.12 || c.oklab.L > 0.94) continue;
      pushSwatch(c.hex, 0.042);
    }

    // 4. Fill remaining slots with prominent population clusters across the full tonal range
    const byPopulation = [...clusters].sort((a, b) => b.population - a.population);
    for (const c of byPopulation) {
      if (swatches.length >= MAX_SWATCHES) break;
      pushSwatch(c.hex, 0.035);
    }

    // 5. Include dark/light ambient surfaces if space remains and they are distinct
    if (swatches.length < MAX_SWATCHES) pushSwatch(darkSurfaceHex, 0.04);
    if (swatches.length < MAX_SWATCHES) pushSwatch(lightSurfaceHex, 0.04);

    // Detailed swatches metadata
    const detailedSwatches: ExtractedColorEntry[] = [
      {
        hex: primaryHex,
        role: 'primary',
        label: 'Vibrant Primary',
        score: primaryCluster.themeScore,
        population: primaryCluster.population,
        h: primaryCluster.hsl.h,
        s: primaryCluster.hsl.s,
        l: primaryCluster.hsl.l,
        wcagLightContrast: getContrastRatio(primaryHex, '#ffffff'),
        wcagDarkContrast: getContrastRatio(primaryHex, '#121820'),
      },
      {
        hex: secondaryHex,
        role: 'secondary',
        label: 'Harmonious Secondary',
        score: secondaryCandidate?.themeScore || 0.8,
        population: secondaryCandidate?.population || 0.1,
        h: secondaryCandidate?.hsl.h ?? (primHue + 42) % 360,
        s: secondaryCandidate?.hsl.s ?? 60,
        l: secondaryCandidate?.hsl.l ?? 56,
        wcagLightContrast: getContrastRatio(secondaryHex, '#ffffff'),
        wcagDarkContrast: getContrastRatio(secondaryHex, '#121820'),
      },
      {
        hex: tertiaryHex,
        role: 'tertiary',
        label: 'Contrast Complement',
        score: tertiaryCandidate?.themeScore || 0.7,
        population: tertiaryCandidate?.population || 0.08,
        h: tertiaryCandidate?.hsl.h ?? (primHue + 160) % 360,
        s: tertiaryCandidate?.hsl.s ?? 55,
        l: tertiaryCandidate?.hsl.l ?? 52,
        wcagLightContrast: getContrastRatio(tertiaryHex, '#ffffff'),
        wcagDarkContrast: getContrastRatio(tertiaryHex, '#121820'),
      },
      {
        hex: dominantHex,
        role: 'dominant',
        label: 'Dominant Wallpaper',
        score: dominantCluster.themeScore,
        population: dominantCluster.population,
        h: dominantCluster.hsl.h,
        s: dominantCluster.hsl.s,
        l: dominantCluster.hsl.l,
        wcagLightContrast: getContrastRatio(dominantHex, '#ffffff'),
        wcagDarkContrast: getContrastRatio(dominantHex, '#121820'),
      },
      {
        hex: mutedHex,
        role: 'muted',
        label: 'Pastel / Muted',
        score: mutedCandidate?.themeScore || 0.6,
        population: mutedCandidate?.population || 0.1,
        h: mutedCandidate?.hsl.h ?? primHue,
        s: mutedCandidate?.hsl.s ?? 30,
        l: mutedCandidate?.hsl.l ?? 62,
        wcagLightContrast: getContrastRatio(mutedHex, '#ffffff'),
        wcagDarkContrast: getContrastRatio(mutedHex, '#121820'),
      },
      {
        hex: darkSurfaceHex,
        role: 'darkSurface',
        label: 'Dark Ambiance',
        score: 0.5,
        population: darkSurfaceCandidate?.population || 0.2,
        h: darkSurfaceCandidate?.hsl.h ?? primHue,
        s: darkSurfaceCandidate?.hsl.s ?? 14,
        l: darkSurfaceCandidate?.hsl.l ?? 12,
        wcagLightContrast: getContrastRatio(darkSurfaceHex, '#ffffff'),
        wcagDarkContrast: getContrastRatio(darkSurfaceHex, '#121820'),
      },
    ];

    // Mood description
    let moodDescription = 'Balanced Aesthetic';
    if (isMonochromeWallpaper) {
      moodDescription = 'Minimalist Monochrome';
    } else if (primHue >= 200 && primHue <= 240) {
      moodDescription = isDarkWallpaper ? 'Deep Oceanic Night' : 'Azure Sky Breeze';
    } else if (primHue >= 25 && primHue <= 60) {
      moodDescription = isDarkWallpaper ? 'Warm Amber Glow' : 'Golden Sunrise';
    } else if (primHue >= 120 && primHue <= 190) {
      moodDescription = isDarkWallpaper ? 'Midnight Emerald' : 'Fresh Botanical';
    } else if (primHue >= 260 && primHue <= 320) {
      moodDescription = isDarkWallpaper ? 'Neon Cyberpunk Dusk' : 'Pastel Lavender';
    } else if (primHue >= 340 || primHue <= 20) {
      moodDescription = isDarkWallpaper ? 'Crimson Velvet' : 'Coral Sunset';
    }

    return {
      primary: primaryHex,
      secondary: secondaryHex,
      tertiary: tertiaryHex,
      darkSurface: darkSurfaceHex,
      lightSurface: lightSurfaceHex,
      dominant: dominantHex,
      muted: mutedHex,
      swatches,
      detailedSwatches,
      dominantHue: primHue,
      isDarkWallpaper,
      averageLuminance: avgLuminance,
      moodDescription,
    };
  } finally {
    if (shouldRevoke && url) {
      URL.revokeObjectURL(url);
    }
  }
}

// ==========================================
// Wallpaper-Tailored Theme Generation Formula
// ==========================================

/**
 * Generates an exquisitely tuned Telegram theme tailored specifically to a wallpaper palette.
 * Formulates incoming/outgoing bubbles, headers, checkmarks, text contrast, and glass translucency.
 */
export function generateWallpaperTheme(
  palette: ExtractedWallpaperPalette,
  mode: 'dark' | 'light' | 'amoled' = 'dark',
  style: WallpaperThemeStyle = 'tonal',
  customSeedHex?: string,
  engine?: GeneratorEngine
): ThemeColors {
  const seedHex = customSeedHex || palette.primary;
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);
  const isDark = mode !== 'light';
  const isAmoled = mode === 'amoled';

  // Secondary/Complementary hue for accent pairs
  const secRgb = hexToRgb(palette.secondary);
  const secHsl = rgbToHsl(secRgb.r, secRgb.g, secRgb.b);

  let outBubble = '';
  let inBubble = '';
  let primary = '';
  let onPrimary = '#ffffff';
  let surface = '';
  let surfaceVariant = '';
  let actionBar = '';
  let messagePanelBg = '';
  let accentCheck = '';

  switch (style) {
    case 'vibrant': {
      // Bold, saturated punchy theme
      const vibrantS = Math.min(100, Math.max(78, s + 15));
      primary = isDark ? hslToHex(h, vibrantS, 64) : hslToHex(h, vibrantS, 48);
      accentCheck = isDark ? hslToHex(h, 95, 72) : hslToHex(h, 90, 42);

      if (isAmoled) {
        outBubble = hslToHex(h, Math.min(85, vibrantS), 28);
        inBubble = '#10141a';
        surface = '#000000';
        surfaceVariant = '#0c0f14';
        actionBar = '#05070a';
        messagePanelBg = '#05070a';
      } else if (isDark) {
        outBubble = hslToHex(h, Math.min(75, vibrantS), 33);
        inBubble = blend(palette.darkSurface, '#1c2533', 0.5);
        surface = palette.darkSurface;
        surfaceVariant = adjustBrightness(palette.darkSurface, 8);
        actionBar = adjustBrightness(palette.darkSurface, 5);
        messagePanelBg = adjustBrightness(palette.darkSurface, 5);
      } else {
        outBubble = hslToHex(h, Math.min(65, s), 86);
        inBubble = '#ffffff';
        surface = palette.lightSurface;
        surfaceVariant = '#ffffff';
        actionBar = hslToHex(h, 75, 46);
        messagePanelBg = '#ffffff';
      }
      break;
    }

    case 'muted': {
      // Soft, calming pastel aesthetic
      const mutedS = Math.min(42, Math.max(18, Math.round(s * 0.55)));
      primary = isDark ? hslToHex(h, mutedS + 15, 68) : hslToHex(h, mutedS + 15, 42);
      accentCheck = primary;

      if (isAmoled) {
        outBubble = hslToHex(h, mutedS, 24);
        inBubble = '#121417';
        surface = '#000000';
        surfaceVariant = '#0e1013';
        actionBar = '#08090b';
        messagePanelBg = '#08090b';
      } else if (isDark) {
        outBubble = hslToHex(h, mutedS, 28);
        inBubble = hslToHex(h, 12, 19);
        surface = hslToHex(h, 12, 11);
        surfaceVariant = hslToHex(h, 10, 16);
        actionBar = hslToHex(h, 12, 14);
        messagePanelBg = hslToHex(h, 12, 14);
      } else {
        outBubble = hslToHex(h, mutedS, 91);
        inBubble = '#ffffff';
        surface = hslToHex(h, 12, 97);
        surfaceVariant = '#ffffff';
        actionBar = hslToHex(h, 16, 95);
        messagePanelBg = '#ffffff';
      }
      break;
    }

    case 'expressive': {
      // Duo-tone complementary dynamic styling
      primary = isDark ? hslToHex(h, Math.max(70, s), 64) : hslToHex(h, Math.max(65, s), 45);
      // Secondary hue provides vibrant pop for checks and header accents
      accentCheck = hslToHex(secHsl.h, Math.max(75, secHsl.s), isDark ? 66 : 46);

      if (isAmoled) {
        outBubble = hslToHex(h, Math.min(65, s), 25);
        inBubble = hslToHex(secHsl.h, 25, 14);
        surface = '#000000';
        surfaceVariant = '#0a0d12';
        actionBar = '#05070a';
        messagePanelBg = '#05070a';
      } else if (isDark) {
        outBubble = hslToHex(h, Math.min(58, s), 30);
        inBubble = hslToHex(secHsl.h, 22, 18);
        surface = palette.darkSurface;
        surfaceVariant = adjustBrightness(palette.darkSurface, 8);
        actionBar = adjustBrightness(palette.darkSurface, 4);
        messagePanelBg = adjustBrightness(palette.darkSurface, 4);
      } else {
        outBubble = hslToHex(h, Math.min(55, s), 89);
        inBubble = hslToHex(secHsl.h, 28, 96);
        surface = palette.lightSurface;
        surfaceVariant = '#ffffff';
        actionBar = hslToHex(h, 60, 48);
        messagePanelBg = '#ffffff';
      }
      break;
    }

    case 'glass': {
      // Translucent blurred glass with high readability
      primary = isDark ? hslToHex(h, Math.max(72, s), 66) : hslToHex(h, Math.max(70, s), 45);
      accentCheck = primary;

      if (isAmoled || isDark) {
        // Vibrant rich accent bubble (40% lightness gives a clean, vivid rose/accent instead of dull muddy brown)
        const baseOut = hslToHex(h, Math.max(68, Math.min(88, s)), isAmoled ? 35 : 40);
        outBubble = '#e6' + baseOut.replace('#', '');
        // Cohesive dark neutral surfaces (NEVER hardcoded navy blue or muddy brown)
        inBubble = isAmoled ? '#d0111317' : '#d0151820';
        surface = isAmoled ? '#000000' : (palette.darkSurface || '#0e1014');
        surfaceVariant = isAmoled ? '#e60a0c10' : '#e612141a';
        actionBar = isAmoled ? '#ee06070a' : '#ee0d0f14';
        messagePanelBg = isAmoled ? '#ee06070a' : '#ee0d0f14';
      } else {
        const baseOut = hslToHex(h, Math.min(60, s), 88);
        outBubble = '#f2' + baseOut.replace('#', '');
        inBubble = '#f5ffffff';
        surface = palette.lightSurface;
        surfaceVariant = '#f5ffffff';
        actionBar = '#f2ffffff';
        messagePanelBg = '#f2ffffff';
      }
      break;
    }

    case 'moody': {
      // Atmospheric dark deep tones
      primary = isDark ? hslToHex(h, Math.min(80, s + 10), 58) : hslToHex(h, Math.min(70, s), 42);
      accentCheck = primary;

      if (isAmoled) {
        outBubble = hslToHex(h, Math.min(50, s), 20);
        inBubble = '#0e1116';
        surface = '#000000';
        surfaceVariant = '#080a0e';
        actionBar = '#040507';
        messagePanelBg = '#040507';
      } else if (isDark) {
        outBubble = hslToHex(h, Math.min(45, s), 26);
        inBubble = hslToHex(h, 16, 16);
        surface = hslToHex(h, 18, 9);
        surfaceVariant = hslToHex(h, 16, 14);
        actionBar = hslToHex(h, 18, 11);
        messagePanelBg = hslToHex(h, 18, 11);
      } else {
        outBubble = hslToHex(h, Math.min(45, s), 88);
        inBubble = '#f4f6f8';
        surface = '#e8ecf0';
        surfaceVariant = '#ffffff';
        actionBar = hslToHex(h, 40, 35);
        messagePanelBg = '#ffffff';
      }
      break;
    }

    case 'tonal':
    default: {
      // Material You standard balanced harmonized theme
      primary = isDark ? hslToHex(h, Math.max(68, s), 65) : hslToHex(h, Math.max(68, s), 44);
      accentCheck = isDark ? hslToHex(h, 85, 68) : primary;

      if (isAmoled) {
        outBubble = hslToHex(h, Math.min(60, s), 25);
        inBubble = '#11151c';
        surface = '#000000';
        surfaceVariant = '#0d1017';
        actionBar = '#06080b';
        messagePanelBg = '#06080b';
      } else if (isDark) {
        outBubble = hslToHex(h, Math.min(54, s), 31);
        // Incoming bubble subtly tinted with wallpaper ambiance
        inBubble = hslToHex(palette.dominantHue || h, 14, 18);
        surface = palette.darkSurface;
        surfaceVariant = adjustBrightness(palette.darkSurface, 9);
        actionBar = adjustBrightness(palette.darkSurface, 5);
        messagePanelBg = adjustBrightness(palette.darkSurface, 5);
      } else {
        outBubble = hslToHex(h, Math.min(60, s), 89);
        inBubble = '#ffffff';
        surface = palette.lightSurface;
        surfaceVariant = '#ffffff';
        actionBar = hslToHex(h, 25, 96);
        messagePanelBg = '#ffffff';
      }
      break;
    }
  }

  // Mathematically guarantee WCAG AA / AAA readability on all text elements
  const outMessageText = getReadableTextColor(outBubble, '#ffffff', '#0f172a');
  const inMessageText = getReadableTextColor(inBubble, '#f8fafc', '#0f172a');
  const actionBarText = getReadableTextColor(actionBar, '#ffffff', '#0f172a');
  const onSurface = isDark ? '#f1f5f9' : '#1e293b';
  const onSurfaceVariant = isDark ? '#94a3b8' : '#64748b';

  const outTimeText = blend(outMessageText, outBubble, 0.35);
  const inTimeText = blend(inMessageText, inBubble, 0.4);
  const actionBarSub = blend(actionBarText, actionBar, 0.35);
  onPrimary = getLuminance(primary) > 0.55 ? (palette.darkSurface || '#141226') : '#ffffff';

  const tokens: ThemeTokens = {
    actionBar,
    actionBarText,
    actionBarSub,
    surface,
    surfaceVariant,
    onSurface,
    onSurfaceVariant,
    inBubble,
    outBubble,
    outMessageText,
    inMessageText,
    outTimeText,
    inTimeText,
    primary,
    onPrimary,
    messagePanelBg,
    sendButton: primary,
    divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    isDark,
    accentCheck,
  };

  const generated = createFullTelegramTheme(tokens);

  // Set chat_wallpaper to match ambiance
  generated.chat_wallpaper = isAmoled ? '#000000' : isDark ? palette.darkSurface : palette.lightSurface;

  // Harmonize chats unread badges & action FAB with primary seed
  generated.chats_unreadCounter = primary;
  generated.chats_unreadCounterText = onPrimary;
  generated.chats_actionBackground = primary;
  generated.chats_actionIcon = onPrimary;
  generated.chats_actionFAB = primary;
  generated.chats_actionFABIcon = onPrimary;

  // Audio & Seekbars
  generated.chat_inAudioProgress = primary;
  generated.chat_inAudioSeekbarFill = primary;
  generated.chat_inVoiceSeekbarFill = primary;
  generated.chat_recordedVoicePlayPause = primary;
  generated.chat_recordedVoiceProgress = primary;

  // If engine was specified and isn't monet/default, blend in special engine aesthetics
  if (engine === 'cyberpunk') {
    generated.chat_outSentCheck = '#00f0ff';
    generated.chat_outSentCheckRead = '#00f0ff';
  }

  return normalizeThemeColors(generated);
}

/**
 * Automatically creates a cohesive, beautiful Telegram theme derived
 * directly from an image wallpaper with advanced formula and style support.
 */
export async function autoGenerateThemeFromWallpaper(
  imageSource: string | Blob,
  mode: 'dark' | 'light' | 'amoled' = 'dark',
  engine: GeneratorEngine = 'classic-telegram',
  style: WallpaperThemeStyle = 'tonal',
  customAccentHex?: string
): Promise<{ colors: ThemeColors; palette: ExtractedWallpaperPalette }> {
  const palette = await extractWallpaperColors(imageSource);
  const theme = generateWallpaperTheme(palette, mode, style, customAccentHex, engine);
  return { colors: theme, palette };
}
