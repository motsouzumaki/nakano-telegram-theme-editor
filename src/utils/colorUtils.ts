import type { ThemeColors, GeneratorEngine } from '../types/theme';

/**
 * Converts a hex string (#RRGGBB or #AARRGGBB) to a 32-bit signed ARGB integer.
 * Telegram Android .attheme format natively uses 32-bit signed integers.
 */
export function hexToArgbInt(hex: string): number {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    clean = 'FF' + clean;
  } else if (clean.length === 8) {
    // If it's RRGGBBAA, Telegram expects AARRGGBB, but standard web hex with alpha is usually #RRGGBBAA.
    // However, if user entered #AARRGGBB directly, we keep it. We assume #AARRGGBB or #RRGGBB.
  }
  const uint = parseInt(clean, 16);
  return uint << 0; // cast to signed 32-bit int
}

/**
 * Converts a 32-bit signed ARGB integer back to a hex string (#RRGGBB or #AARRGGBB).
 */
export function argbIntToHex(intVal: number): string {
  const uint = intVal >>> 0;
  const hex = uint.toString(16).padStart(8, '0');
  const alpha = hex.slice(0, 2).toLowerCase();
  const rgb = hex.slice(2).toLowerCase();
  if (alpha === 'ff') {
    return '#' + rgb;
  }
  return '#' + hex.toLowerCase();
}

/**
 * Normalizes hex to standard format.
 * If 8-chars, format is #AARRGGBB (Telegram ARGB).
 */
export function normalizeHex(hex: string, defaultFallback = '#000000'): string {
  if (!hex) return defaultFallback;
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6 && clean.length !== 8) {
    return defaultFallback;
  }
  return '#' + clean.toLowerCase();
}

/**
 * Converts a Telegram color (#RRGGBB or #AARRGGBB) to a valid CSS rgba() string.
 * This ensures translucent colors and opacity render accurately in the browser.
 */
export function toCssColor(hexOrVal: string, fallback = '#000000'): string {
  if (!hexOrVal) return fallback;
  if (hexOrVal.startsWith('rgba') || hexOrVal.startsWith('rgb')) return hexOrVal;

  const hex = normalizeHex(hexOrVal, fallback);
  const clean = hex.replace('#', '');

  if (clean.length === 8) {
    // Telegram ARGB: AA RR GG BB
    const a = (parseInt(clean.slice(0, 2), 16) / 255).toFixed(3);
    const r = parseInt(clean.slice(2, 4), 16);
    const g = parseInt(clean.slice(4, 6), 16);
    const b = parseInt(clean.slice(6, 8), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  return fallback;
}

/**
 * Extracts alpha percentage (0 to 100) from a Telegram hex.
 */
export function extractAlphaPercent(hex: string): number {
  if (!hex) return 100;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 8) {
    const a = parseInt(clean.slice(0, 2), 16);
    return Math.round((a / 255) * 100);
  }
  return 100;
}

/**
 * Sets alpha percentage (0 to 100) on a color, returning #AARRGGBB (or #RRGGBB if 100%).
 */
export function setHexAlpha(hex: string, alphaPercent: number): string {
  const clean = hex.replace('#', '').trim();
  let rgb = clean;
  if (clean.length === 8) {
    rgb = clean.slice(2);
  } else if (clean.length === 3) {
    rgb = clean.split('').map(c => c + c).join('');
  }
  if (rgb.length !== 6) rgb = '000000';

  const clamped = Math.max(0, Math.min(100, Math.round(alphaPercent)));
  if (clamped >= 100) {
    return `#${rgb.toLowerCase()}`;
  }
  const aVal = Math.round((clamped / 100) * 255);
  const aHex = aVal.toString(16).padStart(2, '0');
  return `#${aHex}${rgb}`.toLowerCase();
}

/**
 * Extracts 6-digit RGB hex (#RRGGBB) from a color (stripping alpha if present),
 * suitable for HTML <input type="color">.
 */
export function getBaseRgbHex(hex: string, fallback = '#000000'): string {
  if (!hex) return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 8) {
    return `#${clean.slice(2).toLowerCase()}`;
  }
  if (clean.length === 6) {
    return `#${clean.toLowerCase()}`;
  }
  return fallback;
}

/**
 * Converts hex to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  if (!hex) return { r: 0, g: 0, b: 0, a: 1 };
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const match = hex.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }
  }
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  let a = 1;
  if (clean.length === 8) {
    // Telegram ARGB format: AARRGGBB
    a = parseInt(clean.slice(0, 2), 16) / 255;
    clean = clean.slice(2);
  }
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return { r, g, b, a };
}

/**
 * Converts RGB components to hex
 */
export function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const rHex = clamp(r).toString(16).padStart(2, '0');
  const gHex = clamp(g).toString(16).padStart(2, '0');
  const bHex = clamp(b).toString(16).padStart(2, '0');
  if (a < 1) {
    const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
    return `#${aHex}${rHex}${gHex}${bHex}`;
  }
  return `#${rHex}${gHex}${bHex}`;
}

