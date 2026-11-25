import JSZip from 'jszip';
import type { ThemeColors, ThemeSettings } from '../types/theme';
import {
  adjustBrightness,
  blend,
  createFullTelegramTheme,
  ensureContrast,
  getBaseRgbHex,
  getLuminance,
  getReadableTextColor,
  hexToRgb,
  normalizeThemeColors,
} from './colorUtils';

/**
 * Built-in Telegram X theme IDs (from TGX-Android/Telegram-X ThemeId.kt).
 */
export const TGX_THEME_IDS = {
  BLUE: 1,
  NIGHT_BLACK: 2,
  BLACK_WHITE: 3,
  WHITE_BLACK: 4,
  RED: 5,
  ORANGE: 6,
  GREEN: 7,
  PINK: 8,
  CYAN: 9,
  NIGHT_BLUE: 10,
  CLASSIC: 11,
} as const;

export type TgxParentThemeId = (typeof TGX_THEME_IDS)[keyof typeof TGX_THEME_IDS];

export type TgxWallpaperSource = 'cloud-link' | 'gradient' | 'solid' | 'none';

export interface TgxThemeData {
  name: string;
  parentThemeId: TgxParentThemeId;
  parentThemeName: string;
  isDark: boolean;
  isAmoled: boolean;
  wallpaper?: string;
  wallpaperSource: TgxWallpaperSource;
  properties: Record<string, number>;
  colors: Record<string, string>;
  mappedCount: number;
}

export interface ParsedTgxThemeResult {
  colors: ThemeColors;
  themeName?: string;
  cornerRadius?: number;
  tgxWallpaperLink?: string;
  rawColorCount: number;
}

/**
 * Parses a Telegram cloud wallpaper URL or slug into the exact string expected by
 * Telegram X's `wallpaper:` metadata field (`TdApi.SearchBackground(wallpaper)`).
 *
 * Accepts:
 * - https://t.me/bg/Qe9IiLLfiVIBAAAAn_BDUKSYaCs
 * - https://t.me/bg/Qe9IiLLfiVIBAAAAn_BDUKSYaCs?mode=blur
 * - tg://bg?slug=Qe9IiLLfiVIBAAAAn_BDUKSYaCs&mode=blur
 * - tg://bg?color=0e1621
 * - tg://bg?gradient=00c2ed-9200ed&rotation=45
 * - Raw slug: Qe9IiLLfiVIBAAAAn_BDUKSYaCs
 */
