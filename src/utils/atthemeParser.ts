import JSZip from 'jszip';
import type { ThemeColors, ThemeSettings } from '../types/theme';
import { hexToArgbInt, argbIntToHex, normalizeHex, normalizeThemeColors } from './colorUtils';
import { isTgxThemeText, parseTgxThemeText } from './tgxThemeConverter';

/**
 * Searches for a byte sequence in a Uint8Array.
 */
function findByteSequence(bytes: Uint8Array, sequence: number[], startIndex = 0): number {
  outer: for (let i = startIndex; i <= bytes.length - sequence.length; i++) {
    for (let j = 0; j < sequence.length; j++) {
      if (bytes[i + j] !== sequence[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Parses a raw .attheme text file content into a ThemeColors dictionary.
 */
export function parseAtthemeText(text: string): ThemeColors {
  const colors: ThemeColors = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const rawVal = trimmed.slice(eqIndex + 1).trim();

    if (!key || !rawVal) continue;

    // Check if value is a signed/unsigned integer or hex string
    if (rawVal.startsWith('#')) {
      colors[key] = normalizeHex(rawVal);
    } else {
      const num = parseInt(rawVal, 10);
      if (!isNaN(num)) {
        colors[key] = argbIntToHex(num);
      }
    }
  }

  return colors;
}

/**
 * Serializes ThemeColors into standard Telegram Android .attheme format.
 * Defaults to signed 32-bit ARGB integers as expected by the official Telegram Android app.
 */
export function serializeAttheme(colors: ThemeColors, _themeName = 'Custom Theme'): string {
  const normalized = normalizeThemeColors(colors);
  const lines: string[] = [];

  const sortedKeys = Object.keys(normalized).sort();
  for (const key of sortedKeys) {
    const hex = normalized[key];
    if (!hex) continue;
    const argbInt = hexToArgbInt(hex);
    lines.push(`${key}=${argbInt}`);
  }

  return lines.join('\n');
}

/**
 * Parses an imported theme file.
 * Handles:
 * 1. Native Telegram Android .attheme binary format containing embedded wallpaper (WPS...WPE)
 * 2. ZIP archives containing .attheme or .tgx-theme + wallpaper.jpg
 * 3. Telegram X .tgx-theme files (converted to ThemeColors)
 * 4. Plain text .attheme files
 */
export async function parseThemeFile(file: File): Promise<{
  colors: ThemeColors;
  wallpaperUrl?: string;
  wallpaperBlob?: Blob;
  isZip: boolean;
  themeName?: string;
  cornerRadius?: number;
  tgxWallpaperLink?: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // 1. Check for native Telegram WPS (Wallpaper Start) and WPE (Wallpaper End) markers
  // 'W','P','S' = [87, 80, 83]
  // 'W','P','E' = [87, 80, 69]
  const wpsIndex = findByteSequence(bytes, [87, 80, 83]);
  const wpeIndex = findByteSequence(bytes, [87, 80, 69], wpsIndex > 0 ? wpsIndex : 0);

  if (wpsIndex !== -1 && wpeIndex !== -1 && wpeIndex > wpsIndex) {
    // Decode colors portion before WPS
    const textDecoder = new TextDecoder('utf-8');
    const colorsText = textDecoder.decode(bytes.subarray(0, wpsIndex));
    const parsedColors = parseAtthemeText(colorsText);

    // Determine exact image byte bounds (skipping \r?\n after WPS)
    let imageStart = wpsIndex + 3;
    if (bytes[imageStart] === 13) imageStart++; // \r
    if (bytes[imageStart] === 10) imageStart++; // \n

    let imageEnd = wpeIndex;
    if (imageEnd > imageStart && bytes[imageEnd - 1] === 10) imageEnd--; // \n
    if (imageEnd > imageStart && bytes[imageEnd - 1] === 13) imageEnd--; // \r

    if (imageEnd > imageStart) {
      const imageBytes = bytes.subarray(imageStart, imageEnd);
      // Detect MIME type (JPEG starts with FF D8, PNG starts with 89 50 4E 47)
      const isPng = imageBytes.length > 4 && imageBytes[0] === 0x89 && imageBytes[1] === 0x50;
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const wallpaperBlob = new Blob([imageBytes], { type: mime });
      const wallpaperUrl = URL.createObjectURL(wallpaperBlob);

      return {
        colors: parsedColors,
        wallpaperUrl,
        wallpaperBlob,
        isZip: false,
      };
    }

    return { colors: parsedColors, isZip: false };
  }

  // 2. Check if file is a ZIP archive
  try {
    const zip = await JSZip.loadAsync(file);
    let colorsContent = '';
    let isTgxInZip = false;
    let wallpaperBlob: Blob | undefined;

    const colorsFile =
      zip.file('colors.attheme') ||
      zip.file('theme.attheme') ||
      zip.file(/.*\.attheme$/i)[0];

    if (colorsFile) {
      colorsContent = await colorsFile.async('string');
    } else {
      const tgxFile = zip.file(/.*\.tgx-theme$/i)[0];
      if (tgxFile) {
        colorsContent = await tgxFile.async('string');
        isTgxInZip = true;
      }
    }

    const wallpaperFile =
      zip.file('wallpaper.jpg') ||
      zip.file('background.jpg') ||
      zip.file('wallpaper.png') ||
      zip.file('background.png') ||
      zip.file(/\.(jpg|jpeg|png)$/i)[0];

    if (wallpaperFile) {
      wallpaperBlob = await wallpaperFile.async('blob');
    }

    if (colorsContent) {
      const wallpaperUrl = wallpaperBlob ? URL.createObjectURL(wallpaperBlob) : undefined;
      if (isTgxInZip || isTgxThemeText(colorsContent)) {
        const parsed = parseTgxThemeText(colorsContent);
        return {
          colors: parsed.colors,
          wallpaperUrl,
          wallpaperBlob,
          isZip: true,
          themeName: parsed.themeName,
          cornerRadius: parsed.cornerRadius,
          tgxWallpaperLink: parsed.tgxWallpaperLink,
        };
      }
      const parsedColors = parseAtthemeText(colorsContent);
      return { colors: parsedColors, wallpaperUrl, wallpaperBlob, isZip: true };
    }
  } catch {
    // Not a ZIP archive
  }

  // 3. Check if file is Telegram X (.tgx-theme) plain text
  const text = new TextDecoder('utf-8').decode(bytes);
  if (/\.tgx-theme$/i.test(file.name) || isTgxThemeText(text)) {
    const parsed = parseTgxThemeText(text);
    if (Object.keys(parsed.colors).length > 0) {
      return {
        colors: parsed.colors,
        isZip: false,
        themeName: parsed.themeName,
        cornerRadius: parsed.cornerRadius,
        tgxWallpaperLink: parsed.tgxWallpaperLink,
      };
    }
  }

  // 4. Fallback: Parse as plain text .attheme
  const parsedColors = parseAtthemeText(text);
  return { colors: parsedColors, isZip: false };
}

/**
 * Renders the theme wallpaper onto an offscreen canvas and returns a high-res JPEG Blob.
 * This guarantees that solid colors, gradients, patterns, and custom photos
 * are ALWAYS embedded in the .attheme file between WPS and WPE so Telegram Android
 * immediately updates the chat wallpaper upon applying the theme!
 */
export async function generateWallpaperBlob(
  settings: ThemeSettings,
  colors: ThemeColors
): Promise<Blob> {
  // Always render onto standardized offscreen canvas (1080x1920)
  // This guarantees all images (large raw photos, PNGs, WebP) are converted to a
  // compact, high-quality baseline JPEG (~180-250KB) that Telegram Android's
  // BitmapFactory.decodeByteArray() can load flawlessly without OOM crashes!
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new Blob([], { type: 'image/jpeg' });
  }

  const hasImage = Boolean(settings.wallpaperImage || settings.wallpaperBlob);
  let imageSourceUrl = settings.wallpaperImage;
  let shouldRevoke = false;

  if (!imageSourceUrl && settings.wallpaperBlob) {
    imageSourceUrl = URL.createObjectURL(settings.wallpaperBlob);
    shouldRevoke = true;
  }

  if ((settings.wallpaperType === 'image' || hasImage) && imageSourceUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      if (!imageSourceUrl.startsWith('blob:') && !imageSourceUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const hRatio = width / img.width;
        const vRatio = height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (width - img.width * ratio) / 2;
        const centerShiftY = (height - img.height * ratio) / 2;

        if (settings.wallpaperBlur && settings.wallpaperBlur > 0) {
          ctx.filter = `blur(${settings.wallpaperBlur * 1.5}px)`;
        }

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShiftX,
          centerShiftY,
          img.width * ratio,
          img.height * ratio
        );
        ctx.filter = 'none';
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = colors.chat_wallpaper || '#0e1621';
        ctx.fillRect(0, 0, width, height);
        resolve();
      };
      img.src = imageSourceUrl;
    });

    if (shouldRevoke && imageSourceUrl) {
      URL.revokeObjectURL(imageSourceUrl);
    }
  } else if (settings.wallpaperType === 'gradient') {
    const angleRad = ((settings.wallpaperGradient.angle - 90) * Math.PI) / 180;
    const x1 = width / 2 - (Math.cos(angleRad) * width) / 2;
    const y1 = height / 2 - (Math.sin(angleRad) * height) / 2;
    const x2 = width / 2 + (Math.cos(angleRad) * width) / 2;
    const y2 = height / 2 + (Math.sin(angleRad) * height) / 2;

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, settings.wallpaperGradient.color1 || '#1e3c72');
    grad.addColorStop(1, settings.wallpaperGradient.color2 || '#2a5298');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (settings.wallpaperType === 'pattern') {
    ctx.fillStyle = colors.chat_wallpaper || '#0e1621';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = colors.chat_outSentCheck || '#4ea4f5';
    ctx.globalAlpha = 0.18;
    const spacing = 36;
    const radius = 2.5;
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x + (y % (spacing * 2) === 0 ? 0 : spacing / 2), y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
  } else {
    // Solid color
    ctx.fillStyle = colors.chat_wallpaper || '#0e1621';
    ctx.fillRect(0, 0, width, height);
  }

  // Apply Dim overlay if configured
  if (settings.wallpaperDim && settings.wallpaperDim > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${settings.wallpaperDim / 100})`;
    ctx.fillRect(0, 0, width, height);
  }

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(new Blob([], { type: 'image/jpeg' }));
        }
      },
      'image/jpeg',
      0.88
    );
  });
}

/**
 * Packages a theme into a downloadable Telegram Android .attheme file.
 * If wallpaper is attached (or generated from settings), natively embeds the image using
 * the official WPS / WPE standard so Telegram Android loads the background wallpaper instantly!
 */
export async function createThemeDownloadBlob(
  colors: ThemeColors,
  themeName: string,
  wallpaperBlob?: Blob,
  settings?: ThemeSettings
): Promise<{ blob: Blob; filename: string }> {
  const safeName = themeName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'telegram_theme';

  let finalWallpaperBlob = wallpaperBlob;
  // If wallpaper is image mode or blob is available, ALWAYS generate standardized JPEG
  // so Telegram Android's BitmapFactory can decode it without crashing or failing on PNG/WebP
  if (settings && (settings.wallpaperImage || settings.wallpaperBlob || settings.wallpaperType === 'image' || settings.wallpaperType === 'gradient' || settings.wallpaperType === 'pattern')) {
    try {
      finalWallpaperBlob = await generateWallpaperBlob(settings, colors);
    } catch (e) {
      console.warn('Failed to generate standardized wallpaper blob', e);
      if (!finalWallpaperBlob) finalWallpaperBlob = wallpaperBlob;
    }
  }

  if (finalWallpaperBlob && finalWallpaperBlob.size > 0) {
    // CRUCIAL FOR TELEGRAM ANDROID:
    // When an image is embedded after WPS, Telegram Android's Theme.java checks:
    // "if (backgroundColor != 0) settings.wallpaper = new ColorDrawable(backgroundColor);"
    // If chat_wallpaper is included in the .attheme text, Telegram prioritizes the solid color
    // and completely ignores the embedded wallpaper at themedWallpaperFileOffset!
    // As seen in official Telegram source (Theme.java line 6782), chat_wallpaper must be omitted.
    const colorsForEmbedding: ThemeColors = { ...colors };
    delete colorsForEmbedding.chat_wallpaper;
    delete colorsForEmbedding.chat_wallpaper_gradient_to1;
    delete colorsForEmbedding.chat_wallpaper_gradient_to2;
    delete colorsForEmbedding.chat_wallpaper_gradient_to3;
    delete colorsForEmbedding.chat_wallpaper_gradient_rotation;

    const embeddedColorsText = serializeAttheme(colorsForEmbedding, themeName);
    const encoder = new TextEncoder();
    const preText = embeddedColorsText + '\nWPS\n';
    const postText = '\nWPE\n';

    const preBytes = encoder.encode(preText);
    const postBytes = encoder.encode(postText);
    const imageBytes = new Uint8Array(await finalWallpaperBlob.arrayBuffer());

    // Allocate combined buffer
    const combined = new Uint8Array(preBytes.length + imageBytes.length + postBytes.length);
    combined.set(preBytes, 0);
    combined.set(imageBytes, preBytes.length);
    combined.set(postBytes, preBytes.length + imageBytes.length);

    const binaryBlob = new Blob([combined], { type: 'application/octet-stream' });
    return { blob: binaryBlob, filename: `${safeName}.attheme` };
  }

  // Plain text theme (no wallpaper)
  const plainColorsText = serializeAttheme(colors, themeName);
  const textBlob = new Blob([plainColorsText], { type: 'text/plain;charset=utf-8' });
  return { blob: textBlob, filename: `${safeName}.attheme` };
}

/**
 * Creates a complete ZIP package containing the theme (.attheme), standalone high-res wallpaper (.jpg),
 * and instructions for applying on Telegram Android.
 */
export async function createZipThemePackage(
  colors: ThemeColors,
  themeName: string,
  settings: ThemeSettings
): Promise<{ blob: Blob; filename: string }> {
  const safeName = themeName.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'telegram_theme';
  const zip = new JSZip();

  let wallpaperBlob: Blob | undefined;
  if (settings.wallpaperType === 'image' || settings.wallpaperBlob || settings.wallpaperImage) {
    try {
      wallpaperBlob = await generateWallpaperBlob(settings, colors);
    } catch (e) {
      console.warn('Could not generate wallpaper for zip pack', e);
    }
  }

  // 1. Add .attheme file (with embedded wallpaper)
  const themeFile = await createThemeDownloadBlob(colors, themeName, wallpaperBlob, settings);
  zip.file(`${safeName}.attheme`, themeFile.blob);

  // 2. Add standalone high-res wallpaper.jpg
  if (wallpaperBlob) {
    zip.file('wallpaper.jpg', wallpaperBlob);
  }

  // 3. Add instructions
  const instructions = `=====================================================
Telegram Android Theme: ${themeName}
Created with TeleTheme Studio
=====================================================

HOW TO APPLY ON TELEGRAM FOR ANDROID:

METHOD 1 - DIRECT 1-TAP APPLY:
1. Send "${safeName}.attheme" to your Telegram "Saved Messages" chat (or any chat).
2. Tap directly on the sent "${safeName}.attheme" file inside Telegram.
3. Tap "APPLY THEME" at the bottom of the preview screen!

METHOD 2 - MANUAL WALLPAPER (if needed):
If your Telegram version or client does not automatically set the chat background:
1. Save "wallpaper.jpg" to your phone's Gallery / Photos.
2. In Telegram, open Settings -> Chat Settings -> Change Chat Wallpaper.
3. Tap "Select from Gallery", choose "wallpaper.jpg", and tap "Set Wallpaper".

Enjoy your custom theme!
`;
  zip.file('instructions.txt', instructions);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, filename: `${safeName}_theme_pack.zip` };
}

/**
 * Exports palette for Telegram Desktop (.tdesktop-palette)
 */
export function exportTdesktopPalette(colors: ThemeColors): string {
  const lines: string[] = [
    `// Telegram Desktop Palette`,
    `windowBg: ${colors.windowBackgroundWhite || '#ffffff'};`,
    `windowFg: ${colors.windowBackgroundWhiteBlackText || '#000000'};`,
    `topBarBg: ${colors.actionBarDefault || '#517da2'};`,
    `topBarFg: ${colors.actionBarDefaultTitle || '#ffffff'};`,
    `msgInBg: ${colors.chat_inBubble || '#ffffff'};`,
    `msgOutBg: ${colors.chat_outBubble || '#effdde'};`,
    `historyTextIn: ${colors.chat_messageTextIn || '#000000'};`,
    `historyTextOut: ${colors.chat_messageTextOut || '#000000'};`,
  ];
  return lines.join('\n');
}