/**
 * Converts HSV to RGB components (h: 0-360, s: 0-100, v: 0-100)
 */
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0, g1 = 0, b1 = 0;
  if (h >= 0 && h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (h >= 60 && h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (h >= 120 && h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (h >= 180 && h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (h >= 240 && h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/**
 * Converts RGB components to HSV (h: 0-360, s: 0-100, v: 0-100)
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r = Math.max(0, Math.min(255, r)) / 255;
  g = Math.max(0, Math.min(255, g)) / 255;
  b = Math.max(0, Math.min(255, b)) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

/**
 * Converts Hex string to HSV + alpha
 */
export function hexToHsv(hex: string): { h: number; s: number; v: number; a: number } {
  const { r, g, b, a } = hexToRgb(hex);
  const { h, s, v } = rgbToHsv(r, g, b);
  return { h, s, v, a };
}

/**
 * Converts HSV + Alpha to Telegram Hex (#RRGGBB or #AARRGGBB)
 */
export function hsvToHex(h: number, s: number, v: number, a = 1): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b, a);
}

/**
 * Calculates relative luminance for WCAG contrast
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates WCAG contrast ratio between two hex colors (1:1 to 21:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

/**
 * Returns readable text color (#ffffff or #000000) for a given background
 */
export function getReadableTextColor(bgHex: string, lightText = '#ffffff', darkText = '#1c1c1e'): string {
  const lum = getLuminance(bgHex);
  return lum > 0.45 ? darkText : lightText;
}

/**
 * Ensures a foreground color meets minimum WCAG contrast against a background,
 * falling back to the higher-contrast alternative if the current ratio is below threshold.
 */
export function ensureContrast(
  fgHex: string,
  bgHex: string,
  preferredFallbackLight = '#ffffff',
  preferredFallbackDark = '#1c1c1e',
  minRatio = 3.5
): string {
  try {
    if (getContrastRatio(bgHex, fgHex) >= minRatio) {
      return fgHex;
    }
    const lightRatio = getContrastRatio(bgHex, preferredFallbackLight);
    const darkRatio = getContrastRatio(bgHex, preferredFallbackDark);
    return lightRatio >= darkRatio ? preferredFallbackLight : preferredFallbackDark;
  } catch {
    return fgHex;
  }
}

/**
 * Resolves the theme's dark surface base color adapted directly from actionBarDefault in dark mode.
 * Avoids returning generic Tailwind slate-black #111827 or #1c1c1e.
 */
export function getThemeDarkBase(c: Partial<ThemeColors>): string {
  if (c.actionBarDefault && getLuminance(c.actionBarDefault) < 0.55) {
    return c.actionBarDefault;
  }
  if (c.surfaceVariant && getLuminance(c.surfaceVariant) < 0.45 && c.surfaceVariant !== '#111827' && c.surfaceVariant !== '#1c1c1e') {
    return c.surfaceVariant;
  }
  if (c.windowBackgroundWhite && getLuminance(c.windowBackgroundWhite) < 0.45 && c.windowBackgroundWhite !== '#111827' && c.windowBackgroundWhite !== '#1c1c1e') {
    return c.windowBackgroundWhite;
  }
  if (c.chat_wallpaper && getLuminance(c.chat_wallpaper) < 0.45 && c.chat_wallpaper !== '#111827' && c.chat_wallpaper !== '#1c1c1e') {
    return c.chat_wallpaper;
  }
  return '#141226';
}

/**
 * Resolves unread counter badge text color with guaranteed high contrast against badge background.
 * In dark mode, all badge numbers (chats_tabUnreadActiveText, chats_tabUnreadUnactiveText,
 * chats_unreadCounterText, and chat_goDownButtonCounter) adapt to the same color matching actionBarDefault.
 */
export function resolveBadgeTextColor(
  badgeBg: string,
  currentText: string | undefined,
  themeDark: string,
  isDarkMode = true
): string {
  // In dark mode: badge numbers adapt to themeDark (actionBarDefault)
  const defaultAdaptiveText = isDarkMode ? themeDark : '#ffffff';

  if (!currentText) {
    return defaultAdaptiveText;
  }

  let cleanText = currentText.trim().toLowerCase();
  if (cleanText.startsWith('#')) {
    if (cleanText.length === 4) {
      cleanText = '#' + cleanText[1] + cleanText[1] + cleanText[2] + cleanText[2] + cleanText[3] + cleanText[3];
    } else if (cleanText.length === 9) {
      // #aarrggbb format in Telegram
      cleanText = '#' + cleanText.slice(3);
    }
  }
  const cleanBg = badgeBg.trim().toLowerCase();

  // 1. Stuck on generic slate-black #111827 or #1c1c1e
  if (cleanText === '#111827' || cleanText === '#1c1c1e') {
    return defaultAdaptiveText;
  }

  // 2. Text matches badge background or contrast is unreadable (< 3.0:1)
  // (Prevents blue-on-blue or amber-on-amber)
  if (cleanText === cleanBg || getContrastRatio(badgeBg, currentText) < 3.0) {
    return defaultAdaptiveText;
  }

  // 3. In dark mode, if text was white, near-white, accent, or generic dark,
  // adapt it to themeDark (actionBarDefault)
  if (isDarkMode) {
    if (
      cleanText === '#ffffff' ||
      cleanText === '#ffb362' ||
      cleanText === '#fafafa' ||
      cleanText === '#f8f9fa' ||
      cleanText === '#f3f4f6' ||
      cleanText === '#000000' ||
      getLuminance(currentText) > 0.40
    ) {
      return themeDark;
    }
  }

  const bgLum = getLuminance(badgeBg);
  const isBgLight = bgLum > 0.40;

  // 4. For light / amber badges (e.g. #ffb362, white, yellow):
  // If text is light (#ffffff, lum > 0.45), it is washed out on light badge -> must adapt to themeDark (#141226 / actionBarDefault)
  if (isBgLight && (cleanText === '#ffffff' || getLuminance(currentText) > 0.45)) {
    return themeDark;
  }

  return currentText;
}

/**
 * Adjusts brightness of a color (-100 to 100)
 */
export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b, a } = hexToRgb(hex);
  const factor = percent / 100;
  const newR = factor > 0 ? r + (255 - r) * factor : r + r * factor;
  const newG = factor > 0 ? g + (255 - g) * factor : g + g * factor;
  const newB = factor > 0 ? b + (255 - b) * factor : b + b * factor;
  return rgbToHex(newR, newG, newB, a);
}

/**
 * Blends two colors by ratio (0 to 1)
 */
export function blend(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = c1.r * (1 - ratio) + c2.r * ratio;
  const g = c1.g * (1 - ratio) + c2.g * ratio;
  const b = c1.b * (1 - ratio) + c2.b * ratio;
  return rgbToHex(r, g, b);
}

/**
 * Converts RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts HSL to hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export interface ThemeTokens {
  actionBar: string;
  actionBarText: string;
  actionBarSub: string;
  surface: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  inBubble: string;
  inBubbleSelected?: string;
  outBubble: string;
  outBubbleSelected?: string;
  outMessageText: string;
  inMessageText: string;
  outTimeText: string;
  inTimeText: string;
  primary: string;
  onPrimary: string;
  primaryContainer?: string;
  messagePanelBg: string;
  sendButton: string;
  divider: string;
  isDark: boolean;
  accentCheck?: string;
}

/**
 * Builds the complete set of Telegram .attheme variables from high-level theme tokens.
 */
export function createFullTelegramTheme(t: ThemeTokens): ThemeColors {
  const inBubbleSel = t.inBubbleSelected || adjustBrightness(t.inBubble, t.isDark ? 12 : -8);
  const outBubbleSel = t.outBubbleSelected || adjustBrightness(t.outBubble, t.isDark ? 12 : -8);
  const checkColor = t.accentCheck || t.primary;

  // Action Mode & Contrast Analysis
  const headerLum = getLuminance(t.actionBar);
  const isDarkHeader = headerLum < 0.55;

  // Action Mode Bar: The bar matches t.actionBar so the header remains unified without white cutouts
  const defaultActionModeBg = t.actionBar;
  const defaultActionModeTop = defaultActionModeBg;
  // In dark mode: ensure contrast on dark/colored header. In light mode: use the theme accent!
  const defaultActionModeIcon = isDarkHeader
    ? ensureContrast(t.primary, defaultActionModeBg, '#ffffff', t.primary, 3.5)
    : (getContrastRatio(defaultActionModeBg, t.primary) >= 2.8 ? t.primary : adjustBrightness(t.primary, -28));
  const defaultActionModeSelector = getLuminance(defaultActionModeBg) < 0.55
    ? adjustBrightness(defaultActionModeBg, 18)
    : blend(defaultActionModeIcon, defaultActionModeBg, 0.15);

  // Folder Tabs Calculation (tabs bar sits directly on top of actionBarDefault)
  const themeDark = getThemeDarkBase({
    surfaceVariant: t.surfaceVariant,
    windowBackgroundWhite: t.surfaceVariant || t.surface,
    actionBarDefault: t.actionBar,
    chat_wallpaper: t.surface,
  });

  const tabActiveText = t.primary;
  const tabActiveLine = t.primary;
  // Inactive tab text: adapt dynamically to header title/contrast with subtle accent tint
  const tabUnactiveText = t.actionBarSub || (isDarkHeader
    ? blend(t.actionBarText || '#ffffff', t.primary, 0.15)
    : blend(themeDark, t.actionBar, 0.45));
  const tabActiveBadgeBg = t.primary;
  const tabActiveBadgeText = isDarkHeader ? t.actionBar : resolveBadgeTextColor(tabActiveBadgeBg, undefined, themeDark, false);

  // Inactive badge background: adapt to theme primary accent with contrast against t.actionBar
  const tabUnactiveBadgeBg = isDarkHeader
    ? blend(t.primary, '#ffffff', 0.25)
    : blend(t.primary, t.actionBar, 0.14);

  const tabUnactiveBadgeText = isDarkHeader ? t.actionBar : resolveBadgeTextColor(tabUnactiveBadgeBg, undefined, themeDark, false);

  return {
    // Header & Bars
    actionBarDefault: t.actionBar,
    actionBarDefaultTitle: t.actionBarText,
    actionBarDefaultSubtitle: t.actionBarSub,
    actionBarDefaultIcon: isDarkHeader
      ? t.actionBarText
      : (getContrastRatio(t.actionBar, t.primary) >= 2.8 ? t.primary : adjustBrightness(t.primary, -28)),
    actionBarDefaultSelector: adjustBrightness(t.actionBar, t.isDark ? 15 : -10),
    actionBarDefaultSearch: isDarkHeader ? (t.actionBarText || '#ffffff') : (t.onSurface || '#111827'),
    actionBarDefaultSearchPlaceholder: isDarkHeader
      ? blend(t.actionBarText || '#ffffff', t.actionBar, 0.45)
      : (t.actionBarSub || blend(t.onSurface || '#111827', t.actionBar, 0.5)),

    // Chat Screen
    chat_wallpaper: t.surface,
    chat_inBubble: t.inBubble,
    chat_inBubbleSelected: inBubbleSel,
    chat_outBubble: t.outBubble,
    chat_outBubbleSelected: outBubbleSel,
    chat_messageTextIn: t.inMessageText,
    chat_messageTextOut: t.outMessageText,
    chat_inTimeText: t.inTimeText,
    chat_outTimeText: t.outTimeText,
    chat_outSentCheck: checkColor,
    chat_outSentCheckSelected: checkColor,
    chat_outSentCheckRead: checkColor,
    chat_outSentCheckReadSelected: checkColor,

    // Replies & Quotes
    chat_inReplyLine: t.primary,
    chat_inReplyNameText: t.primary,
    chat_inReplyName: t.primary,
    chat_inReplyMessageText: blend(t.inMessageText, t.inBubble, 0.25),
    chat_outReplyLine: t.primary,
    chat_outReplyLine2: t.primary,
    chat_outReplyNameText: t.outMessageText,
    chat_outReplyName: t.outMessageText,
    chat_outReplyMessageText: blend(t.outMessageText, t.outBubble, 0.25),
    chat_replyPanelName: t.primary,
    chat_replyPanelLine: t.primary,
    chat_replyPanelIcons: t.primary,
    chat_replyPanelClose: t.actionBarText,
    chat_inQuote: adjustBrightness(t.inBubble, t.isDark ? 8 : -8),
    chat_outQuote: adjustBrightness(t.outBubble, t.isDark ? 8 : -8),
    chat_inReactionButtonBackground: adjustBrightness(t.inBubble, t.isDark ? 10 : -8),
    chat_outReactionButtonBackground: adjustBrightness(t.outBubble, t.isDark ? 10 : -8),
    chat_inReactionButtonText: t.primary,
    chat_outReactionButtonText: t.outMessageText,

    // Forwarded Messages & Peer Sender Names (PREVENTS DEFAULT ELECTRIC GREEN IN TELEGRAM FORWARDS)
    avatar_nameInMessageGreen: t.primary,
    avatar_nameInMessageViolet: t.primary,
    avatar_nameInMessagePink: t.primary,
    avatar_nameInMessageRed: t.primary,
    avatar_nameInMessageOrange: t.primary,
    avatar_nameInMessageBlue: t.primary,
    avatar_nameInMessageCyan: t.primary,
    avatar_nameInMessageColour: t.primary,
    chat_inForwardedNameText: t.primary,
    chat_outForwardedNameText: t.primary,
    chat_inForwarded: t.primary,
    chat_outForwarded: t.primary,

    // Voice & Audio Playback / Recording
    chat_inAudioProgress: t.primary,
    chat_outAudioProgress: t.outMessageText,
    chat_inLoader: t.primary,
    chat_inLoaderSelected: t.primary,
    chat_outLoader: t.outMessageText,
    chat_outLoaderSelected: t.outMessageText,
    chat_inAudioDurationText: t.inTimeText,
    chat_inAudioDurationSelectedText: t.inTimeText,
    chat_outAudioDurationText: t.outTimeText,
    chat_outAudioDurationSelectedText: t.outTimeText,
    chat_inAudioTimeText: t.inTimeText,
    chat_outAudioTimeText: t.outTimeText,
    chat_inAudioCacheSeekbar: blend(t.primary, t.inBubble, 0.25),
    chat_outAudioCacheSeekbar: blend(t.outMessageText, t.outBubble, 0.25),
    chat_inAudioSeekbar: blend(t.inMessageText, t.inBubble, 0.4),
    chat_inAudioSeekbarFill: t.primary,
    chat_inAudioSeekbarSelected: t.primary,
    chat_outAudioSeekbar: blend(t.outMessageText, t.outBubble, 0.4),
    chat_outAudioSeekbarFill: t.outMessageText,
    chat_inVoiceSeekbar: blend(t.inMessageText, t.inBubble, 0.4),
    chat_inVoiceSeekbarFill: t.primary,
    chat_inVoiceSeekbarSelected: t.primary,
    chat_outVoiceSeekbar: blend(t.outMessageText, t.outBubble, 0.4),
    chat_outVoiceSeekbarFill: t.outMessageText,
    chat_outVoiceSeekbarSelected: t.outMessageText,
    chat_recordedVoicePlayPause: t.primary,
    chat_recordedVoiceProgress: t.primary,
    chat_recordedVoiceBackground: t.actionBar,
    chat_recordedVoiceDot: '#ef4444',
    chat_recordTime: t.onSurface,
    chat_recordVoiceCancel: t.onSurfaceVariant,
    chat_inMediaIcon: t.inBubble,
    chat_outMediaIcon: t.outBubble,
    chat_inFileBackground: t.primary,
    chat_inFileBackgroundSelected: t.primary,
    chat_outFileBackground: t.outBubble,
    chat_outFileBackgroundSelected: t.outBubble,
    chat_inFileProgress: '#ffffff',
    chat_outFileProgress: t.outMessageText,
    chat_inPreviewInstantText: t.primary,
    chat_outPreviewInstantText: t.primary,

    // File Attachments & Audio Titles (PREVENTS DEFAULT GREEN IN TELEGRAM)
    chat_outFileNameText: t.outMessageText,
    chat_outFileInfoText: blend(t.outMessageText, t.outBubble, 0.3),
    chat_outFileInfoSelectedText: t.outMessageText,
    chat_inFileNameText: t.primary,
    chat_inFileInfoText: t.inTimeText,
    chat_inFileInfoSelectedText: t.inTimeText,
    chat_outAudioTitleText: t.outMessageText,
    chat_inAudioTitleText: t.primary,
    chat_outAudioPerformerText: blend(t.outMessageText, t.outBubble, 0.3),
    chat_inAudioPerformerText: t.inTimeText,
    chat_messageLinkOut: t.primary,
    chat_messageLinkIn: t.primary,

    // Top Action Bar Submenu
    actionBarDefaultSubmenuBackground: isDarkHeader ? t.actionBar : (t.surfaceVariant || '#ffffff'),
    actionBarDefaultSubmenuItem: isDarkHeader ? t.actionBarText : t.onSurface,
    actionBarDefaultSubmenuItemIcon: isDarkHeader
      ? (t.actionBarSub && getContrastRatio(t.actionBar, t.actionBarSub) >= 2.8 ? t.actionBarSub : t.primary)
      : (getContrastRatio(t.surfaceVariant || '#ffffff', t.primary) >= 2.8 ? t.primary : adjustBrightness(t.primary, -28)),

    // Action Mode Bar (Selection Mode when messages/chats are selected - PREVENTS INVISIBLE ICONS IN LIGHT/DARK MODES)
    actionBarActionModeDefault: defaultActionModeBg,
    actionBarActionModeDefaultTop: defaultActionModeTop,
    actionBarActionModeDefaultIcon: defaultActionModeIcon,
    actionBarActionModeDefaultSelector: defaultActionModeSelector,
    profile_tabSelectedLine: t.primary,
    profile_tabSelectedText: t.primary,
    profile_tabText: t.onSurfaceVariant,
    profile_tabSelector: adjustBrightness(t.primary, -15),
    telegram_color: t.primary,
    telegram_color_text: t.primary,
    telegram_color_dialogsLogo: t.primary,

    // Pinned bar (PREVENTS DEFAULT BLUE)
    chat_topPanelBackground: t.actionBar,
    chat_topPanelLine: t.primary,
    chat_topPanelTitle: t.primary,
    chat_topPanelMessage: blend(t.actionBarText, t.actionBar, 0.3),
    chat_topPanelClose: t.actionBarText,

    // Scroll to bottom FAB (Official & Legacy Aliases)
    chat_goDownButton: t.surfaceVariant,
    chat_goDownButtonIcon: t.onSurfaceVariant,
    chat_goDownButtonCounter: isDarkHeader ? t.actionBar : t.onPrimary,
    chat_goDownButtonCounterBackground: t.primary,
    chat_goToEndButtonBackground: t.surfaceVariant,
    chat_goToEndButtonIcon: t.onSurfaceVariant,
    chat_goToEndButtonCounter: t.primary,
    chat_goToEndButtonCounterText: isDarkHeader ? t.actionBar : t.onPrimary,

    // Input Bar (Paperclip, mic, send & emoji icons matching violet/rose accent)
    chat_messagePanelBackground: t.messagePanelBg,
    chat_messagePanelText: t.onSurface,
    chat_messagePanelHint: t.onSurfaceVariant,
    chat_messagePanelIcons: t.primary,
    chat_messagePanelAttach: t.primary,
    chat_messagePanelSend: t.sendButton,
    chat_messagePanelVoice: t.primary,
    chat_messagePanelVoicePressed: adjustBrightness(t.primary, -15),
    chat_messagePanelVoiceBackground: t.surfaceVariant,
    glass_defaultIcon: t.primary,
    glass_defaultText: t.primary,
    glass_tabSelected: t.primary,
    glass_tabSelectedText: t.onPrimary,
    glass_tabUnselected: t.onSurfaceVariant,

    // Chats List (Home Screen - PREVENTS DEFAULT BLUE IN PREVIEWS)
    windowBackgroundWhite: t.surfaceVariant,
    windowBackgroundWhiteBlackText: t.onSurface,
    windowBackgroundWhiteGrayText: t.onSurfaceVariant,
    windowBackgroundGray: t.surface,

    // Section Headers & Search Result Bars (PREVENTS DEFAULT GLARING WHITE BARS IN GLOBAL SEARCH & MESSAGES)
    graySection: t.isDark
      ? (t.surfaceVariant && getContrastRatio(t.surface, t.surfaceVariant) > 1.15
          ? blend(t.surface, t.surfaceVariant, 0.4)
          : adjustBrightness(t.surface, 6))
      : (t.surfaceVariant && getContrastRatio(t.surface, t.surfaceVariant) > 1.15
          ? blend(t.surface, t.surfaceVariant, 0.4)
          : adjustBrightness(t.surface, -4)),
    key_graySectionText: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    graySectionText: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    windowBackgroundWhiteGrayText2: t.onSurfaceVariant || (t.isDark ? '#7f93a5' : '#708291'),
    chats_name: t.onSurface,
    chats_message: t.onSurfaceVariant,
    chats_date: blend(t.primary, t.onSurfaceVariant, 0.25),
    chats_muteIcon: blend(t.primary, t.onSurfaceVariant, 0.45),
    chats_pinnedIcon: t.primary,
    chats_pinnedOverlay: setHexAlpha(t.primary, t.isDark ? 12 : 8),
    chats_unreadCounter: t.primary,
    chats_unreadCounterMuted: t.isDark ? blend(t.primary, t.surfaceVariant, 0.24) : blend(t.primary, t.surfaceVariant, 0.2),
    chats_unreadCounterText: isDarkHeader ? t.actionBar : t.onPrimary,
    chats_sentCheck: checkColor,
    chats_sentReadCheck: checkColor,
    chats_sentClock: t.onSurfaceVariant,
    chats_nameMessage: t.primary,
    chats_attachMessage: t.primary,
    chats_actionMessage: t.primary,
    chats_nameMessage_threeLines: t.primary,
    chats_nameMessageArchived: t.primary,
    chats_draft: t.primary,

    // Archived Chats (ADAPTED TO THEME ACCENT/ROSE BY DEFAULT)
    avatar_backgroundArchived: t.primary,
    avatar_backgroundArchivedHidden: adjustBrightness(t.primary, -12),
    chats_archiveIcon: t.onPrimary,
    chats_archiveText: t.onSurface,
    chats_archiveBackground: t.surfaceVariant,
    chats_archivePinBackground: adjustBrightness(t.surfaceVariant, t.isDark ? 8 : -8),

    // Floating Action Button (Official Telegram chats_actionBackground & Legacy Aliases)
    chats_actionBackground: t.primary,
    chats_actionIcon: t.onPrimary,
    chats_actionPressedBackground: adjustBrightness(t.primary, -15),
    chats_actionFAB: t.primary,
    chats_actionFABIcon: t.onPrimary,
    chats_onlineCircle: '#10b981',
    divider: t.divider,

    // Chat Folders Tabs & Saved Messages (PREVENTS DEFAULT BLUE & CONTRAST CONFLICTS ON COLORED HEADERS)
    actionBarTabActiveText: tabActiveText,
    actionBarTabLine: tabActiveLine,
    actionBarTabUnactiveText: tabUnactiveText,
    actionBarTabSelector: adjustBrightness(tabActiveText, -15),
    chats_tabUnreadActiveBackground: tabActiveBadgeBg,
    chats_tabUnreadActiveText: tabActiveBadgeText,
    chats_tabUnreadUnactiveBackground: tabUnactiveBadgeBg,
    chats_tabUnreadUnactiveText: tabUnactiveBadgeText,
    avatar_backgroundSaved: t.primary,
    avatar_background2Saved: adjustBrightness(t.primary, -15),

    // System Settings & Action Buttons (PREVENTS DEFAULT BLUE IN SETTINGS)
    featuredStickers_addButton: t.primary,
    featuredStickers_addButton2: adjustBrightness(t.primary, 10),
    featuredStickers_addButtonPressed: adjustBrightness(t.primary, -15),
    featuredStickers_buttonText: t.onPrimary,
    featuredStickers_unread: t.primary,
    windowBackgroundWhiteBlueHeader: t.primary,
    windowBackgroundWhiteBlueText: t.primary,
    windowBackgroundWhiteBlueText2: t.primary,
    windowBackgroundWhiteBlueText3: t.primary,
    windowBackgroundWhiteBlueText4: t.primary,
    windowBackgroundWhiteBlueText5: t.primary,
    windowBackgroundWhiteBlueText6: t.primary,
    windowBackgroundWhiteBlueText7: t.primary,
    windowBackgroundWhiteBlueButton: t.primary,
    windowBackgroundWhiteBlueIcon: t.primary,
    windowBackgroundWhiteValueText: t.primary,
    windowBackgroundWhiteLinkText: t.primary,
    switchTrackChecked: t.primary,
    switchTrackBlueChecked: t.primary,
    switch2TrackChecked: t.primary,
    switchThumbChecked: '#ffffff',

    // Dialogs & Popups
    dialogBackground: t.surfaceVariant,
    dialogTextBlack: t.onSurface,
    dialogButton: t.primary,
    dialogTextLink: t.primary,
    dialogTextBlue: t.primary,
    dialogTextBlue2: t.primary,
    dialogTextBlue4: t.primary,
    dialogRoundCheckBox: t.primary,
    dialogRoundCheckBoxCheck: t.onPrimary,
    checkboxSquareBackground: t.primary,

    // ==================== IN-APP MINI MUSIC PLAYER BAR (IMAGE 1) ====================
    // Prevents black track title and artist text on dark background in the mini player bar
    inappPlayerBackground: t.isDark
      ? (t.surfaceVariant ? adjustBrightness(t.surfaceVariant, 4) : '#18222d')
      : (t.surfaceVariant ? adjustBrightness(t.surfaceVariant, -4) : '#edf2f7'),
    inappPlayerTitle: t.isDark ? (t.onSurface || '#ffffff') : (t.onSurface || '#1c242d'),
    inappPlayerPerformer: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    inappPlayerClose: t.isDark ? (t.actionBarText || '#ffffff') : (t.onSurfaceVariant || '#52606d'),
    inappPlayerPlayPause: t.primary,

    // ==================== FULL AUDIO PLAYER SHEET / CARD (IMAGE 2) ====================
    // Prevents static solid white card in dark themes when playing music/audio
    player_background: t.isDark
      ? (t.surfaceVariant || '#17212b')
      : (t.surfaceVariant || '#ffffff'),
    player_actionBar: t.isDark
      ? (t.surfaceVariant || '#17212b')
      : (t.surfaceVariant || '#ffffff'),
    player_actionBarTitle: t.isDark ? (t.onSurface || '#ffffff') : (t.onSurface || '#1c242d'),
    player_actionBarSubtitle: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    player_actionBarItems: t.isDark ? (t.onSurface || '#ffffff') : (t.onSurfaceVariant || '#52606d'),
    player_actionBarSelector: adjustBrightness(t.isDark ? (t.surfaceVariant || '#17212b') : '#ffffff', t.isDark ? 15 : -10),
    player_actionBarTop: t.isDark ? (t.surfaceVariant || '#17212b') : (t.surfaceVariant || '#ffffff'),
    player_progress: t.primary,
    player_progressBackground: t.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
    player_time: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    player_button: t.isDark ? (t.onSurface || '#ffffff') : (t.onSurface || '#1c242d'),
    player_buttonActive: t.primary,
    player_placeholder: t.primary,
    player_placeholderBackground: t.isDark ? adjustBrightness(t.surfaceVariant, -6) : adjustBrightness(t.surfaceVariant, 6),

    // ==================== EMOJI SUGGESTIONS WINDOW & STICKER PANELS (IMAGE 3) ====================
    // Prevents static solid white speech bubble suggestion popup when typing emoji keywords
    chat_stickersHintPanel: t.isDark
      ? (t.surfaceVariant ? adjustBrightness(t.surfaceVariant, 8) : '#202b36')
      : '#ffffff',
    chat_emojiPanelBackground: t.isDark
      ? (t.surfaceVariant || '#17212b')
      : (t.surfaceVariant || '#ffffff'),
    chat_emojiPanelBackspace: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    chat_emojiPanelEmptyText: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    chat_emojiPanelIcon: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    chat_emojiPanelIconSelected: t.primary,
    chat_emojiPanelIconSelector: t.primary,
    chat_emojiPanelStickerPackSelector: t.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    chat_emojiPanelStickerSetName: t.isDark ? (t.onSurface || '#ffffff') : (t.onSurface || '#1c242d'),
    chat_emojiPanelStickerSetNameIcon: t.isDark ? (t.onSurfaceVariant || '#7f93a5') : (t.onSurfaceVariant || '#708291'),
    chat_emojiSearchBackground: t.isDark ? (t.surface || '#0e1621') : '#f0f2f5',
    chat_emojiPanelShadowLine: t.isDark ? (t.divider || '#111921') : '#e0e0e0',
  };
}

/**
 * 1. Classic Telegram Engine:
 * Iconic Deep Slate Blue & Navy Android theme with rock-solid readability.
 */
export function generateClassicTelegramPalette(
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'dark'
): ThemeColors {
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);

  const primary = mode === 'light'
    ? hslToHex(h, Math.max(s, 70), 48)
    : hslToHex(h, Math.max(s, 75), 62);

  if (mode === 'light') {
    const actionBar = seedHex ? hslToHex(h, Math.min(s, 65), 45) : '#2481cc';
    return createFullTelegramTheme({
      actionBar,
      actionBarText: '#ffffff',
      actionBarSub: '#c2dbf1',
      surface: '#edf2f7',
      surfaceVariant: '#ffffff',
      onSurface: '#1c242d',
      onSurfaceVariant: '#708291',
      inBubble: '#ffffff',
      outBubble: hslToHex(h, Math.min(s, 60), 90),
      outMessageText: '#0f172a',
      inMessageText: '#1c242d',
      outTimeText: hslToHex(h, Math.min(s, 40), 55),
      inTimeText: '#8fa0af',
      primary,
      onPrimary: '#ffffff',
      messagePanelBg: '#ffffff',
      sendButton: primary,
      divider: '#dfe5ec',
      isDark: false,
    });
  }

  if (mode === 'amoled') {
    const isClassicBlue = Math.abs(h - 210) < 30 || s < 10;
    const outBubble = isClassicBlue ? '#1d3557' : hslToHex(h, Math.min(s, 50), 24);
    return createFullTelegramTheme({
      actionBar: '#05070a',
      actionBarText: '#ffffff',
      actionBarSub: '#7f93a5',
      surface: '#000000',
      surfaceVariant: '#090d13',
      onSurface: '#ffffff',
      onSurfaceVariant: '#7f93a5',
      inBubble: '#101721',
      outBubble,
      outMessageText: '#ffffff',
      inMessageText: '#f1f1f1',
      outTimeText: '#89b2e8',
      inTimeText: '#667788',
      primary,
      onPrimary: '#ffffff',
      messagePanelBg: '#090d13',
      sendButton: primary,
      divider: '#131b24',
      isDark: true,
    });
  }

  // Classic Dark (Official Telegram Android Navy)
  const isClassicBlue = Math.abs(h - 210) < 30 || s < 10;
  const outBubble = isClassicBlue ? '#2b5278' : hslToHex(h, Math.min(s, 48), 32);

  return createFullTelegramTheme({
    actionBar: '#17212b',
    actionBarText: '#ffffff',
    actionBarSub: '#7f93a5',
    surface: '#0e1621',
    surfaceVariant: '#17212b',
    onSurface: '#ffffff',
    onSurfaceVariant: '#7f93a5',
    inBubble: '#182533',
    outBubble,
    outMessageText: '#ffffff',
    inMessageText: '#ffffff',
    outTimeText: '#7099be',
    inTimeText: '#6d8397',
    primary,
    onPrimary: '#ffffff',
    messagePanelBg: '#17212b',
    sendButton: primary,
    divider: '#111921',
    isDark: true,
  });
}