export function parseTgxWallpaperInput(rawInput: string | undefined): string | undefined {
  if (!rawInput) return undefined;
  const trimmed = rawInput.trim();
  if (!trimmed) return undefined;

  // Handle https://t.me/bg/<slug>[?query] or telegram.me/bg/<slug>[?query]
  const httpMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/bg\/(.+)$/i);
  if (httpMatch) {
    const rest = httpMatch[1].trim().replace(/^\/+/, '');
    return rest || undefined;
  }

  // Handle tg://bg?...
  if (/^tg:\/\/bg\?/i.test(trimmed)) {
    const queryStr = trimmed.slice(trimmed.indexOf('?') + 1);
    const params = new URLSearchParams(queryStr);
    const slug = params.get('slug') || params.get('gradient') || params.get('color');
    if (!slug) return undefined;
    const extra = new URLSearchParams();
    for (const [k, v] of params.entries()) {
      if (k !== 'slug' && k !== 'gradient' && k !== 'color' && v) {
        extra.set(k, v);
      }
    }
    const qs = extra.toString();
    return qs ? `${slug}?${qs}` : slug;
  }

  // Raw slug / fill string (reject arbitrary whitespace or non-wallpaper URLs)
  if (/\s/.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/**
 * Resolves the Telegram X `wallpaper:` header value from user settings & theme colors.
 * - Priority 1: Explicit Telegram cloud wallpaper link / slug (`t.me/bg/...`)
 * - Priority 2: Gradient fill (`rrggbb-rrggbb?rotation=angle`, snapped to nearest 45° for TDLib)
 * - Priority 3: Solid color fill (`rrggbb`) when in solid color / pattern mode
 * - Local photo without a cloud link returns `source: 'none'` because `.tgx-theme` is pure text.
 */
export function resolveTgxWallpaper(
  colors: ThemeColors,
  settings?: Partial<ThemeSettings>
): { value?: string; source: TgxWallpaperSource } {
  const cloudSlug = parseTgxWallpaperInput(settings?.tgxWallpaperLink);
  if (cloudSlug) {
    return { value: cloudSlug, source: 'cloud-link' };
  }

  const hasLocalPhoto = Boolean(
    settings && (settings.wallpaperType === 'image' || settings.wallpaperImage || settings.wallpaperBlob)
  );
  if (hasLocalPhoto) {
    return { value: undefined, source: 'none' };
  }

  if (settings?.wallpaperType === 'gradient' && settings.wallpaperGradient) {
    const c1 = getBaseRgbHex(settings.wallpaperGradient.color1 || '#1e3c72', '#1e3c72')
      .replace('#', '')
      .toLowerCase();
    const c2 = getBaseRgbHex(settings.wallpaperGradient.color2 || '#2a5298', '#2a5298')
      .replace('#', '')
      .toLowerCase();
    const rawAngle = ((settings.wallpaperGradient.angle % 360) + 360) % 360;
    const snapped45 = (Math.round(rawAngle / 45) * 45) % 360;
    const gradValue = snapped45 !== 0 ? `${c1}-${c2}?rotation=${snapped45}` : `${c1}-${c2}`;
    return { value: gradValue, source: 'gradient' };
  }

  const solidHex = getBaseRgbHex(
    colors.chat_wallpaper || colors.windowBackgroundGray || '#0e1621',
    '#0e1621'
  )
    .replace('#', '')
    .toLowerCase();
  return { value: solidHex, source: 'solid' };
}

/**
 * Escapes a string value for Telegram X's `!` metadata section (`Strings.unwrap`).
 */
function wrapTgxString(value: string): string {
  const cleaned = value
    .replace(/\r?\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .trim();
  return `"${cleaned || 'Custom Theme'}"`;
}

/**
 * Unwraps a Telegram X quoted string from the `!` metadata section.
 */
function unwrapTgxString(raw: string): string {
  let str = raw.trim();
  if (str.length >= 2 && str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1);
  }
  return str
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, ' ')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Converts an app color (#RGB, #RRGGBB, Telegram Android #AARRGGBB, or rgba(...))
 * into Telegram X's hex format: #RRGGBB (opaque) or #RRGGBBAA (RGBA with alpha LAST).
 */
export function toTgxHex(colorStr: string | undefined, fallback = '#000000'): string {
  const source = colorStr || fallback;
  const { r, g, b, a } = hexToRgb(source);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const rHex = clamp(r).toString(16).padStart(2, '0');
  const gHex = clamp(g).toString(16).padStart(2, '0');
  const bHex = clamp(b).toString(16).padStart(2, '0');
  const aByte = clamp(a * 255);

  if (aByte < 255) {
    const aHex = aByte.toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
  }
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * Returns a Telegram X #RRGGBBAA color using the RGB channels of `colorStr`
 * and an explicit opacity `alpha01` (0..1).
 */
export function withTgxAlpha(colorStr: string | undefined, alpha01: number, fallback = '#000000'): string {
  const { r, g, b } = hexToRgb(colorStr || fallback);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const rHex = clamp(r).toString(16).padStart(2, '0');
  const gHex = clamp(g).toString(16).padStart(2, '0');
  const bHex = clamp(b).toString(16).padStart(2, '0');
  const aByte = clamp(alpha01 * 255);

  if (aByte >= 255) {
    return `#${rHex}${gHex}${bHex}`.toUpperCase();
  }
  const aHex = aByte.toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
}

/**
 * Returns an opaque #RRGGBB Telegram X color (stripping any alpha channel).
 */
function toOpaqueTgxHex(colorStr: string | undefined, fallback = '#000000'): string {
  return toTgxHex(getBaseRgbHex(colorStr || fallback, fallback), fallback);
}

/**
 * Converts a Telegram X hex color (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)
 * back to TeleTheme Studio / Telegram Android hex (#RRGGBB or #AARRGGBB).
 */
export function tgxHexToAtthemeHex(tgxHex: string): string | null {
  let clean = tgxHex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(clean)) return null;

  if (clean.length === 3) {
    clean = clean
      .split('')
      .map(c => c + c)
      .join('');
    return `#${clean.toLowerCase()}`;
  }

  if (clean.length === 4) {
    const r = clean[0] + clean[0];
    const g = clean[1] + clean[1];
    const b = clean[2] + clean[2];
    const a = clean[3] + clean[3];
    if (a.toLowerCase() === 'ff') {
      return `#${r}${g}${b}`.toLowerCase();
    }
    return `#${a}${r}${g}${b}`.toLowerCase();
  }

  if (clean.length === 6) {
    return `#${clean.toLowerCase()}`;
  }

  if (clean.length === 8) {
    const rgb = clean.slice(0, 6);
    const a = clean.slice(6, 8);
    if (a.toLowerCase() === 'ff') {
      return `#${rgb.toLowerCase()}`;
    }
    return `#${a}${rgb}`.toLowerCase();
  }

  return null;
}

function getParentThemeName(id: TgxParentThemeId): string {
  switch (id) {
    case TGX_THEME_IDS.NIGHT_BLACK:
      return 'Night Black';
    case TGX_THEME_IDS.NIGHT_BLUE:
      return 'Night Blue';
    case TGX_THEME_IDS.CLASSIC:
      return 'Classic';
    case TGX_THEME_IDS.BLUE:
      return 'Blue';
    default:
      return 'Night Blue';
  }
}

/**
 * Converts a Telegram Android (.attheme) ThemeColors palette + ThemeSettings
 * into a complete, 100% compliant Telegram X (.tgx-theme) theme structure.
 *
 * All property IDs, bounds, and color IDs match official TGX-Android/Telegram-X
 * `colors-and-properties.xml`, `ThemeManager.java`, and `TdlibUi.java`.
 */
export function convertAtthemeToTgx(
  rawColors: ThemeColors,
  settings?: Partial<ThemeSettings>
): TgxThemeData {
  const c = normalizeThemeColors(rawColors);

  // 1. Resolve core semantic surfaces from .attheme tokens
  const fillingBase = getBaseRgbHex(
    c.windowBackgroundWhite || c.chat_messagePanelBackground || '#17212b',
    '#17212b'
  );
  const bgLum = getLuminance(fillingBase);
  const isDark = bgLum < 0.45;

  const backgroundBase = getBaseRgbHex(
    c.windowBackgroundGray ||
      c.chat_wallpaper ||
      adjustBrightness(fillingBase, isDark ? -6 : -4),
    isDark ? '#0e1621' : '#f2f2f2'
  );
  const isAmoled = isDark && bgLum < 0.005 && getLuminance(backgroundBase) < 0.005;

  const headerBgBase = getBaseRgbHex(c.actionBarDefault || fillingBase, fillingBase);
  const isLightHeader = getLuminance(headerBgBase) > 0.55;

  const accentBase = getBaseRgbHex(
    c.chats_unreadCounter ||
      c.chat_messagePanelSend ||
      c.chats_actionBackground ||
      c.windowBackgroundWhiteBlueText ||
      c.chat_outSentCheck ||
      '#4ea4f5',
    '#4ea4f5'
  );

  const textBase = getBaseRgbHex(
    c.windowBackgroundWhiteBlackText ||
      c.chats_name ||
      getReadableTextColor(fillingBase, '#ffffff', '#1c242d'),
    isDark ? '#ffffff' : '#1c242d'
  );
  const textLightBase = getBaseRgbHex(
    c.windowBackgroundWhiteGrayText ||
      c.chats_message ||
      blend(textBase, fillingBase, 0.42),
    isDark ? '#7f93a5' : '#708291'
  );
  const onAccentBase = getReadableTextColor(accentBase, '#ffffff', '#111827');

  const separatorBase = getBaseRgbHex(
    c.divider || adjustBrightness(fillingBase, isDark ? 8 : -10),
    isDark ? '#10171e' : '#dee3ea'
  );

  const headerTextBase = getBaseRgbHex(
    c.actionBarDefaultTitle || getReadableTextColor(headerBgBase, '#ffffff', '#1c242d'),
    isLightHeader ? '#1c242d' : '#ffffff'
  );
  const headerIconBase = getBaseRgbHex(
    c.actionBarDefaultIcon || headerTextBase,
    headerTextBase
  );

  const headerLightBgBase = getBaseRgbHex(
    c.actionBarActionModeDefault || c.chat_topPanelBackground || headerBgBase,
    headerBgBase
  );
  const headerLightTextBase = getBaseRgbHex(
    ensureContrast(headerTextBase, headerLightBgBase, '#ffffff', '#1c242d', 3.5),
    headerTextBase
  );
  const headerLightIconBase = getBaseRgbHex(
    c.actionBarActionModeDefaultIcon || headerIconBase,
    headerLightTextBase
  );

  // Bubbles (preserve opacity from .attheme via toTgxHex!)
  const inBubbleRaw = c.chat_inBubble || fillingBase;
  const inBubbleBase = getBaseRgbHex(inBubbleRaw, fillingBase);
  const inTextBase = getBaseRgbHex(
    c.chat_messageTextIn || getReadableTextColor(inBubbleBase, '#ffffff', '#1c242d'),
    textBase
  );
  const inTimeBase = getBaseRgbHex(
    c.chat_inTimeText || blend(inTextBase, inBubbleBase, 0.42),
    textLightBase
  );
  const inLinkBase = getBaseRgbHex(
    c.chat_messageLinkIn || c.chat_inPreviewInstantText || accentBase,
    accentBase
  );

  const outBubbleRaw = c.chat_outBubble || (isDark ? '#2b5278' : '#e4f4fe');
  const outBubbleBase = getBaseRgbHex(outBubbleRaw, isDark ? '#2b5278' : '#e4f4fe');
  const outTextBase = getBaseRgbHex(
    c.chat_messageTextOut || getReadableTextColor(outBubbleBase, '#ffffff', '#0f172a'),
    isDark ? '#ffffff' : '#0f172a'
  );
  const outTimeBase = getBaseRgbHex(
    c.chat_outTimeText || blend(outTextBase, outBubbleBase, 0.35),
    textLightBase
  );
  const outLinkBase = getBaseRgbHex(
    c.chat_messageLinkOut ||
      c.chat_outPreviewInstantText ||
      ensureContrast(accentBase, outBubbleBase, '#ffffff', '#0f172a', 3.0),
    outTextBase
  );

  const outCheckBase = getBaseRgbHex(
    c.chat_outSentCheck || accentBase,
    accentBase
  );
  const outCheckReadBase = getBaseRgbHex(
    c.chat_outSentCheckRead || outCheckBase,
    outCheckBase
  );

  const chatWallpaperBase = getBaseRgbHex(c.chat_wallpaper || backgroundBase, backgroundBase);
  const chatKeyboardBase = getBaseRgbHex(
    c.chat_emojiPanelBackground || backgroundBase,
    backgroundBase
  );

  const badgeBgBase = getBaseRgbHex(c.chats_unreadCounter || accentBase, accentBase);
  const badgeTextBase = getBaseRgbHex(
    ensureContrast(
      c.chats_unreadCounterText || onAccentBase,
      badgeBgBase,
      '#ffffff',
      headerBgBase,
      3.0
    ),
    onAccentBase
  );
  const badgeMutedBgBase = getBaseRgbHex(
    c.chats_unreadCounterMuted || blend(textLightBase, fillingBase, 0.2),
    textLightBase
  );
  const badgeMutedTextBase = getBaseRgbHex(
    ensureContrast(isDark ? headerBgBase : '#ffffff', badgeMutedBgBase, '#ffffff', '#000000', 3.0),
    isDark ? '#000000' : '#ffffff'
  );

  const fabBgBase = getBaseRgbHex(
    c.chats_actionBackground || c.chats_actionFAB || accentBase,
    accentBase
  );
  const fabIconBase = getBaseRgbHex(
    ensureContrast(c.chats_actionIcon || c.chats_actionFABIcon || onAccentBase, fabBgBase),
    onAccentBase
  );

  const togglerActiveBase = getBaseRgbHex(
    c.switchTrackChecked || c.switch2TrackChecked || accentBase,
    accentBase
  );
  const togglerActiveBgBase = blend(togglerActiveBase, fillingBase, 0.45);

  const tooltipBgBase = getBaseRgbHex(
    c.chat_stickersHintPanel || (isDark ? adjustBrightness(fillingBase, 8) : '#1f2937'),
    isDark ? '#202b36' : '#1f2937'
  );
  const tooltipTextBase = getReadableTextColor(tooltipBgBase, '#ffffff', '#111827');

  const inReactionBgBase = getBaseRgbHex(
    c.chat_inReactionButtonBackground || accentBase,
    accentBase
  );
  const inReactionTextBase = getBaseRgbHex(
    ensureContrast(c.chat_inReactionButtonText || onAccentBase, inReactionBgBase),
    onAccentBase
  );
  const outReactionBgBase = getBaseRgbHex(
    c.chat_outReactionButtonBackground || adjustBrightness(outBubbleBase, isDark ? 12 : -10),
    accentBase
  );
  const outReactionTextBase = getBaseRgbHex(
    ensureContrast(c.chat_outReactionButtonText || outTextBase, outReactionBgBase),
    outTextBase
  );

  const outFileBgBase = getBaseRgbHex(
    c.chat_outLoader || c.chat_outFileBackground || accentBase,
    accentBase
  );
  const outFileContentBase = getBaseRgbHex(
    ensureContrast(
      c.chat_outMediaIcon || c.chat_outFileProgress || getReadableTextColor(outFileBgBase),
      outFileBgBase
    ),
    '#ffffff'
  );
  const inFileBgBase = getBaseRgbHex(
    c.chat_inFileBackground || c.chat_inLoader || accentBase,
    accentBase
  );
  const inFileContentBase = getBaseRgbHex(
    ensureContrast(
      c.chat_inFileProgress || c.chat_inMediaIcon || getReadableTextColor(inFileBgBase),
      inFileBgBase
    ),
    '#ffffff'
  );

  const outReplyLineBase = getBaseRgbHex(
    c.chat_outReplyLine || outLinkBase,
    outLinkBase
  );
  const inReplyLineBase = getBaseRgbHex(
    c.chat_inReplyLine || accentBase,
    accentBase
  );

  // 2. Choose Telegram X parent theme & properties (strictly valid per ThemeManager.isValidProperty)
  const parentThemeId: TgxParentThemeId = isAmoled
    ? TGX_THEME_IDS.NIGHT_BLACK
    : isDark
    ? TGX_THEME_IDS.NIGHT_BLUE
    : TGX_THEME_IDS.CLASSIC;

  const cornerRadius = Math.max(0, Math.min(24, Math.round(settings?.cornerRadius ?? 16)));
  const bubbleCornerMerged = Math.max(0, Math.min(6, Math.round(cornerRadius / 3)));
  const bubbleCornerLegacy = Math.max(0, Math.min(6, cornerRadius));
  const dateCorner = Math.max(0, Math.min(18, Math.round(cornerRadius * 0.75)));
  const imageCorner = Math.max(0, Math.min(16, Math.round(cornerRadius * 0.35)));

  const resolvedWallpaper = resolveTgxWallpaper(c, settings);
  const hasCustomWallpaper = Boolean(
    resolvedWallpaper.value ||
      (settings &&
        (settings.wallpaperImage ||
          settings.wallpaperBlob ||
          settings.wallpaperType === 'image' ||
          settings.wallpaperType === 'gradient' ||
          settings.wallpaperType === 'pattern'))
  );

  const properties: Record<string, number> = {
    parentTheme: parentThemeId,
    dark: isDark ? 1 : 0,
    lightStatusBar: isLightHeader ? 1 : 0,
    wallpaperUsageId: hasCustomWallpaper ? 2 : isDark ? 1 : 0,
    bubbleCorner: cornerRadius,
    bubbleCornerMerged,
    bubbleCornerLegacy,
    bubbleDateCorner: dateCorner,
    dateCorner,
    imageCorner,
    shadowDepth: isDark ? 1 : 0.5,
    replaceShadowsWithSeparators: isAmoled ? 1 : 0,
    subtitleAlpha: 0.8,
  };

  // 3. Map every Telegram X ColorId (guaranteed unique keys, every key verified in colors-and-properties.xml)
  const tgxColors: Record<string, string> = {
    // MAIN SURFACES & SEPARATORS
    filling: toOpaqueTgxHex(fillingBase),
    background: toOpaqueTgxHex(backgroundBase),
    separator: toOpaqueTgxHex(separatorBase),
    fillingPressed: toOpaqueTgxHex(adjustBrightness(fillingBase, isDark ? 8 : -6)),
    placeholder: isDark ? withTgxAlpha('#FFFFFF', 0.05) : withTgxAlpha('#000000', 0.05),
    previewBackground: isDark ? withTgxAlpha('#000000', 0.45) : withTgxAlpha('#FFFFFF', 0.75),
    overlayFilling: toOpaqueTgxHex(c.dialogBackground || fillingBase),
    fillingPositive: toOpaqueTgxHex(accentBase),
    fillingPositiveContent: toOpaqueTgxHex(onAccentBase),
    fillingActive: withTgxAlpha(accentBase, 0.16),
    fillingActiveContent: toOpaqueTgxHex(textBase),
    fillingNegative: toOpaqueTgxHex(c.windowBackgroundWhiteRedText || '#EC5454'),

    // SNACKBAR & TOOLTIPS
    snackbarUpdate: toOpaqueTgxHex(accentBase),
    snackbarUpdateText: toOpaqueTgxHex(onAccentBase),
    snackbarUpdateAction: toOpaqueTgxHex(onAccentBase),
    tooltip: toOpaqueTgxHex(tooltipBgBase),
    tooltip_text: toOpaqueTgxHex(tooltipTextBase),
    tooltip_textLink: toOpaqueTgxHex(accentBase),
    tooltip_textLinkPressHighlight: withTgxAlpha(accentBase, 0.27),
    tooltip_outline: withTgxAlpha(separatorBase, 0.45),

    // TEXT & BACKGROUND TEXT
    text: toOpaqueTgxHex(textBase),
    textLight: toOpaqueTgxHex(textLightBase),
    textPlaceholder: toOpaqueTgxHex(c.chat_messagePanelHint || textLightBase),
    textLink: toOpaqueTgxHex(c.windowBackgroundWhiteLinkText || c.chat_messageLinkIn || accentBase),
    textLinkPressHighlight: withTgxAlpha(
      c.windowBackgroundWhiteLinkText || c.chat_messageLinkIn || accentBase,
      0.27
    ),
    textNeutral: toOpaqueTgxHex(c.windowBackgroundWhiteBlueText || accentBase),
    textSearchQueryHighlight: toOpaqueTgxHex(accentBase),
    textSelectionHighlight: withTgxAlpha(accentBase, 0.28),
    textSecure: isDark ? '#78E27E' : '#18A81F',
    textNegative: toOpaqueTgxHex(c.windowBackgroundWhiteRedText || '#E45356'),
    background_text: toOpaqueTgxHex(c.graySectionText || c.key_graySectionText || textLightBase),
    background_textLight: toOpaqueTgxHex(textLightBase),
    background_icon: toOpaqueTgxHex(textLightBase),

    // ICONS
    icon: toOpaqueTgxHex(c.chat_messagePanelIcons || c.windowBackgroundWhiteGrayIcon || textLightBase),
    iconActive: toOpaqueTgxHex(c.windowBackgroundWhiteBlueIcon || accentBase),
    iconLight: toOpaqueTgxHex(blend(textLightBase, fillingBase, 0.3)),
    iconPositive: isDark ? '#66BB6A' : '#4FB358',
    iconNegative: toOpaqueTgxHex(c.windowBackgroundWhiteRedText || '#E23D37'),

    // NAVIGATION & HEADER
    headerBackground: toOpaqueTgxHex(headerBgBase),
    headerText: toOpaqueTgxHex(headerTextBase),
    headerIcon: toOpaqueTgxHex(headerIconBase),
    headerLightBackground: toOpaqueTgxHex(headerLightBgBase),
    headerLightText: toOpaqueTgxHex(headerLightTextBase),
    headerLightIcon: toOpaqueTgxHex(headerLightIconBase),
    headerTabActive: toOpaqueTgxHex(c.actionBarTabLine || accentBase),
    headerTabActiveText: toOpaqueTgxHex(c.actionBarTabActiveText || headerTextBase),
    headerTabInactiveText: toTgxHex(
      c.actionBarTabUnactiveText || withTgxAlpha(headerTextBase, 0.65)
    ),
    headerBadge: toOpaqueTgxHex(c.chats_tabUnreadActiveBackground || accentBase),
    headerBadgeMuted: toOpaqueTgxHex(c.chats_tabUnreadUnactiveBackground || textLightBase),
    headerBadgeFailed: '#D32F2F',
    headerButton: toOpaqueTgxHex(accentBase),
    headerButtonIcon: toOpaqueTgxHex(onAccentBase),
    headerPlaceholder: isLightHeader
      ? withTgxAlpha('#000000', 0.12)
      : withTgxAlpha('#FFFFFF', 0.08),
    drawer: isDark ? withTgxAlpha('#000000', 0.25) : '#00000000',
    drawerText: toOpaqueTgxHex(headerTextBase),
    passcode: toOpaqueTgxHex(headerBgBase),
    passcodeIcon: toOpaqueTgxHex(headerIconBase),
    passcodeText: toOpaqueTgxHex(headerTextBase),
    notification: toOpaqueTgxHex(headerBgBase),
    notificationLink: toOpaqueTgxHex(accentBase),
    notificationPlayer: toOpaqueTgxHex(c.inappPlayerBackground || headerBgBase),
    notificationSecure: isDark ? '#78E27E' : '#18A81F',
    statusBar: isLightHeader ? withTgxAlpha('#000000', 0.14) : withTgxAlpha('#000000', 0.25),
    statusBarContent: isLightHeader ? '#000000' : '#FFFFFF',
    profileSectionActive: toOpaqueTgxHex(c.profile_tabSelectedLine || accentBase),
    profileSectionActiveContent: toOpaqueTgxHex(c.profile_tabSelectedText || accentBase),

    // CONTROLS, CHECKBOXES, SWITCHES, FABS
    progress: toOpaqueTgxHex(accentBase),
    controlActive: toOpaqueTgxHex(c.checkboxSquareBackground || c.dialogRoundCheckBox || accentBase),
    controlInactive: toOpaqueTgxHex(blend(textLightBase, fillingBase, 0.35)),
    controlContent: toOpaqueTgxHex(c.dialogRoundCheckBoxCheck || onAccentBase),
    checkActive: toOpaqueTgxHex(c.checkboxSquareBackground || accentBase),
    checkContent: toOpaqueTgxHex(c.dialogRoundCheckBoxCheck || onAccentBase),
    sliderActive: toOpaqueTgxHex(accentBase),
    sliderInactive: toOpaqueTgxHex(blend(textLightBase, fillingBase, 0.45)),
    togglerActive: toOpaqueTgxHex(togglerActiveBase),
    togglerActiveBackground: toOpaqueTgxHex(togglerActiveBgBase),
    togglerInactive: toOpaqueTgxHex(isDark ? blend(textLightBase, fillingBase, 0.2) : '#E8E8E8'),
    togglerInactiveBackground: toOpaqueTgxHex(
      isDark ? blend(textLightBase, fillingBase, 0.55) : '#C7C7C7'
    ),
    togglerPositive: toOpaqueTgxHex(togglerActiveBase),
    togglerPositiveBackground: toOpaqueTgxHex(togglerActiveBgBase),
    togglerPositiveContent: toOpaqueTgxHex(onAccentBase),
    inputActive: toOpaqueTgxHex(accentBase),
    inputInactive: toOpaqueTgxHex(separatorBase),
    inlineOutline: toOpaqueTgxHex(accentBase),
    inlineText: toOpaqueTgxHex(accentBase),
    inlineIcon: toOpaqueTgxHex(accentBase),
    inlineContentActive: toOpaqueTgxHex(onAccentBase),
    circleButtonRegular: toOpaqueTgxHex(fabBgBase),
    circleButtonRegularIcon: toOpaqueTgxHex(fabIconBase),
    circleButtonActive: toOpaqueTgxHex(fabBgBase),
    circleButtonActiveIcon: toOpaqueTgxHex(fabIconBase),
    circleButtonTheme: toOpaqueTgxHex(accentBase),
    circleButtonThemeIcon: toOpaqueTgxHex(onAccentBase),
    circleButtonChat: toOpaqueTgxHex(
      c.chat_goDownButton || c.chat_goToEndButtonBackground || fillingBase
    ),
    circleButtonChatIcon: toOpaqueTgxHex(
      c.chat_goDownButtonIcon || c.chat_goToEndButtonIcon || textLightBase
    ),
    circleButtonOverlay: toOpaqueTgxHex(fillingBase),
    circleButtonOverlayIcon: toOpaqueTgxHex(textLightBase),
    online: toOpaqueTgxHex(c.chats_onlineCircle || '#54CA63'),
    promo: toOpaqueTgxHex(accentBase),
    promoContent: toOpaqueTgxHex(onAccentBase),

    // AUDIO & MUSIC PLAYER
    seekEmpty: toOpaqueTgxHex(
      c.player_progressBackground
        ? getBaseRgbHex(c.player_progressBackground, adjustBrightness(fillingBase, isDark ? -4 : -8))
        : adjustBrightness(fillingBase, isDark ? -4 : -8)
    ),
    seekReady: toOpaqueTgxHex(blend(accentBase, fillingBase, 0.55)),
    seekDone: toOpaqueTgxHex(c.player_progress || accentBase),
    playerButton: toOpaqueTgxHex(c.player_button || textBase),
    playerButtonActive: toOpaqueTgxHex(
      c.player_buttonActive || c.inappPlayerPlayPause || accentBase
    ),
    playerCoverPlaceholder: toOpaqueTgxHex(c.player_placeholderBackground || backgroundBase),
    playerCoverIcon: toOpaqueTgxHex(c.player_placeholder || textLightBase),

    // CHATS LIST
    ticks: toOpaqueTgxHex(c.chats_sentCheck || outCheckBase),
    ticksRead: toOpaqueTgxHex(c.chats_sentReadCheck || outCheckReadBase),
    chatListMute: toOpaqueTgxHex(c.chats_muteIcon || textLightBase),
    chatListIcon: toOpaqueTgxHex(c.chats_pinnedIcon || textLightBase),
    chatListAction: toOpaqueTgxHex(
      c.chats_actionMessage || c.chats_attachMessage || c.chats_nameMessage || accentBase
    ),
    chatListVerify: toOpaqueTgxHex(accentBase),
    badge: toOpaqueTgxHex(badgeBgBase),
    badgeText: toOpaqueTgxHex(badgeTextBase),
    badgeMuted: toOpaqueTgxHex(badgeMutedBgBase),
    badgeMutedText: toOpaqueTgxHex(badgeMutedTextBase),
    badgeFailed: '#D32F2F',
    badgeFailedText: '#FFFFFF',

    // AVATARS & PEER NAMES
    avatarArchive: toOpaqueTgxHex(c.avatar_backgroundArchived || accentBase),
    avatarArchivePinned: toOpaqueTgxHex(
      c.avatar_backgroundArchivedHidden ||
        adjustBrightness(c.avatar_backgroundArchived || accentBase, -12)
    ),
    avatarSavedMessages: toOpaqueTgxHex(c.avatar_backgroundSaved || accentBase),
    avatarSavedMessages_big: toOpaqueTgxHex(
      c.avatar_background2Saved || c.avatar_backgroundSaved || accentBase
    ),
    avatarReplies: toOpaqueTgxHex(accentBase),
    avatarReplies_big: toOpaqueTgxHex(accentBase),
    nameRed: toOpaqueTgxHex(c.avatar_nameInMessageRed || '#EF615C'),
    lineRed: toOpaqueTgxHex(c.avatar_nameInMessageRed || '#EF615C'),
    nameOrange: toOpaqueTgxHex(c.avatar_nameInMessageOrange || '#F29154'),
    lineOrange: toOpaqueTgxHex(c.avatar_nameInMessageOrange || '#F29154'),
    nameGreen: toOpaqueTgxHex(c.avatar_nameInMessageGreen || '#7ABB58'),
    lineGreen: toOpaqueTgxHex(c.avatar_nameInMessageGreen || '#7ABB58'),
    nameCyan: toOpaqueTgxHex(c.avatar_nameInMessageCyan || '#64BACE'),
    lineCyan: toOpaqueTgxHex(c.avatar_nameInMessageCyan || '#64BACE'),
    nameBlue: toOpaqueTgxHex(c.avatar_nameInMessageBlue || '#5E9CD4'),
    lineBlue: toOpaqueTgxHex(c.avatar_nameInMessageBlue || '#5E9CD4'),
    nameViolet: toOpaqueTgxHex(c.avatar_nameInMessageViolet || '#9388E1'),
    lineViolet: toOpaqueTgxHex(c.avatar_nameInMessageViolet || '#9388E1'),
    namePink: toOpaqueTgxHex(c.avatar_nameInMessagePink || '#D979A3'),
    linePink: toOpaqueTgxHex(c.avatar_nameInMessagePink || '#D979A3'),

    // CHAT INPUT & PLAIN MODE
    chatSendButton: toOpaqueTgxHex(c.chat_messagePanelSend || accentBase),
    chatKeyboard: toOpaqueTgxHex(chatKeyboardBase),
    chatKeyboardButton: toOpaqueTgxHex(adjustBrightness(chatKeyboardBase, isDark ? 8 : -6)),
    chatBackground: toOpaqueTgxHex(chatWallpaperBase),
    chatSeparator: toOpaqueTgxHex(separatorBase),
    bubble_chatSeparator: toOpaqueTgxHex(separatorBase),
    shareSeparator: toOpaqueTgxHex(separatorBase),
    unread: toOpaqueTgxHex(adjustBrightness(fillingBase, isDark ? 4 : -4)),
    unreadText: toOpaqueTgxHex(isDark ? textBase : accentBase),
    messageVerticalLine: toOpaqueTgxHex(inReplyLineBase),
    messageCorrectFilling: toOpaqueTgxHex(accentBase),
    messageCorrectChosenFilling: toOpaqueTgxHex(accentBase),
    messageSelection: withTgxAlpha(accentBase, 0.14),
    messageSwipeBackground: toOpaqueTgxHex(outBubbleBase),
    messageSwipeContent: toOpaqueTgxHex(getReadableTextColor(outBubbleBase, '#ffffff', '#0f172a')),
    messageAuthor: toOpaqueTgxHex(
      c.chat_inReplyNameText || c.chat_inForwardedNameText || accentBase
    ),

    // BUBBLE MODE OVERLAYS & PILLS
    bubble_date: withTgxAlpha(chatWallpaperBase, 0.55),
    bubble_date_noWallpaper: withTgxAlpha(chatWallpaperBase, 0.55),
    bubble_dateText: toOpaqueTgxHex(getReadableTextColor(chatWallpaperBase, '#ffffff', '#1c242d')),
    bubble_dateText_noWallpaper: toOpaqueTgxHex(
      getReadableTextColor(chatWallpaperBase, '#ffffff', '#1c242d')
    ),
    bubble_unread: withTgxAlpha(fillingBase, 0.88),
    bubble_unread_noWallpaper: toOpaqueTgxHex(fillingBase),
    bubble_unreadText: toOpaqueTgxHex(textBase),
    bubble_unreadText_noWallpaper: toOpaqueTgxHex(textBase),
    bubble_mediaReply: withTgxAlpha(fillingBase, 0.85),
    bubble_mediaReply_noWallpaper: toOpaqueTgxHex(fillingBase),
    bubble_mediaReplyText: toOpaqueTgxHex(textBase),
    bubble_mediaReplyText_noWallpaper: toOpaqueTgxHex(textBase),
    bubble_overlay: withTgxAlpha(chatWallpaperBase, 0.55),
    bubble_overlay_noWallpaper: withTgxAlpha(chatWallpaperBase, 0.55),
    bubble_overlayText: '#FFFFFF',
    bubble_overlayText_noWallpaper: '#FFFFFF',
    bubble_button: withTgxAlpha('#000000', 0.25),
    bubble_button_noWallpaper: withTgxAlpha('#000000', 0.22),
    bubble_buttonRipple: withTgxAlpha('#000000', 0.35),
    bubble_buttonRipple_noWallpaper: withTgxAlpha('#000000', 0.3),
    bubble_messageSelection: withTgxAlpha(accentBase, 0.22),
    bubble_messageSelectionNoWallpaper: withTgxAlpha(accentBase, 0.22),

    // INCOMING BUBBLES
    bubbleIn_background: toTgxHex(inBubbleRaw, fillingBase),
    bubbleIn_text: toOpaqueTgxHex(inTextBase),
    bubbleIn_time: toOpaqueTgxHex(inTimeBase),
    bubbleIn_textLink: toOpaqueTgxHex(inLinkBase),
    bubbleIn_textLinkPressHighlight: withTgxAlpha(inLinkBase, 0.27),
    bubbleIn_progress: toOpaqueTgxHex(c.chat_inAudioProgress || c.chat_inLoader || accentBase),
    bubbleIn_outline: toOpaqueTgxHex(separatorBase),
    bubbleIn_separator: toOpaqueTgxHex(separatorBase),
    bubbleIn_pressed: c.chat_inBubbleSelected
      ? withTgxAlpha(c.chat_inBubbleSelected, 0.35)
      : withTgxAlpha('#000000', 0.14),
    bubbleIn_fillingPositive: toOpaqueTgxHex(inReactionBgBase),
    bubbleIn_fillingPositive_overlay: toOpaqueTgxHex(inReactionBgBase),
    bubbleIn_fillingPositiveContent: toOpaqueTgxHex(inReactionTextBase),
    bubbleIn_fillingPositiveContent_overlay: toOpaqueTgxHex(inReactionTextBase),
    bubbleIn_fillingActive: withTgxAlpha(inTimeBase, 0.16),
    bubbleIn_fillingActiveContent: toOpaqueTgxHex(inTextBase),
    bubbleIn_blockQuoteText: toOpaqueTgxHex(c.chat_inReplyMessageText || inTimeBase),
    bubbleIn_blockQuoteLine: toOpaqueTgxHex(inReplyLineBase),
    bubbleIn_codeBlockBackground: c.chat_inQuote
      ? toTgxHex(c.chat_inQuote)
      : withTgxAlpha('#000000', isDark ? 0.32 : 0.06),

    // OUTGOING BUBBLES
    bubbleOut_background: toTgxHex(outBubbleRaw, isDark ? '#2b5278' : '#e4f4fe'),
    bubbleOut_text: toOpaqueTgxHex(outTextBase),
    bubbleOut_time: toOpaqueTgxHex(outTimeBase),
    bubbleOut_textLink: toOpaqueTgxHex(outLinkBase),
    bubbleOut_textLinkPressHighlight: withTgxAlpha(outLinkBase, 0.25),
    bubbleOut_ticks: toOpaqueTgxHex(outCheckBase),
    bubbleOut_ticksRead: toOpaqueTgxHex(outCheckReadBase),
    bubbleOut_chatVerticalLine: toOpaqueTgxHex(outReplyLineBase),
    bubbleOut_messageAuthor: toOpaqueTgxHex(
      c.chat_outReplyNameText || c.chat_outForwardedNameText || outTextBase
    ),
    bubbleOut_progress: toOpaqueTgxHex(c.chat_outAudioProgress || outTimeBase),
    bubbleOut_separator: toOpaqueTgxHex(blend(outTextBase, outBubbleBase, 0.45)),
    bubbleOut_outline: toOpaqueTgxHex(separatorBase),
    bubbleOut_pressed: c.chat_outBubbleSelected
      ? withTgxAlpha(c.chat_outBubbleSelected, 0.35)
      : withTgxAlpha('#000000', 0.16),
    bubbleOut_waveformActive: toOpaqueTgxHex(
      c.chat_outVoiceSeekbarFill || c.chat_outAudioSeekbarFill || outTextBase
    ),
    bubbleOut_waveformInactive: toOpaqueTgxHex(
      c.chat_outVoiceSeekbar || c.chat_outAudioSeekbar || outTimeBase
    ),
    bubbleOut_file: toOpaqueTgxHex(outFileBgBase),
    bubbleOut_fileContent: toOpaqueTgxHex(outFileContentBase),
    bubbleOut_inlineText: toOpaqueTgxHex(outLinkBase),
    bubbleOut_inlineOutline: toOpaqueTgxHex(outReplyLineBase),
    bubbleOut_inlineIcon: toOpaqueTgxHex(outLinkBase),
    bubbleOut_chatCorrectFilling: toOpaqueTgxHex(outReplyLineBase),
    bubbleOut_chatCorrectChosenFilling: toOpaqueTgxHex(outReplyLineBase),
    bubbleOut_fillingPositive: toOpaqueTgxHex(outReactionBgBase),
    bubbleOut_fillingPositive_overlay: toOpaqueTgxHex(outReactionBgBase),
    bubbleOut_fillingPositiveContent: toOpaqueTgxHex(outReactionTextBase),
    bubbleOut_fillingPositiveContent_overlay: toOpaqueTgxHex(outReactionTextBase),
    bubbleOut_fillingActive: withTgxAlpha(outTimeBase, 0.18),
    bubbleOut_fillingActiveContent: toOpaqueTgxHex(outTextBase),
    bubbleOut_blockQuoteText: toOpaqueTgxHex(c.chat_outReplyMessageText || outTimeBase),
    bubbleOut_blockQuoteLine: toOpaqueTgxHex(outReplyLineBase),
    bubbleOut_codeBlockBackground: c.chat_outQuote
      ? toTgxHex(c.chat_outQuote)
      : withTgxAlpha('#000000', isDark ? 0.38 : 0.08),
    bubbleOut_codeBlockLine: toOpaqueTgxHex(outTimeBase),
    bubbleOut_codeBlockBar: toOpaqueTgxHex(outReplyLineBase),

    // MEDIA, FILES & WAVEFORMS
    file: toOpaqueTgxHex(inFileBgBase),
    fileContent: toOpaqueTgxHex(inFileContentBase),
    fileAttach: toOpaqueTgxHex(backgroundBase),
    waveformActive: toOpaqueTgxHex(
      c.chat_inVoiceSeekbarFill || c.chat_inAudioSeekbarFill || accentBase
    ),
    waveformInactive: toOpaqueTgxHex(
      c.chat_inVoiceSeekbar || c.chat_inAudioSeekbar || blend(textLightBase, fillingBase, 0.4)
    ),

    // CODE BLOCKS & QUOTES (PLAIN MODE)
    blockQuoteText: toOpaqueTgxHex(c.chat_inReplyMessageText || textLightBase),
    blockQuoteLine: toOpaqueTgxHex(inReplyLineBase),
    codeBlockBackground: withTgxAlpha('#000000', isDark ? 0.35 : 0.06),
    codeBlockHeader: withTgxAlpha('#000000', isDark ? 0.45 : 0.04),
    bubbleIn_codeBlockHeader: withTgxAlpha('#000000', isDark ? 0.45 : 0.04),
    bubbleOut_codeBlockHeader: withTgxAlpha('#000000', isDark ? 0.45 : 0.06),

    // INSTANT VIEW
    iv_pageTitle: toOpaqueTgxHex(textBase),
    iv_pageSubtitle: toOpaqueTgxHex(textLightBase),
    iv_pageAuthor: toOpaqueTgxHex(textLightBase),
    iv_pageFooter: toOpaqueTgxHex(textLightBase),
    iv_text: toOpaqueTgxHex(textBase),
    iv_header: toOpaqueTgxHex(textBase),
    iv_textLink: toOpaqueTgxHex(inLinkBase),
    iv_textMarkedLink: toOpaqueTgxHex(inLinkBase),
    iv_textLinkPressHighlight: withTgxAlpha(inLinkBase, 0.27),
    iv_separator: toOpaqueTgxHex(separatorBase),
    iv_icon: toOpaqueTgxHex(textLightBase),
    iv_caption: toOpaqueTgxHex(textLightBase),
    iv_blockQuoteLine: toOpaqueTgxHex(accentBase),
    iv_chatLinkBackground: toOpaqueTgxHex(backgroundBase),
    iv_preBlockBackground: toOpaqueTgxHex(backgroundBase),
    iv_textCodeBackground: toOpaqueTgxHex(backgroundBase),
    iv_textCodeBackgroundPressed: toOpaqueTgxHex(adjustBrightness(backgroundBase, isDark ? 6 : -6)),
  };

  // In dark mode, Telegram X styles attach sheet icon backgrounds to match `filling` (matching Night Blue / Night Black)
  if (isDark) {
    const darkAttach = toOpaqueTgxHex(fillingBase);
    tgxColors.attachContact = darkAttach;
    tgxColors.attachFile = darkAttach;
    tgxColors.attachInlineBot = darkAttach;
    tgxColors.attachLocation = darkAttach;
    tgxColors.attachPhoto = darkAttach;
  }

  return {
    name: (settings?.themeName || 'Custom Theme').trim() || 'Custom Theme',
    parentThemeId,
    parentThemeName: getParentThemeName(parentThemeId),
    isDark,
    isAmoled,
    wallpaper: resolvedWallpaper.value,
    wallpaperSource: resolvedWallpaper.source,
    properties,
    colors: tgxColors,
    mappedCount: Object.keys(tgxColors).length,
  };
}

/**
 * Serializes ThemeColors + ThemeSettings into an official Telegram X `.tgx-theme` string.
 * Uses `!` (metadata), `@` (properties), and `#` (colors grouped by hex value, sorted cleanly).
 */
export function serializeTgxTheme(
  colors: ThemeColors,
  settings?: Partial<ThemeSettings>,
  options?: { groupByColor?: boolean; timestamp?: number }
): string {
  const data = convertAtthemeToTgx(colors, settings);
  const groupByColor = options?.groupByColor ?? true;
  const timestamp = options?.timestamp ?? Math.floor(Date.now() / 1000);

  const lines: string[] = [
    '// Telegram X Theme (.tgx-theme)',
    '// Converted from Nakano Telegram Theme Editor (.attheme -> .tgx-theme)',
    '!',
    `name: ${wrapTgxString(data.name)}`,
    `time: ${timestamp}`,
  ];

  if (data.wallpaper) {
    lines.push(`wallpaper: ${wrapTgxString(data.wallpaper)}`);
  }

  lines.push('@');

  // Emit properties (grouped or one-per-line; keep parentTheme first for clarity)
  const propKeys = Object.keys(data.properties);
  const orderedPropKeys = [
    'parentTheme',
    ...propKeys.filter(k => k !== 'parentTheme').sort(),
  ];
  for (const key of orderedPropKeys) {
    const val = data.properties[key];
    if (val === undefined || Number.isNaN(val)) continue;
    lines.push(`${key}: ${val}`);
  }

  lines.push('#');

  if (groupByColor) {
    // Group keys that share the exact same color hex, just like official Telegram X themes
    const keysByColor = new Map<string, string[]>();
    for (const key of Object.keys(data.colors).sort()) {
      const hex = data.colors[key];
      const existing = keysByColor.get(hex);
      if (existing) {
        existing.push(key);
      } else {
        keysByColor.set(hex, [key]);
      }
    }

    const sortedGroups = Array.from(keysByColor.entries()).sort((a, b) =>
      a[1][0].localeCompare(b[1][0])
    );

    for (const [hex, keys] of sortedGroups) {
      lines.push(`${keys.join(', ')}: ${hex}`);
    }
  } else {
    for (const key of Object.keys(data.colors).sort()) {
      lines.push(`${key}: ${data.colors[key]}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Packages a converted theme into a downloadable Telegram X `.tgx-theme` Blob.
 */
export function createTgxThemeDownloadBlob(
  colors: ThemeColors,
  themeName: string,
  settings?: Partial<ThemeSettings>
): { blob: Blob; filename: string } {
  const safeName = themeName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'telegram_x_theme';
  const content = serializeTgxTheme(colors, { ...settings, themeName });
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  return { blob, filename: `${safeName}.tgx-theme` };
}

/**
 * Creates a complete ZIP package containing the Telegram X theme (`.tgx-theme`),
 * optional high-res standalone `wallpaper.jpg`, and Telegram X installation instructions.
 */
export async function createTgxZipThemePackage(
  colors: ThemeColors,
  themeName: string,
  settings: ThemeSettings,
  wallpaperBlob?: Blob
): Promise<{ blob: Blob; filename: string }> {
  const safeName = themeName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'telegram_x_theme';
  const zip = new JSZip();

  const tgxFile = createTgxThemeDownloadBlob(colors, themeName, settings);
  zip.file(tgxFile.filename, tgxFile.blob);

  if (wallpaperBlob && wallpaperBlob.size > 0) {
    zip.file('wallpaper.jpg', wallpaperBlob);
  }

  const instructions = `=====================================================
Telegram X Theme: ${themeName}
Converted with Nakano Telegram Theme Editor (.attheme -> .tgx-theme)
=====================================================

HOW TO APPLY IN TELEGRAM X (ANDROID):

STEP 1 - INSTALL THE THEME:
1. Send "${safeName}.tgx-theme" to your Telegram X "Saved Messages" chat (or any chat).
2. Tap directly on the "${safeName}.tgx-theme" file bubble inside Telegram X.
3. Tap "Install" to save and apply the theme!
${
  wallpaperBlob && wallpaperBlob.size > 0
    ? `
STEP 2 - SET YOUR CUSTOM WALLPAPER:
(Telegram X .tgx-theme files store color/style definitions as pure text and keep wallpapers separate.)
1. Save "wallpaper.jpg" to your phone's Gallery / Photos.
2. In Telegram X, open Settings -> Themes -> Chat Background.
3. Tap "Choose from Gallery", select "wallpaper.jpg", and apply it!
`
    : ''
}
Enjoy your custom Telegram X theme!
`;

  zip.file('instructions.txt', instructions);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, filename: `${safeName}_tgx_theme_pack.zip` };
}

/**
 * Detects whether raw text content is in Telegram X `.tgx-theme` format.
 */
export function isTgxThemeText(text: string): boolean {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  let hasHeader = false;
  let hasColorsSection = false;
  let hasColonColor = false;

  for (const line of lines) {
    if (!line || line.startsWith('//')) continue;
    if (line === '!' || line === '@') hasHeader = true;
    if (line === '#') hasColorsSection = true;
    if (hasColorsSection && /^[a-zA-Z0-9_,\s]+:\s*#[0-9a-fA-F]{3,8}/.test(line)) {
      hasColonColor = true;
      break;
    }
  }

  return hasColorsSection && (hasHeader || hasColonColor);
}

/**
 * Parses a Telegram X `.tgx-theme` file and converts it into TeleTheme Studio's
 * full `.attheme` ThemeColors dictionary so users can import & edit Telegram X themes!
 */
export function parseTgxThemeText(text: string): ParsedTgxThemeResult {
  let section: 'none' | 'main' | 'props' | 'colors' = 'none';
  let themeName: string | undefined;
  let tgxWallpaperLink: string | undefined;
  const props: Record<string, number> = {};
  const tgxColors: Record<string, string> = {};

  const lines = text.split(/\r?\n/);
  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('!')) {
      section = 'main';
      continue;
    }
    if (line.startsWith('@')) {
      section = 'props';
      continue;
    }
    if (line.startsWith('#')) {
      section = 'colors';
      continue;
    }
    if (section === 'none') continue;

    const commentIdx = line.indexOf('//');
    if (commentIdx === 0) continue;
    if (commentIdx !== -1) {
      line = line.slice(0, commentIdx).trim();
      if (!line) continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const keys = line
      .slice(0, colonIdx)
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    const rawVal = line.slice(colonIdx + 1).trim();
    if (keys.length === 0 || !rawVal) continue;

    if (section === 'main') {
      if (keys[0] === 'name') {
        themeName = unwrapTgxString(rawVal);
      } else if (keys[0] === 'wallpaper') {
        tgxWallpaperLink = unwrapTgxString(rawVal);
      }
    } else if (section === 'props') {
      const num = parseFloat(rawVal);
      if (!Number.isNaN(num)) {
        for (const key of keys) {
          props[key] = num;
        }
      }
    } else if (section === 'colors') {
      const converted = tgxHexToAtthemeHex(rawVal);
      if (converted) {
        for (const key of keys) {
          tgxColors[key] = converted;
        }
      }
    }
  }

  const rawColorCount = Object.keys(tgxColors).length;
  if (rawColorCount === 0) {
    return { colors: {}, themeName, rawColorCount: 0 };
  }

  const isDarkProp = props.dark !== undefined ? props.dark >= 0.5 : undefined;
  const isParentDark =
    props.parentTheme === TGX_THEME_IDS.NIGHT_BLUE ||
    props.parentTheme === TGX_THEME_IDS.NIGHT_BLACK ||
    props.parentTheme === TGX_THEME_IDS.BLACK_WHITE;

  const surfaceVariant =
    tgxColors.filling || (isDarkProp || isParentDark ? '#17212b' : '#ffffff');
  const isDark = isDarkProp ?? getLuminance(surfaceVariant) < 0.45;

  const surface =
    tgxColors.chatBackground ||
    tgxColors.background ||
    (isDark ? '#0e1621' : '#f2f2f2');
  const actionBar = tgxColors.headerBackground || surfaceVariant;
  const actionBarText =
    tgxColors.headerText || getReadableTextColor(actionBar, '#ffffff', '#1c242d');
  const actionBarSub = blend(actionBarText, actionBar, 0.35);

  const onSurface =
    tgxColors.text || getReadableTextColor(surfaceVariant, '#ffffff', '#1c242d');
  const onSurfaceVariant =
    tgxColors.textLight || blend(onSurface, surfaceVariant, 0.42);

  const inBubble = tgxColors.bubbleIn_background || surfaceVariant;
  const outBubble =
    tgxColors.bubbleOut_background || (isDark ? '#2b5278' : '#e4f4fe');
  const inMessageText = tgxColors.bubbleIn_text || onSurface;
  const outMessageText =
    tgxColors.bubbleOut_text ||
    getReadableTextColor(getBaseRgbHex(outBubble), '#ffffff', '#0f172a');
  const inTimeText = tgxColors.bubbleIn_time || onSurfaceVariant;
  const outTimeText =
    tgxColors.bubbleOut_time ||
    blend(outMessageText, getBaseRgbHex(outBubble), 0.35);

  const primary =
    tgxColors.badge ||
    tgxColors.chatSendButton ||
    tgxColors.circleButtonRegular ||
    tgxColors.textLink ||
    tgxColors.controlActive ||
    '#4ea4f5';
  const onPrimary =
    tgxColors.badgeText ||
    tgxColors.circleButtonRegularIcon ||
    getReadableTextColor(primary, '#ffffff', '#111827');

  const divider =
    tgxColors.separator ||
    tgxColors.chatSeparator ||
    adjustBrightness(surfaceVariant, isDark ? 8 : -10);

  // Build full Telegram Android palette from extracted tokens, then overlay exact TGX values
  const fullTheme = createFullTelegramTheme({
    actionBar: getBaseRgbHex(actionBar),
    actionBarText: getBaseRgbHex(actionBarText),
    actionBarSub: getBaseRgbHex(actionBarSub),
    surface: getBaseRgbHex(surface),
    surfaceVariant: getBaseRgbHex(surfaceVariant),
    onSurface: getBaseRgbHex(onSurface),
    onSurfaceVariant: getBaseRgbHex(onSurfaceVariant),
    inBubble,
    outBubble,
    outMessageText: getBaseRgbHex(outMessageText),
    inMessageText: getBaseRgbHex(inMessageText),
    outTimeText: getBaseRgbHex(outTimeText),
    inTimeText: getBaseRgbHex(inTimeText),
    primary: getBaseRgbHex(primary),
    onPrimary: getBaseRgbHex(onPrimary),
    messagePanelBg: getBaseRgbHex(surfaceVariant),
    sendButton: getBaseRgbHex(tgxColors.chatSendButton || primary),
    divider: getBaseRgbHex(divider),
    isDark,
    accentCheck: getBaseRgbHex(tgxColors.bubbleOut_ticksRead || tgxColors.ticksRead || primary),
  });

  // Preserve granular TGX overrides when explicitly present
  if (tgxColors.headerIcon) fullTheme.actionBarDefaultIcon = tgxColors.headerIcon;
  if (tgxColors.headerLightBackground) {
    fullTheme.actionBarActionModeDefault = tgxColors.headerLightBackground;
    fullTheme.actionBarActionModeDefaultTop = tgxColors.headerLightBackground;
  }
  if (tgxColors.headerLightIcon) fullTheme.actionBarActionModeDefaultIcon = tgxColors.headerLightIcon;
  if (tgxColors.headerTabActive) fullTheme.actionBarTabLine = tgxColors.headerTabActive;
  if (tgxColors.headerTabActiveText) fullTheme.actionBarTabActiveText = tgxColors.headerTabActiveText;
  if (tgxColors.headerTabInactiveText) fullTheme.actionBarTabUnactiveText = tgxColors.headerTabInactiveText;
  if (tgxColors.bubbleIn_textLink) fullTheme.chat_messageLinkIn = tgxColors.bubbleIn_textLink;
  if (tgxColors.bubbleOut_textLink) fullTheme.chat_messageLinkOut = tgxColors.bubbleOut_textLink;
  if (tgxColors.bubbleOut_ticks) fullTheme.chat_outSentCheck = tgxColors.bubbleOut_ticks;
  if (tgxColors.bubbleOut_ticksRead) fullTheme.chat_outSentCheckRead = tgxColors.bubbleOut_ticksRead;
  if (tgxColors.bubbleOut_chatVerticalLine) fullTheme.chat_outReplyLine = tgxColors.bubbleOut_chatVerticalLine;
  if (tgxColors.messageVerticalLine) fullTheme.chat_inReplyLine = tgxColors.messageVerticalLine;
  if (tgxColors.bubbleOut_messageAuthor) fullTheme.chat_outReplyNameText = tgxColors.bubbleOut_messageAuthor;
  if (tgxColors.messageAuthor) fullTheme.chat_inReplyNameText = tgxColors.messageAuthor;
  if (tgxColors.bubbleOut_waveformActive) fullTheme.chat_outVoiceSeekbarFill = tgxColors.bubbleOut_waveformActive;
  if (tgxColors.bubbleOut_waveformInactive) fullTheme.chat_outVoiceSeekbar = tgxColors.bubbleOut_waveformInactive;
  if (tgxColors.waveformActive) fullTheme.chat_inVoiceSeekbarFill = tgxColors.waveformActive;
  if (tgxColors.waveformInactive) fullTheme.chat_inVoiceSeekbar = tgxColors.waveformInactive;
  if (tgxColors.chatKeyboard) fullTheme.chat_emojiPanelBackground = tgxColors.chatKeyboard;
  if (tgxColors.tooltip) fullTheme.chat_stickersHintPanel = tgxColors.tooltip;
  if (tgxColors.badgeMuted) fullTheme.chats_unreadCounterMuted = tgxColors.badgeMuted;
  if (tgxColors.chatListMute) fullTheme.chats_muteIcon = tgxColors.chatListMute;
  if (tgxColors.online) fullTheme.chats_onlineCircle = tgxColors.online;
  if (tgxColors.circleButtonChat) fullTheme.chat_goDownButton = tgxColors.circleButtonChat;
  if (tgxColors.circleButtonChatIcon) fullTheme.chat_goDownButtonIcon = tgxColors.circleButtonChatIcon;

  const cornerRadius =
    props.bubbleCorner !== undefined
      ? Math.max(0, Math.min(24, Math.round(props.bubbleCorner)))
      : undefined;

  return {
    colors: fullTheme,
    themeName,
    cornerRadius,
    tgxWallpaperLink,
    rawColorCount,
  };
}