/**
 * 2. High-Contrast Pure AMOLED Engine:
 * True #000000 pitch black with electric, high-contrast accents.
 */
export function generateHighContrastAmoledPalette(
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'amoled'
): ThemeColors {
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);

  if (mode === 'light') {
    const primary = hslToHex(h, Math.max(s, 80), 45);
    return createFullTelegramTheme({
      actionBar: '#ffffff',
      actionBarText: '#000000',
      actionBarSub: '#666666',
      surface: '#f5f5f5',
      surfaceVariant: '#ffffff',
      onSurface: '#000000',
      onSurfaceVariant: '#555555',
      inBubble: '#e5e5e5',
      outBubble: hslToHex(h, Math.max(s, 70), 88),
      outMessageText: '#000000',
      inMessageText: '#000000',
      outTimeText: '#555555',
      inTimeText: '#666666',
      primary,
      onPrimary: '#ffffff',
      messagePanelBg: '#ffffff',
      sendButton: primary,
      divider: '#cccccc',
      isDark: false,
    });
  }

  // Pure AMOLED
  const primary = hslToHex(h, Math.max(s, 85), 58);
  const outBubble = hslToHex(h, Math.min(s, 60), 22);

  return createFullTelegramTheme({
    actionBar: '#000000',
    actionBarText: '#ffffff',
    actionBarSub: '#888888',
    surface: '#000000',
    surfaceVariant: '#080808',
    onSurface: '#ffffff',
    onSurfaceVariant: '#888888',
    inBubble: '#121212',
    outBubble,
    outMessageText: '#ffffff',
    inMessageText: '#f5f5f5',
    outTimeText: hslToHex(h, 45, 75),
    inTimeText: '#777777',
    primary,
    onPrimary: '#000000',
    messagePanelBg: '#050505',
    sendButton: primary,
    divider: '#1a1a1a',
    isDark: true,
  });
}

/**
 * 3. Cyberpunk & Synthwave Neon Engine:
 * Obsidian dark bases with vibrant, glowing neon accents.
 */
export function generateCyberpunkPalette(
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'dark'
): ThemeColors {
  const { r, g, b } = hexToRgb(seedHex);
  const { h } = rgbToHsl(r, g, b);

  const primary = hslToHex(h, 100, 56);
  const secondaryNeon = hslToHex((h + 150) % 360, 100, 60);
  const isAmoled = mode === 'amoled';

  if (mode === 'light') {
    return createFullTelegramTheme({
      actionBar: '#18112e',
      actionBarText: '#ffffff',
      actionBarSub: '#c4b5fd',
      surface: '#f3e8ff',
      surfaceVariant: '#ffffff',
      onSurface: '#18112e',
      onSurfaceVariant: '#6b21a8',
      inBubble: '#ffffff',
      outBubble: hslToHex(h, 90, 88),
      outMessageText: '#18112e',
      inMessageText: '#18112e',
      outTimeText: '#7e22ce',
      inTimeText: '#9333ea',
      primary,
      onPrimary: '#ffffff',
      messagePanelBg: '#ffffff',
      sendButton: primary,
      divider: '#e9d5ff',
      isDark: false,
    });
  }

  return createFullTelegramTheme({
    actionBar: '#121024',
    actionBarText: '#f5f3ff',
    actionBarSub: '#a78bfa',
    surface: isAmoled ? '#000000' : '#0c0c16',
    surfaceVariant: isAmoled ? '#0a0914' : '#141226',
    onSurface: '#f5f3ff',
    onSurfaceVariant: '#9ca3af',
    inBubble: '#18162b',
    outBubble: hslToHex(h, 80, 28),
    outMessageText: '#ffffff',
    inMessageText: '#f5f3ff',
    outTimeText: hslToHex(h, 70, 78),
    inTimeText: '#7e7b99',
    primary,
    onPrimary: '#000000',
    accentCheck: secondaryNeon,
    messagePanelBg: '#121024',
    sendButton: primary,
    divider: '#231f3d',
    isDark: true,
  });
}

/**
 * 4. iOS Minimal Glass Engine:
 * Cupertino sleek aesthetics with clean contrast and vibrant Apple accents.
 */
export function generateIosGlassPalette(
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'dark'
): ThemeColors {
  const { r, g, b } = hexToRgb(seedHex);
  const { h } = rgbToHsl(r, g, b);

  const primary = hslToHex(h, 90, 52);

  if (mode === 'light') {
    return createFullTelegramTheme({
      actionBar: '#f2f2f7',
      actionBarText: '#000000',
      actionBarSub: '#8e8e93',
      surface: '#ffffff',
      surfaceVariant: '#f2f2f7',
      onSurface: '#000000',
      onSurfaceVariant: '#8e8e93',
      inBubble: '#e9e9eb',
      outBubble: primary,
      outMessageText: '#ffffff',
      inMessageText: '#000000',
      outTimeText: '#dbeafe',
      inTimeText: '#8e8e93',
      primary,
      onPrimary: '#ffffff',
      messagePanelBg: '#f9f9f9',
      sendButton: primary,
      divider: '#d1d1d6',
      isDark: false,
    });
  }

  return createFullTelegramTheme({
    actionBar: '#1c1c1e',
    actionBarText: '#ffffff',
    actionBarSub: '#8e8e93',
    surface: '#000000',
    surfaceVariant: '#1c1c1e',
    onSurface: '#ffffff',
    onSurfaceVariant: '#8e8e93',
    inBubble: '#2c2c2e',
    outBubble: primary,
    outMessageText: '#ffffff',
    inMessageText: '#ffffff',
    outTimeText: '#dbeafe',
    inTimeText: '#8e8e93',
    primary,
    onPrimary: '#ffffff',
    messagePanelBg: '#1c1c1e',
    sendButton: primary,
    divider: '#2c2c2e',
    isDark: true,
  });
}

/**
 * 5. Modern Developer Dark (Catppuccin / Tokyo Night style) Engine:
 * Soft velvet palettes with gentle contrast and modern IDE aesthetics.
 */
export function generateDeveloperDarkPalette(
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'dark'
): ThemeColors {
  const { r, g, b } = hexToRgb(seedHex);
  const { h } = rgbToHsl(r, g, b);

  const primary = mode === 'light'
    ? hslToHex(h, 75, 45)
    : hslToHex(h, 80, 75);

  if (mode === 'light') {
    return createFullTelegramTheme({
      actionBar: '#e6e9ef',
      actionBarText: '#4c4f69',
      actionBarSub: '#8c8fa1',
      surface: '#eff1f5',
      surfaceVariant: '#e6e9ef',
      onSurface: '#4c4f69',
      onSurfaceVariant: '#8c8fa1',
      inBubble: '#ccd0da',
      outBubble: hslToHex(h, 55, 84),
      outMessageText: '#202028',
      inMessageText: '#4c4f69',
      outTimeText: hslToHex(h, 50, 40),
      inTimeText: '#7c7f93',
      primary,
      onPrimary: '#ffffff',
      messagePanelBg: '#eff1f5',
      sendButton: primary,
      divider: '#ccd0da',
      isDark: false,
    });
  }

  const isAmoled = mode === 'amoled';

  return createFullTelegramTheme({
    actionBar: isAmoled ? '#08080c' : '#181825',
    actionBarText: '#cdd6f4',
    actionBarSub: '#a6adc8',
    surface: isAmoled ? '#000000' : '#1e1e2e',
    surfaceVariant: isAmoled ? '#11111b' : '#181825',
    onSurface: '#cdd6f4',
    onSurfaceVariant: '#a6adc8',
    inBubble: '#313244',
    outBubble: hslToHex(h, 45, 30),
    outMessageText: '#ffffff',
    inMessageText: '#cdd6f4',
    outTimeText: '#bac2de',
    inTimeText: '#9399b2',
    primary,
    onPrimary: '#11111b',
    messagePanelBg: isAmoled ? '#0e0e16' : '#181825',
    sendButton: primary,
    divider: '#313244',
    isDark: true,
  });
}

/**
 * 6. Material 3 (Monet) Engine:
 * Google Material You dynamic tonal extraction.
 */
export function generateMonetPalette(
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'dark'
): ThemeColors {
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);
  const isDark = mode !== 'light';

  const primary = hslToHex(h, Math.min(s, 75), mode === 'light' ? 40 : 80);
  const onPrimary = hslToHex(h, Math.min(s, 60), mode === 'light' ? 100 : 20);
  const primaryContainer = hslToHex(h, Math.min(s, 50), mode === 'light' ? 90 : 30);

  const surface = mode === 'amoled'
    ? '#000000'
    : mode === 'dark'
      ? hslToHex(h, 15, 12)
      : hslToHex(h, 20, 98);

  const surfaceVariant = mode === 'amoled'
    ? '#121212'
    : mode === 'dark'
      ? hslToHex(h, 12, 18)
      : hslToHex(h, 15, 92);

  const onSurface = mode === 'light' ? '#1c1b1f' : '#e6e1e5';
  const onSurfaceVariant = mode === 'light' ? '#49454f' : '#cac4d0';

  const inBubble = mode === 'amoled'
    ? '#161618'
    : mode === 'dark'
      ? hslToHex(h, 14, 20)
      : hslToHex(h, 10, 96);

  const outBubble = mode === 'amoled'
    ? hslToHex(h, 45, 25)
    : mode === 'dark'
      ? hslToHex(h, 40, 26)
      : hslToHex(h, 55, 88);

  const outMessageText = getReadableTextColor(outBubble, '#ffffff', '#1a1a1a');
  const inMessageText = getReadableTextColor(inBubble, '#ffffff', '#1a1a1a');
  const outTimeText = blend(outMessageText, outBubble, 0.35);
  const inTimeText = blend(inMessageText, inBubble, 0.4);

  const actionBar = mode === 'amoled'
    ? '#050505'
    : mode === 'dark'
      ? hslToHex(h, 16, 15)
      : hslToHex(h, 25, 95);

  const actionBarText = getReadableTextColor(actionBar, '#ffffff', '#1a1a1a');
  const actionBarSub = blend(actionBarText, actionBar, 0.35);

  const messagePanelBg = mode === 'amoled'
    ? '#0a0a0a'
    : mode === 'dark'
      ? hslToHex(h, 15, 14)
      : hslToHex(h, 15, 96);

  return createFullTelegramTheme({
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
    primaryContainer,
    messagePanelBg,
    sendButton: primary,
    divider: mode === 'dark' || mode === 'amoled' ? '#27272a' : '#e4e4e7',
    isDark,
  });
}

/**
 * Unified Dispatcher: Generates themes by selected engine.
 */
export function generateThemeByEngine(
  engine: GeneratorEngine,
  seedHex: string,
  mode: 'dark' | 'light' | 'amoled' = 'dark'
): ThemeColors {
  switch (engine) {
    case 'classic-telegram':
      return generateClassicTelegramPalette(seedHex, mode);
    case 'amoled-contrast':
      return generateHighContrastAmoledPalette(seedHex, mode);
    case 'cyberpunk':
      return generateCyberpunkPalette(seedHex, mode);
    case 'ios-glass':
      return generateIosGlassPalette(seedHex, mode);
    case 'developer-dark':
      return generateDeveloperDarkPalette(seedHex, mode);
    case 'monet':
    default:
      return generateMonetPalette(seedHex, mode);
  }
}

export const generateMonetTheme = generateMonetPalette;

// Known Telegram Android stock green color hexes that leak when keys are omitted or un-themed
const STOCK_TELEGRAM_GREENS = new Set([
  '#46aa36',
  '#46aa37',
  '#46aa33',
  '#4fad4e',
  '#40a920',
  '#7dc071',
  '#55ab4f',
  '#5db050',
  '#75bd5e',
  '#45bd5e',
  '#4fae3e',
]);

/**
 * Checks if a color string matches or is extremely close to Telegram's stock electric green fallbacks.
 */
export function isStockTelegramGreen(colorHex?: string): boolean {
  if (!colorHex) return false;
  const hex = colorHex.toLowerCase().trim();
  const hex6 = hex.length === 9 ? `#${hex.slice(3)}` : hex; // strip ARGB alpha if present
  if (STOCK_TELEGRAM_GREENS.has(hex6) || STOCK_TELEGRAM_GREENS.has(hex)) return true;
  try {
    const { r, g, b } = hexToRgb(hex6);
    const { h, s, l } = rgbToHsl(r, g, b);
    // Detect saturated vibrant greens (hue 85-150, saturation >= 32%, lightness 20-82%)
    if (h >= 85 && h <= 150 && s >= 32 && l >= 20 && l <= 82) {
      return true;
    }
  } catch {
    // Ignore malformed hex
  }
  return false;
}

/**
 * Checks if a theme is intentionally designed around green (e.g. Sage Forest)
 * so we don't accidentally sanitize desired green palettes.
 */
export function isIntentionalGreenTheme(norm: ThemeColors): boolean {
  const candidates = [
    norm.actionBarTabActiveText,
    norm.chats_unreadCounter,
    norm.chat_messagePanelSend,
    norm.chat_outBubble,
    norm.windowBackgroundWhite,
  ].filter(Boolean) as string[];

  let greenCount = 0;
  for (const c of candidates) {
    try {
      const { r, g, b } = hexToRgb(c);
      const { h, s } = rgbToHsl(r, g, b);
      if (h >= 85 && h <= 155 && s >= 28) {
        greenCount++;
      }
    } catch {
      // Ignore
    }
  }
  return greenCount >= 2;
}

/**
 * Guarantees that essential variables (like audio seekbars, voice recording bubbles,
 * play buttons, and attachment icons) are always defined so Telegram Android never falls back
 * to its hardcoded green default colors (#4fae3e / #87ba5c).
 */
export function normalizeThemeColors(colors: ThemeColors): ThemeColors {
  const norm: ThemeColors = { ...colors };

  // Bottom chat panel icons & attachment (Guarantees paperclip, mic & emoji icons are crisp and visible on phone)
  const panelBg = norm.chat_messagePanelBackground || norm.chat_wallpaper || '#0e1621';
  const isDarkPanel = getLuminance(panelBg) < 0.45;

  if (!norm.chat_messagePanelIcons) {
    norm.chat_messagePanelIcons = isDarkPanel
      ? (norm.actionBarDefaultTitle || '#b0c4de')
      : '#52606d';
  } else if (isDarkPanel && getLuminance(norm.chat_messagePanelIcons) < 0.42) {
    // Boost luminance so paperclip & mic icons are crisp and clear on dark backgrounds
    norm.chat_messagePanelIcons = blend(norm.chat_messagePanelIcons, '#ffffff', 0.65);
  } else if (!isDarkPanel && getLuminance(norm.chat_messagePanelIcons) > 0.62) {
    norm.chat_messagePanelIcons = blend(norm.chat_messagePanelIcons, '#000000', 0.60);
  }

  if (!norm.chat_messagePanelAttach) {
    norm.chat_messagePanelAttach = norm.chat_messagePanelIcons;
  } else if (isDarkPanel && getLuminance(norm.chat_messagePanelAttach) < 0.42) {
    norm.chat_messagePanelAttach = blend(norm.chat_messagePanelAttach, '#ffffff', 0.65);
  } else if (!isDarkPanel && getLuminance(norm.chat_messagePanelAttach) > 0.62) {
    norm.chat_messagePanelAttach = blend(norm.chat_messagePanelAttach, '#000000', 0.60);
  }

  if (!norm.chat_messagePanelSend) {
    norm.chat_messagePanelSend = norm.chat_outSentCheck || norm.actionBarDefault || '#4ea4f5';
  }

  // Voice Note Play Circles & Loaders (Prevent green default #70bc74 / #4fae3e)
  if (!norm.chat_outAudioProgress) {
    norm.chat_outAudioProgress = norm.chat_messageTextOut || '#ffffff';
  }
  if (!norm.chat_outAudioProgressSelected) {
    norm.chat_outAudioProgressSelected = norm.chat_outAudioProgress;
  }
  if (!norm.chat_outAudioSelectedProgress) {
    norm.chat_outAudioSelectedProgress = norm.chat_outAudioProgressSelected;
  }
  if (!norm.chat_inAudioProgress) {
    norm.chat_inAudioProgress = norm.chat_inReplyName || norm.chat_inReplyLine || norm.chat_outSentCheck || '#4ea4f5';
  }
  if (!norm.chat_inAudioProgressSelected) {
    norm.chat_inAudioProgressSelected = norm.chat_inAudioProgress;
  }
  if (!norm.chat_inAudioSelectedProgress) {
    norm.chat_inAudioSelectedProgress = norm.chat_inAudioProgressSelected;
  }
  if (!norm.chat_outLoader) {
    norm.chat_outLoader = norm.chat_outAudioProgress || norm.chat_messageTextOut || '#ffffff';
  }
  if (!norm.chat_outLoaderSelected) {
    norm.chat_outLoaderSelected = norm.chat_outLoader;
  }
  if (!norm.chat_inLoader) {
    norm.chat_inLoader = norm.chat_inAudioProgress || norm.chat_inReplyName || '#4ea4f5';
  }
  if (!norm.chat_inLoaderSelected) {
    norm.chat_inLoaderSelected = norm.chat_inLoader;
  }

  // Sent Read Checkmarks (double checks)
  if (!norm.chat_outSentCheckRead) {
    norm.chat_outSentCheckRead = norm.chat_outSentCheck || '#4ea4f5';
  }
  if (!norm.chat_outSentCheckReadSelected) {
    norm.chat_outSentCheckReadSelected = norm.chat_outSentCheckSelected || norm.chat_outSentCheckRead;
  }

  // Voice Note Duration Timer Text (Prevent green default #70b15c / #55ab4f)
  if (!norm.chat_outAudioDurationText) {
    norm.chat_outAudioDurationText = norm.chat_outTimeText || norm.chat_messageTextOut || '#7099be';
  }
  if (!norm.chat_outAudioDurationSelectedText) {
    norm.chat_outAudioDurationSelectedText = norm.chat_outAudioDurationText;
  }
  if (!norm.chat_inAudioDurationText) {
    norm.chat_inAudioDurationText = norm.chat_inTimeText || '#6d8397';
  }
  if (!norm.chat_inAudioDurationSelectedText) {
    norm.chat_inAudioDurationSelectedText = norm.chat_inAudioDurationText;
  }
  if (!norm.chat_outAudioTimeText) {
    norm.chat_outAudioTimeText = norm.chat_outTimeText || norm.chat_outAudioDurationText;
  }
  if (!norm.chat_inAudioTimeText) {
    norm.chat_inAudioTimeText = norm.chat_inTimeText || norm.chat_inAudioDurationText;
  }

  // Play button media icons inside circles
  if (!norm.chat_outMediaIcon) {
    norm.chat_outMediaIcon = norm.chat_outBubble || '#2b5278';
  }
  if (!norm.chat_inMediaIcon) {
    norm.chat_inMediaIcon = norm.chat_inBubble || '#ffffff';
  }

  // Outgoing Voice Note Waveform Seekbars (Prevent green default #87ba5c)
  if (!norm.chat_outVoiceSeekbarFill) {
    norm.chat_outVoiceSeekbarFill = norm.chat_outAudioProgress || norm.chat_messageTextOut || '#ffffff';
  }
  if (!norm.chat_outVoiceSeekbar) {
    norm.chat_outVoiceSeekbar = norm.chat_outAudioSeekbar || norm.chat_outTimeText || 'rgba(255,255,255,0.4)';
  }
  if (!norm.chat_outVoiceSeekbarSelected) {
    norm.chat_outVoiceSeekbarSelected = norm.chat_outVoiceSeekbarFill;
  }

  // Incoming Voice Note Waveform Seekbars
  if (!norm.chat_inVoiceSeekbarFill) {
    norm.chat_inVoiceSeekbarFill = norm.chat_inAudioProgress || norm.chat_inReplyName || '#4ea4f5';
  }
  if (!norm.chat_inVoiceSeekbar) {
    norm.chat_inVoiceSeekbar = norm.chat_inAudioSeekbar || norm.chat_inTimeText || 'rgba(128,128,128,0.4)';
  }
  if (!norm.chat_inVoiceSeekbarSelected) {
    norm.chat_inVoiceSeekbarSelected = norm.chat_inVoiceSeekbarFill;
  }

  // Audio / Music File Seekbars & Cache Track
  if (!norm.chat_outAudioSeekbar) {
    norm.chat_outAudioSeekbar = norm.chat_outVoiceSeekbar;
  }
  if (!norm.chat_outAudioSeekbarFill) {
    norm.chat_outAudioSeekbarFill = norm.chat_outVoiceSeekbarFill;
  }
  if (!norm.chat_outAudioSeekbarSelected) {
    norm.chat_outAudioSeekbarSelected = norm.chat_outVoiceSeekbarFill;
  }
  if (!norm.chat_outAudioCacheSeekbar) {
    norm.chat_outAudioCacheSeekbar = norm.chat_outVoiceSeekbar;
  }
  if (!norm.chat_inAudioSeekbar) {
    norm.chat_inAudioSeekbar = norm.chat_inVoiceSeekbar;
  }
  if (!norm.chat_inAudioSeekbarFill) {
    norm.chat_inAudioSeekbarFill = norm.chat_inVoiceSeekbarFill;
  }
  if (!norm.chat_inAudioSeekbarSelected) {
    norm.chat_inAudioSeekbarSelected = norm.chat_inVoiceSeekbarFill;
  }
  if (!norm.chat_inAudioCacheSeekbar) {
    norm.chat_inAudioCacheSeekbar = norm.chat_inVoiceSeekbar;
  }

  // File backgrounds & progress
  if (!norm.chat_outFileBackground) {
    norm.chat_outFileBackground = norm.chat_outBubble || '#2b5278';
  }
  if (!norm.chat_outFileBackgroundSelected) {
    norm.chat_outFileBackgroundSelected = norm.chat_outFileBackground;
  }
  if (!norm.chat_inFileBackground) {
    norm.chat_inFileBackground = norm.chat_inAudioProgress || '#4ea4f5';
  }
  if (!norm.chat_inFileBackgroundSelected) {
    norm.chat_inFileBackgroundSelected = norm.chat_inFileBackground;
  }
  if (!norm.chat_outFileProgress) {
    norm.chat_outFileProgress = norm.chat_outAudioProgress || '#ffffff';
  }
  if (!norm.chat_outFileProgressSelected) {
    norm.chat_outFileProgressSelected = norm.chat_outFileProgress;
  }
  if (!norm.chat_inFileProgress) {
    norm.chat_inFileProgress = '#ffffff';
  }
  if (!norm.chat_inFileProgressSelected) {
    norm.chat_inFileProgressSelected = norm.chat_inFileProgress;
  }

  // Recording Voice Overlay & Previews (Prevent green defaults #55ab4f and #a2ce93)
  if (!norm.chat_recordedVoiceBackground) {
    norm.chat_recordedVoiceBackground = norm.actionBarDefault || '#1c242d';
  }
  if (!norm.chat_recordedVoicePlayPause) {
    norm.chat_recordedVoicePlayPause = norm.chat_messageTextOut || '#ffffff';
  }
  if (!norm.chat_recordedVoicePlayPausePressed) {
    norm.chat_recordedVoicePlayPausePressed = norm.chat_recordedVoicePlayPause;
  }
  if (!norm.chat_recordedVoiceProgress) {
    norm.chat_recordedVoiceProgress = norm.chat_outSentCheck || norm.chat_outAudioProgress || '#4ea4f5';
  }
  if (!norm.chat_recordedVoiceProgressInner) {
    norm.chat_recordedVoiceProgressInner = norm.chat_messageTextOut || '#ffffff';
  }
  if (!norm.chat_recordTime) {
    norm.chat_recordTime = norm.chat_messageTextOut || '#ffffff';
  }
  if (!norm.chat_recordVoiceCancel) {
    norm.chat_recordVoiceCancel = norm.chat_outTimeText || norm.actionBarDefaultSubtitle || '#7f93a5';
  }
  if (!norm.chat_recordControl) {
    norm.chat_recordControl = norm.chat_outSentCheck || '#4ea4f5';
  }
  if (!norm.chat_recordedVoiceDot) {
    norm.chat_recordedVoiceDot = '#ef4444';
  }

  // Theme Primary Accent & Header luminance analysis
  const defaultActionAccent = norm.chat_messagePanelSend || norm.chats_unreadCounter || norm.chat_outSentCheck || norm.dialogButton || '#4ea4f5';
  const headerBg = norm.actionBarDefault || '#1c242d';
  const isLightMode = norm.windowBackgroundWhite
    ? getLuminance(norm.windowBackgroundWhite) > 0.6
    : false;
  const isColoredHeaderInLight = isLightMode && getLuminance(headerBg) < 0.65;
  const isLightHeader = getLuminance(headerBg) > 0.58;

  // Dropdown Overflow Submenu (3-dots options menu)
  if (!norm.actionBarDefaultSubmenuBackground) {
    norm.actionBarDefaultSubmenuBackground = isLightHeader ? '#ffffff' : (norm.actionBarDefault || '#1c242d');
  }
  if (!norm.actionBarDefaultSubmenuItem) {
    norm.actionBarDefaultSubmenuItem = isLightHeader ? (norm.windowBackgroundWhiteBlackText || '#111827') : (norm.actionBarDefaultTitle || '#ffffff');
  }
  const subBg = norm.actionBarDefaultSubmenuBackground || (isLightHeader ? '#ffffff' : '#1c242d');
  const targetSubmenuIcon = getContrastRatio(subBg, defaultActionAccent) >= 2.8
    ? defaultActionAccent
    : adjustBrightness(defaultActionAccent, -28);

  if (
    !norm.actionBarDefaultSubmenuItemIcon ||
    norm.actionBarDefaultSubmenuItemIcon === '#7f93a5' ||
    norm.actionBarDefaultSubmenuItemIcon === '#52606d' ||
    norm.actionBarDefaultSubmenuItemIcon === '#708291' ||
    norm.actionBarDefaultSubmenuItemIcon === '#8a8a8a' ||
    norm.actionBarDefaultSubmenuItemIcon === '#212529' ||
    norm.actionBarDefaultSubmenuItemIcon === '#1c1c1e' ||
    norm.actionBarDefaultSubmenuItemIcon === '#111827' ||
    norm.actionBarDefaultSubmenuItemIcon === '#000000'
  ) {
    norm.actionBarDefaultSubmenuItemIcon = targetSubmenuIcon;
  }

  // Modern Telegram Android: Quotes & Reactions
  if (!norm.chat_inQuote) {
    norm.chat_inQuote = norm.chat_inBubble ? adjustBrightness(norm.chat_inBubble, 8) : '#202f3e';
  }
  if (!norm.chat_outQuote) {
    norm.chat_outQuote = norm.chat_outBubble ? adjustBrightness(norm.chat_outBubble, 8) : '#356391';
  }
  if (!norm.chat_inReactionButtonBackground) {
    norm.chat_inReactionButtonBackground = norm.chat_inBubble ? adjustBrightness(norm.chat_inBubble, 10) : '#223244';
  }
  if (!norm.chat_outReactionButtonBackground) {
    norm.chat_outReactionButtonBackground = norm.chat_outBubble ? adjustBrightness(norm.chat_outBubble, 10) : '#3a6c9d';
  }
  if (!norm.chat_inReactionButtonText) {
    norm.chat_inReactionButtonText = norm.chat_outSentCheck || norm.chat_inAudioProgress || '#4ea4f5';
  }
  if (!norm.chat_outReactionButtonText) {
    norm.chat_outReactionButtonText = norm.chat_messageTextOut || '#ffffff';
  }

  // Modern Telegram Android: Voice/Video Switcher Background & Online Status
  if (!norm.chat_messagePanelVoiceBackground) {
    norm.chat_messagePanelVoiceBackground = norm.chat_messagePanelSend || norm.chat_outSentCheck || '#4ea4f5';
  }
  if (!norm.chats_onlineCircle) {
    norm.chats_onlineCircle = '#10b981';
  }

  // Modern Telegram Android: Glass & Liquid Chat Bar Icons (Paperclip, Camera Outline, Mic Outline, Emoji)
  if (!norm.glass_defaultIcon) {
    norm.glass_defaultIcon = norm.chat_messagePanelIcons || norm.chat_messagePanelAttach || defaultActionAccent;
  }
  if (!norm.glass_defaultText) {
    norm.glass_defaultText = norm.glass_defaultIcon;
  }
  if (!norm.glass_tabSelected) {
    norm.glass_tabSelected = norm.glass_defaultIcon;
  }
  if (!norm.glass_tabSelectedText) {
    norm.glass_tabSelectedText = '#ffffff';
  }
  if (!norm.glass_tabUnselected) {
    norm.glass_tabUnselected = norm.chat_messagePanelHint || norm.actionBarDefaultSubtitle || '#7f93a5';
  }

  // Action Bar Icons (Drawer menu hamburger on left, 3-dots, search, back arrow)
  // In light mode: adapt icons directly to the theme accent instead of dark #212529 or grey
  const targetThemeIcon = getContrastRatio(headerBg, defaultActionAccent) >= 2.8
    ? defaultActionAccent
    : adjustBrightness(defaultActionAccent, -28);

  if (isLightHeader) {
    if (
      !norm.actionBarDefaultIcon ||
      norm.actionBarDefaultIcon === '#212529' ||
      norm.actionBarDefaultIcon === '#1c1c1e' ||
      norm.actionBarDefaultIcon === '#111827' ||
      norm.actionBarDefaultIcon === '#000000' ||
      norm.actionBarDefaultIcon === '#7f93a5' ||
      getLuminance(norm.actionBarDefaultIcon) > 0.8
    ) {
      norm.actionBarDefaultIcon = targetThemeIcon;
    }
  } else {
    if (!norm.actionBarDefaultIcon) {
      norm.actionBarDefaultIcon = '#ffffff';
    }
  }

  // Action Bar In-Chat & List Search Field (typed text & placeholder hint)
  // In Telegram Android, if actionBarDefaultSearch is missing, it defaults to #000000 (black).
  // On dark or colored headers, this makes typed text (e.g. "Hello") completely invisible!
  const isDarkActionBar = getLuminance(headerBg) < 0.55;
  const targetSearchText = isDarkActionBar
    ? (norm.actionBarDefaultTitle || '#ffffff')
    : (norm.actionBarDefaultTitle || norm.windowBackgroundWhiteBlackText || '#111827');

  if (
    !norm.actionBarDefaultSearch ||
    (isDarkActionBar && (norm.actionBarDefaultSearch === '#000000' || getContrastRatio(headerBg, norm.actionBarDefaultSearch) < 2.8))
  ) {
    norm.actionBarDefaultSearch = targetSearchText;
  }

  if (!norm.actionBarDefaultSearchPlaceholder) {
    norm.actionBarDefaultSearchPlaceholder = isDarkActionBar
      ? blend(norm.actionBarDefaultSearch || '#ffffff', headerBg, 0.45)
      : (norm.actionBarDefaultSubtitle || blend(norm.actionBarDefaultSearch, headerBg, 0.5) || '#7f93a5');
  }

  // Chat List Selection Mode (Action Mode when long-clicking to select multiple chats to archive/mute/delete/pin)
  // The selection bar matches the header so the top bar remains seamless (never a disjointed white stripe on colored headers)
  if (!norm.actionBarActionModeDefault || (isColoredHeaderInLight && norm.actionBarActionModeDefault.toLowerCase() === '#ffffff')) {
    norm.actionBarActionModeDefault = headerBg;
  }
  if (!norm.actionBarActionModeDefaultTop || (isColoredHeaderInLight && norm.actionBarActionModeDefaultTop.toLowerCase() === '#ffffff')) {
    norm.actionBarActionModeDefaultTop = norm.actionBarActionModeDefault;
  }

  // The action mode bar icons match the theme accent in light mode; on dark headers adapt to light/white
  const isActionModeLight = getLuminance(norm.actionBarActionModeDefault) > 0.58;
  const targetActionModeIcon = getContrastRatio(norm.actionBarActionModeDefault, defaultActionAccent) >= 2.8
    ? defaultActionAccent
    : adjustBrightness(defaultActionAccent, -28);

  if (isActionModeLight) {
    if (
      !norm.actionBarActionModeDefaultIcon ||
      norm.actionBarActionModeDefaultIcon === '#1c1c1e' ||
      norm.actionBarActionModeDefaultIcon === '#212529' ||
      norm.actionBarActionModeDefaultIcon === '#111827' ||
      norm.actionBarActionModeDefaultIcon === '#000000' ||
      getLuminance(norm.actionBarActionModeDefaultIcon) > 0.8
    ) {
      norm.actionBarActionModeDefaultIcon = targetActionModeIcon;
    }
  } else {
    norm.actionBarActionModeDefaultIcon = ensureContrast(
      norm.actionBarActionModeDefaultIcon || defaultActionAccent,
      norm.actionBarActionModeDefault,
      '#ffffff',
      targetActionModeIcon,
      3.0
    );
  }

  if (!norm.actionBarActionModeDefaultSelector) {
    norm.actionBarActionModeDefaultSelector = getLuminance(norm.actionBarActionModeDefault) < 0.55
      ? adjustBrightness(norm.actionBarActionModeDefault, 18)
      : blend(norm.actionBarActionModeDefaultIcon, norm.actionBarActionModeDefault, 0.15);
  }
  if (!norm.profile_tabSelectedLine) {
    norm.profile_tabSelectedLine = defaultActionAccent;
  }
  if (!norm.profile_tabSelectedText) {
    norm.profile_tabSelectedText = defaultActionAccent;
  }
  if (!norm.profile_tabText) {
    norm.profile_tabText = norm.chats_date || norm.chats_message || '#7f93a5';
  }
  if (!norm.profile_tabSelector) {
    norm.profile_tabSelector = norm.actionBarActionModeDefaultSelector;
  }
  if (!norm.telegram_color) {
    norm.telegram_color = defaultActionAccent;
  }
  if (!norm.telegram_color_text) {
    norm.telegram_color_text = defaultActionAccent;
  }
  if (!norm.telegram_color_dialogsLogo) {
    norm.telegram_color_dialogsLogo = defaultActionAccent;
  }

  // Chat List / Search Usernames (@username) & Links (Prevent hardcoded Telegram Blue #2678b6 / #1c93e3)
  if (!norm.windowBackgroundWhiteBlueText3) {
    norm.windowBackgroundWhiteBlueText3 = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteBlueText4) {
    norm.windowBackgroundWhiteBlueText4 = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteBlueText) {
    norm.windowBackgroundWhiteBlueText = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteBlueText2) {
    norm.windowBackgroundWhiteBlueText2 = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteBlueText5) {
    norm.windowBackgroundWhiteBlueText5 = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteBlueText6) {
    norm.windowBackgroundWhiteBlueText6 = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteBlueText7) {
    norm.windowBackgroundWhiteBlueText7 = defaultActionAccent;
  }
  if (!norm.windowBackgroundWhiteLinkText) {
    norm.windowBackgroundWhiteLinkText = defaultActionAccent;
  }
  if (!norm.chats_nameMessage) {
    norm.chats_nameMessage = defaultActionAccent;
  }
  if (!norm.chats_attachMessage) {
    norm.chats_attachMessage = defaultActionAccent;
  }
  if (!norm.chats_actionMessage) {
    norm.chats_actionMessage = defaultActionAccent;
  }
  if (!norm.chats_draft) {
    norm.chats_draft = defaultActionAccent;
  }
  // Folder Tabs (ADAPTED TO THEME ACCENT & CONTRAST, NEVER FORCED TO HARDCODED GREY, WHITE, OR #111827)
  const isDarkTabHeader = getLuminance(headerBg) < 0.55;
  const themeDark = getThemeDarkBase(norm);
  const tabHeaderTitle = norm.actionBarDefaultTitle || (isDarkTabHeader ? '#ffffff' : themeDark);

  const accent = norm.actionBarTabActiveText || defaultActionAccent;
  if (!norm.actionBarTabActiveText) {
    norm.actionBarTabActiveText = accent;
  }
  if (!norm.actionBarTabLine) {
    norm.actionBarTabLine = accent;
  }

  // Inactive tab text: adapt to header & accent instead of hardcoded grey
  const adaptiveUnactiveText = norm.actionBarDefaultSubtitle && norm.actionBarDefaultSubtitle !== '#7f93a5' && norm.actionBarDefaultSubtitle !== '#708291'
    ? norm.actionBarDefaultSubtitle
    : isDarkTabHeader
    ? blend(tabHeaderTitle, accent, 0.2)
    : blend(themeDark, headerBg, 0.45);

  if (!norm.actionBarTabUnactiveText || norm.actionBarTabUnactiveText === '#7f93a5' || norm.actionBarTabUnactiveText === '#708291') {
    norm.actionBarTabUnactiveText = adaptiveUnactiveText;
  }
  if (!norm.actionBarTabSelector) {
    norm.actionBarTabSelector = adjustBrightness(accent, -15);
  }

  // Active badge background & text:
  if (!norm.chats_tabUnreadActiveBackground) {
    norm.chats_tabUnreadActiveBackground = accent;
  }
  const activeBadgeBg = norm.chats_tabUnreadActiveBackground || accent;
  norm.chats_tabUnreadActiveText = resolveBadgeTextColor(
    activeBadgeBg,
    norm.chats_tabUnreadActiveText,
    themeDark,
    isDarkTabHeader
  );

  // Inactive badge background: adapt to theme accent with contrast against themeDark
  const isLegacyWhiteOrDefaultBg = !norm.chats_tabUnreadUnactiveBackground ||
    norm.chats_tabUnreadUnactiveBackground === 'rgba(255,255,255,0.18)' ||
    norm.chats_tabUnreadUnactiveBackground === '#283645' ||
    norm.chats_tabUnreadUnactiveBackground === blend('#ffffff', headerBg, 0.18) ||
    norm.chats_tabUnreadUnactiveBackground === blend(accent, headerBg, 0.22) ||
    (isDarkTabHeader && getContrastRatio(norm.chats_tabUnreadUnactiveBackground, themeDark) < 3.0);

  if (isLegacyWhiteOrDefaultBg) {
    norm.chats_tabUnreadUnactiveBackground = isDarkTabHeader
      ? blend(accent, '#ffffff', 0.25)
      : blend(accent, headerBg, 0.14);
  }
  const unactiveBadgeBg = norm.chats_tabUnreadUnactiveBackground;
  norm.chats_tabUnreadUnactiveText = resolveBadgeTextColor(
    unactiveBadgeBg,
    norm.chats_tabUnreadUnactiveText,
    themeDark,
    isDarkTabHeader
  );

  // Unread Counter Badge Text (Home Screen Chat List)
  const unreadCounterBg = norm.chats_unreadCounter || accent;
  norm.chats_unreadCounterText = resolveBadgeTextColor(
    unreadCounterBg,
    norm.chats_unreadCounterText,
    themeDark,
    isDarkTabHeader
  );

  // Scroll to Bottom Floating Badge Text (Chat Screen)
  const goDownCounterBg = norm.chat_goDownButtonCounterBackground || norm.chat_goToEndButtonCounter || accent;
  norm.chat_goDownButtonCounter = resolveBadgeTextColor(
    goDownCounterBg,
    norm.chat_goDownButtonCounter || norm.chat_goToEndButtonCounterText,
    themeDark,
    isDarkTabHeader
  );
  norm.chat_goToEndButtonCounterText = norm.chat_goDownButtonCounter;

  // Archived Chats (Prevents default gray circle placeholder avatar in chat list)
  if (!norm.avatar_backgroundArchived) {
    norm.avatar_backgroundArchived = defaultActionAccent;
  }
  if (!norm.avatar_backgroundArchivedHidden) {
    norm.avatar_backgroundArchivedHidden = adjustBrightness(defaultActionAccent, -12);
  }
  if (!norm.chats_archiveIcon) {
    norm.chats_archiveIcon = '#ffffff';
  }
  if (!norm.chats_archiveText) {
    norm.chats_archiveText = norm.chats_name || '#ffffff';
  }
  if (!norm.chats_nameMessageArchived) {
    norm.chats_nameMessageArchived = defaultActionAccent;
  }

  // Mute & Pin icons, Muted badges, and Chat Date
  if (!norm.chats_muteIcon) {
    norm.chats_muteIcon = blend(defaultActionAccent, norm.chats_date || '#7f93a5', 0.45);
  }
  if (!norm.chats_pinnedIcon) {
    norm.chats_pinnedIcon = defaultActionAccent;
  }
  if (!norm.chats_pinnedOverlay) {
    norm.chats_pinnedOverlay = setHexAlpha(defaultActionAccent, 12);
  }
  if (!norm.chats_unreadCounterMuted) {
    norm.chats_unreadCounterMuted = blend(defaultActionAccent, norm.windowBackgroundWhite || '#17212b', 0.25);
  }

  // Sent/Read checkmarks in Chat List & Message Bubbles (PREVENTS HARDCODED STOCK GREEN #46aa37 / #46aa36)
  const isGreenTheme = isIntentionalGreenTheme(norm);

  let checkColor: string;
  if (norm.chat_outSentCheckRead && (!isStockTelegramGreen(norm.chat_outSentCheckRead) || isGreenTheme)) {
    checkColor = norm.chat_outSentCheckRead;
  } else if (norm.chat_outSentCheck && (!isStockTelegramGreen(norm.chat_outSentCheck) || isGreenTheme)) {
    checkColor = norm.chat_outSentCheck;
  } else if (norm.chats_sentReadCheck && (!isStockTelegramGreen(norm.chats_sentReadCheck) || isGreenTheme)) {
    checkColor = norm.chats_sentReadCheck;
  } else if (norm.chats_sentCheck && (!isStockTelegramGreen(norm.chats_sentCheck) || isGreenTheme)) {
    checkColor = norm.chats_sentCheck;
  } else {
    checkColor = defaultActionAccent;
  }

  // Ensure all chat list and bubble checkmark variables are fully harmonized
  norm.chats_sentCheck = checkColor;
  norm.chats_sentReadCheck = checkColor;
  norm.chat_outSentCheck = checkColor;
  norm.chat_outSentCheckRead = checkColor;
  norm.chat_outSentCheckSelected = norm.chat_outSentCheckSelected && (!isStockTelegramGreen(norm.chat_outSentCheckSelected) || isGreenTheme) ? norm.chat_outSentCheckSelected : checkColor;
  norm.chat_outSentCheckReadSelected = norm.chat_outSentCheckReadSelected && (!isStockTelegramGreen(norm.chat_outSentCheckReadSelected) || isGreenTheme) ? norm.chat_outSentCheckReadSelected : checkColor;
  norm.chat_mediaSentCheck = norm.chat_mediaSentCheck && (!isStockTelegramGreen(norm.chat_mediaSentCheck) || isGreenTheme) ? norm.chat_mediaSentCheck : '#ffffff';

  if (!norm.chats_sentClock) {
    norm.chats_sentClock = norm.chat_outSentClock || norm.chats_date || '#7f93a5';
  }

  // Forwarded Messages & Peer Author Names (PREVENTS DEFAULT NEON GREEN #4fad4e / #40a920 FORWARD HEADERS & TIMESTAMPS)
  // Adapts forward arrow, date timestamp, and author name across all color IDs to dark/theme accent colors
  let defaultForwardAccent: string;
  if (norm.avatar_nameInMessageGreen && (!isStockTelegramGreen(norm.avatar_nameInMessageGreen) || isGreenTheme)) {
    defaultForwardAccent = norm.avatar_nameInMessageGreen;
  } else if (norm.chat_inForwardedNameText && (!isStockTelegramGreen(norm.chat_inForwardedNameText) || isGreenTheme) && norm.chat_inForwardedNameText.toLowerCase() !== '#3886c7') {
    defaultForwardAccent = norm.chat_inForwardedNameText;
  } else if (norm.chat_outForwardedNameText && (!isStockTelegramGreen(norm.chat_outForwardedNameText) || isGreenTheme) && norm.chat_outForwardedNameText.toLowerCase() !== '#55ab4f') {
    defaultForwardAccent = norm.chat_outForwardedNameText;
  } else if (norm.chat_inReplyNameText && (!isStockTelegramGreen(norm.chat_inReplyNameText) || isGreenTheme)) {
    defaultForwardAccent = norm.chat_inReplyNameText;
  } else if (norm.chat_inReplyName && (!isStockTelegramGreen(norm.chat_inReplyName) || isGreenTheme)) {
    defaultForwardAccent = norm.chat_inReplyName;
  } else if (norm.chats_unreadCounter && (!isStockTelegramGreen(norm.chats_unreadCounter) || isGreenTheme)) {
    defaultForwardAccent = norm.chats_unreadCounter;
  } else if (checkColor && (!isStockTelegramGreen(checkColor) || isGreenTheme)) {
    defaultForwardAccent = checkColor;
  } else {
    defaultForwardAccent = defaultActionAccent;
  }

  norm.avatar_nameInMessageGreen = defaultForwardAccent;
  norm.avatar_nameInMessageViolet = norm.avatar_nameInMessageViolet && (!isStockTelegramGreen(norm.avatar_nameInMessageViolet) || isGreenTheme) ? norm.avatar_nameInMessageViolet : defaultForwardAccent;
  norm.avatar_nameInMessagePink = norm.avatar_nameInMessagePink && (!isStockTelegramGreen(norm.avatar_nameInMessagePink) || isGreenTheme) ? norm.avatar_nameInMessagePink : defaultForwardAccent;
  norm.avatar_nameInMessageRed = norm.avatar_nameInMessageRed && (!isStockTelegramGreen(norm.avatar_nameInMessageRed) || isGreenTheme) ? norm.avatar_nameInMessageRed : defaultForwardAccent;
  norm.avatar_nameInMessageOrange = norm.avatar_nameInMessageOrange && (!isStockTelegramGreen(norm.avatar_nameInMessageOrange) || isGreenTheme) ? norm.avatar_nameInMessageOrange : defaultForwardAccent;
  norm.avatar_nameInMessageBlue = norm.avatar_nameInMessageBlue && (!isStockTelegramGreen(norm.avatar_nameInMessageBlue) || isGreenTheme) ? norm.avatar_nameInMessageBlue : defaultForwardAccent;
  norm.avatar_nameInMessageCyan = norm.avatar_nameInMessageCyan && (!isStockTelegramGreen(norm.avatar_nameInMessageCyan) || isGreenTheme) ? norm.avatar_nameInMessageCyan : defaultForwardAccent;
  norm.avatar_nameInMessageColour = defaultForwardAccent;

  // Numerical aliases for Telegram forks & indexed peers
  for (let i = 0; i <= 7; i++) {
    norm[`avatar_nameInMessage${i}`] = defaultForwardAccent;
  }

  norm.chat_inForwardedNameText = defaultForwardAccent;
  norm.chat_outForwardedNameText = norm.chat_outReplyNameText && (!isStockTelegramGreen(norm.chat_outReplyNameText) || isGreenTheme) ? norm.chat_outReplyNameText : defaultForwardAccent;
  norm.chat_inForwarded = norm.chat_inForwardedNameText;
  norm.chat_outForwarded = norm.chat_outForwardedNameText;

  // Section Headers in Search Results ("Global search", "Messages") & Settings ("Contacts")
  // PREVENTS STOCK WHITE BARS (#ffffff / #f0f2f5 / default) ON DARK THEMES IN TELEGRAM ANDROID
  const canvasBg = norm.windowBackgroundWhite || norm.windowBackgroundGray || norm.chat_wallpaper || '#17212b';
  const isDarkCanvas = getLuminance(canvasBg) < 0.5;
  const baseGraySectionBg = norm.windowBackgroundGray || norm.windowBackgroundWhite || '#131b24';
  const isDarkBaseGray = getLuminance(baseGraySectionBg) < 0.5;

  if (!norm.graySection) {
    norm.graySection = isDarkCanvas
      ? (isDarkBaseGray ? adjustBrightness(baseGraySectionBg, 5) : '#131b24')
      : '#f0f2f5';
  } else if (isDarkCanvas && getLuminance(norm.graySection) > 0.55) {
    // If the theme is dark, but graySection was left as default white / light gray (#ffffff / #f0f2f5)
    norm.graySection = isDarkBaseGray
      ? adjustBrightness(baseGraySectionBg, 5)
      : '#131b24';
  } else if (!isDarkCanvas && getLuminance(norm.graySection) < 0.25) {
    norm.graySection = '#f0f2f5';
  }

  // Section Header Text: ensure sufficient contrast against graySection
  const sectionTextFallback = norm.windowBackgroundWhiteGrayText || norm.chats_message || (isDarkCanvas ? '#7f93a5' : '#708291');
  const graySecLum = getLuminance(norm.graySection);
  const isDarkGraySec = graySecLum < 0.5;

  let resolvedGraySecText = norm.key_graySectionText || norm.graySectionText || sectionTextFallback;
  if (isDarkGraySec && getLuminance(resolvedGraySecText) < 0.35) {
    resolvedGraySecText = ensureContrast(resolvedGraySecText, norm.graySection, '#ffffff', '#7f93a5', 3.0);
  } else if (!isDarkGraySec && getLuminance(resolvedGraySecText) > 0.65) {
    resolvedGraySecText = ensureContrast(resolvedGraySecText, norm.graySection, '#1e293b', '#64748b', 3.0);
  }

  norm.key_graySectionText = resolvedGraySecText;
  norm.graySectionText = resolvedGraySecText;
  if (!norm.windowBackgroundWhiteGrayText2 || (isDarkGraySec && getLuminance(norm.windowBackgroundWhiteGrayText2) < 0.35)) {
    norm.windowBackgroundWhiteGrayText2 = resolvedGraySecText;
  }

  // ==================== IN-APP MINI MUSIC PLAYER BAR (IMAGE 1) ====================
  // Prevents dark/black track title & artist text on dark background in the mini player bar
  if (!norm.inappPlayerBackground) {
    norm.inappPlayerBackground = isDarkCanvas
      ? (norm.surfaceVariant ? adjustBrightness(norm.surfaceVariant, 4) : (norm.actionBarDefault || '#18222d'))
      : '#edf2f7';
  }
  const miniPlayerLum = getLuminance(norm.inappPlayerBackground);
  const isDarkMiniPlayer = miniPlayerLum < 0.5;

  let resolvedPlayerTitle = norm.inappPlayerTitle;
  if (!resolvedPlayerTitle || (isDarkMiniPlayer && getLuminance(resolvedPlayerTitle) < 0.45)) {
    resolvedPlayerTitle = isDarkMiniPlayer ? (norm.actionBarDefaultTitle || '#ffffff') : (norm.windowBackgroundWhiteBlackText || '#1c242d');
  }
  norm.inappPlayerTitle = resolvedPlayerTitle;

  let resolvedPlayerPerformer = norm.inappPlayerPerformer;
  if (!resolvedPlayerPerformer || (isDarkMiniPlayer && getLuminance(resolvedPlayerPerformer) < 0.35)) {
    resolvedPlayerPerformer = isDarkMiniPlayer ? (norm.actionBarDefaultSubtitle || norm.windowBackgroundWhiteGrayText || '#7f93a5') : '#708291';
  }
  norm.inappPlayerPerformer = resolvedPlayerPerformer;

  if (!norm.inappPlayerClose || (isDarkMiniPlayer && getLuminance(norm.inappPlayerClose) < 0.45)) {
    norm.inappPlayerClose = isDarkMiniPlayer ? (norm.actionBarDefaultIcon || norm.actionBarDefaultTitle || '#ffffff') : '#52606d';
  }
  if (!norm.inappPlayerPlayPause) {
    norm.inappPlayerPlayPause = defaultActionAccent;
  }

  // ==================== FULL AUDIO PLAYER SHEET / CARD (IMAGE 2) ====================
  // Prevents static solid white card in dark themes when playing music/audio
  if (!norm.player_background) {
    norm.player_background = isDarkCanvas
      ? (norm.surfaceVariant || norm.dialogBackground || norm.windowBackgroundWhite || '#17212b')
      : '#ffffff';
  } else if (isDarkCanvas && getLuminance(norm.player_background) > 0.6) {
    // Corrects static white player background on dark themes
    norm.player_background = norm.surfaceVariant || norm.dialogBackground || norm.windowBackgroundWhite || '#17212b';
  }

  const playerBgLum = getLuminance(norm.player_background);
  const isDarkPlayer = playerBgLum < 0.5;

  if (!norm.player_actionBar || (isDarkPlayer && getLuminance(norm.player_actionBar) > 0.6)) {
    norm.player_actionBar = norm.player_background;
  }
  if (!norm.player_actionBarTop) {
    norm.player_actionBarTop = norm.player_actionBar;
  }
  if (!norm.player_actionBarTitle || (isDarkPlayer && getLuminance(norm.player_actionBarTitle) < 0.45)) {
    norm.player_actionBarTitle = isDarkPlayer ? (norm.actionBarDefaultTitle || '#ffffff') : '#1c242d';
  }
  if (!norm.player_actionBarSubtitle || (isDarkPlayer && getLuminance(norm.player_actionBarSubtitle) < 0.35)) {
    norm.player_actionBarSubtitle = isDarkPlayer ? (norm.actionBarDefaultSubtitle || '#7f93a5') : '#708291';
  }
  if (!norm.player_actionBarItems || (isDarkPlayer && getLuminance(norm.player_actionBarItems) < 0.45)) {
    norm.player_actionBarItems = isDarkPlayer ? '#ffffff' : '#52606d';
  }
  if (!norm.player_progress) {
    norm.player_progress = defaultActionAccent;
  }
  if (!norm.player_progressBackground) {
    norm.player_progressBackground = isDarkPlayer ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  }
  if (!norm.player_time || (isDarkPlayer && getLuminance(norm.player_time) < 0.35)) {
    norm.player_time = isDarkPlayer ? (norm.windowBackgroundWhiteGrayText || '#7f93a5') : '#708291';
  }
  if (!norm.player_button || (isDarkPlayer && getLuminance(norm.player_button) < 0.45)) {
    norm.player_button = isDarkPlayer ? '#ffffff' : '#1c242d';
  }
  if (!norm.player_buttonActive) {
    norm.player_buttonActive = defaultActionAccent;
  }
  if (!norm.player_placeholder) {
    norm.player_placeholder = defaultActionAccent;
  }
  if (!norm.player_placeholderBackground) {
    norm.player_placeholderBackground = isDarkPlayer
      ? (norm.player_background ? adjustBrightness(norm.player_background, -6) : '#121922')
      : (norm.player_background ? adjustBrightness(norm.player_background, 6) : '#f4f4f4');
  }

  // ==================== EMOJI SUGGESTIONS WINDOW & STICKER PANELS (IMAGE 3) ====================
  // Prevents static solid white speech bubble popup when typing emoji keywords
  if (!norm.chat_stickersHintPanel) {
    norm.chat_stickersHintPanel = isDarkCanvas
      ? (norm.surfaceVariant ? adjustBrightness(norm.surfaceVariant, 8) : (norm.windowBackgroundWhite ? adjustBrightness(norm.windowBackgroundWhite, 8) : '#202b36'))
      : '#ffffff';
  } else if (isDarkCanvas && getLuminance(norm.chat_stickersHintPanel) > 0.6) {
    // Fixes white suggestion bubble in dark themes
    norm.chat_stickersHintPanel = norm.surfaceVariant
      ? adjustBrightness(norm.surfaceVariant, 8)
      : (norm.windowBackgroundWhite ? adjustBrightness(norm.windowBackgroundWhite, 8) : '#202b36');
  }

  if (!norm.chat_emojiPanelBackground) {
    norm.chat_emojiPanelBackground = isDarkCanvas
      ? (norm.surfaceVariant || norm.windowBackgroundWhite || '#17212b')
      : '#ffffff';
  } else if (isDarkCanvas && getLuminance(norm.chat_emojiPanelBackground) > 0.6) {
    norm.chat_emojiPanelBackground = norm.surfaceVariant || norm.windowBackgroundWhite || '#17212b';
  }

  const isDarkEmojiPanel = getLuminance(norm.chat_emojiPanelBackground) < 0.5;
  if (!norm.chat_emojiPanelIcon || (isDarkEmojiPanel && getLuminance(norm.chat_emojiPanelIcon) < 0.35)) {
    norm.chat_emojiPanelIcon = isDarkEmojiPanel ? '#7f93a5' : '#708291';
  }
  if (!norm.chat_emojiPanelIconSelected) {
    norm.chat_emojiPanelIconSelected = defaultActionAccent;
  }
  if (!norm.chat_emojiPanelIconSelector) {
    norm.chat_emojiPanelIconSelector = defaultActionAccent;
  }
  if (!norm.chat_emojiPanelBackspace || (isDarkEmojiPanel && getLuminance(norm.chat_emojiPanelBackspace) < 0.35)) {
    norm.chat_emojiPanelBackspace = isDarkEmojiPanel ? '#7f93a5' : '#708291';
  }
  if (!norm.chat_emojiSearchBackground) {
    norm.chat_emojiSearchBackground = isDarkEmojiPanel ? (norm.surface || '#0e1621') : '#f0f2f5';
  }
  if (!norm.chat_emojiPanelShadowLine) {
    norm.chat_emojiPanelShadowLine = norm.divider || (isDarkEmojiPanel ? '#111921' : '#e0e0e0');
  }

  return norm;
}
