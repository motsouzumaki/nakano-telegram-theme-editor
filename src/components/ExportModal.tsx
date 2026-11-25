import React, { useMemo, useState } from 'react';
import { Download, Copy, Check, X, Smartphone, Zap, Archive, Image as ImageIcon, Link2 } from 'lucide-react';
import type { ThemeColors, ThemeSettings } from '../types/theme';
import {
  serializeAttheme,
  createThemeDownloadBlob,
  generateWallpaperBlob,
  createZipThemePackage,
} from '../utils/atthemeParser';
import {
  convertAtthemeToTgx,
  serializeTgxTheme,
  createTgxThemeDownloadBlob,
  createTgxZipThemePackage,
  parseTgxWallpaperInput,
} from '../utils/tgxThemeConverter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  settings: ThemeSettings;
  onSettingsChange?: (partial: Partial<ThemeSettings>) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  colors,
  settings,
  onSettingsChange,
}) => {
  const [format, setFormat] = useState<'attheme' | 'tgx'>('attheme');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [localTgxLink, setLocalTgxLink] = useState<string>(settings.tgxWallpaperLink || '');

  const effectiveTgxLink = onSettingsChange ? (settings.tgxWallpaperLink || '') : localTgxLink;
  const effectiveSettings = useMemo<ThemeSettings>(
    () => ({ ...settings, tgxWallpaperLink: effectiveTgxLink }),
    [settings, effectiveTgxLink]
  );

  const tgxConversion = useMemo(
    () => convertAtthemeToTgx(colors, effectiveSettings),
    [colors, effectiveSettings]
  );

  const rawCode = useMemo(
    () =>
      format === 'attheme'
        ? serializeAttheme(colors, effectiveSettings.themeName)
        : serializeTgxTheme(colors, effectiveSettings),
    [format, colors, effectiveSettings]
  );

  const handleTgxWallpaperLinkChange = (value: string) => {
    if (onSettingsChange) {
      onSettingsChange({ tgxWallpaperLink: value });
    } else {
      setLocalTgxLink(value);
    }
  };

  if (!isOpen) return null;

  const hasCustomWallpaper = Boolean(
    settings &&
      (settings.wallpaperImage ||
        settings.wallpaperBlob ||
        settings.wallpaperType === 'image' ||
        settings.wallpaperType === 'gradient' ||
        settings.wallpaperType === 'pattern')
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTheme = async () => {
    setIsDownloading(true);
    try {
      if (format === 'attheme') {
        let wallpaperBlob: Blob | undefined;
        if (hasCustomWallpaper) {
          try {
            wallpaperBlob = await generateWallpaperBlob(settings, colors);
          } catch (e) {
            console.warn('Could not generate wallpaper blob', e);
            wallpaperBlob = settings.wallpaperBlob;
          }
        }

        const { blob, filename } = await createThemeDownloadBlob(
          colors,
          settings.themeName || 'My_Telegram_Theme',
          wallpaperBlob,
          settings
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const { blob, filename } = createTgxThemeDownloadBlob(
          colors,
          effectiveSettings.themeName || 'My_Telegram_X_Theme',
          effectiveSettings
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWallpaper = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateWallpaperBlob(settings, colors);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.themeName || 'theme'}_wallpaper.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to download wallpaper', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      if (format === 'attheme') {
        const { blob, filename } = await createZipThemePackage(
          colors,
          settings.themeName || 'My_Telegram_Theme',
          settings
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        let wallpaperBlob: Blob | undefined;
        if (hasCustomWallpaper) {
          try {
            wallpaperBlob = await generateWallpaperBlob(settings, colors);
          } catch (e) {
            console.warn('Could not generate wallpaper for Telegram X ZIP pack', e);
            wallpaperBlob = settings.wallpaperBlob;
          }
        }
        const { blob, filename } = await createTgxZipThemePackage(
          colors,
          effectiveSettings.themeName || 'My_Telegram_X_Theme',
          effectiveSettings,
          wallpaperBlob
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn('Failed to download ZIP package', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-surface-panel/95 backdrop-blur-xl border border-surface-border rounded-2xl flex flex-col max-h-[92dvh] overflow-hidden text-[#EDEDEF]"
        style={{
          boxShadow:
            '0 25px 70px rgba(0,0,0,0.9), 0 0 60px var(--color-brand-glow), inset 0 1px 0 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4.5 border-b border-surface-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center justify-center shadow-sm shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base linear-headline-gradient truncate">
                Export Telegram Theme
              </h3>
              <p className="text-xs text-[#8A8F98] truncate">
                {settings.themeName || 'Custom Theme'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
            aria-label="Close export modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Format Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <button
              onClick={() => setFormat('attheme')}
              className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                format === 'attheme'
                  ? 'bg-brand-500/12 border-brand-500/50 text-white'
                  : 'bg-surface-card/60 border-surface-border text-[#8A8F98] hover:text-[#EDEDEF] hover:border-white/[0.16]'
              }`}
              style={
                format === 'attheme'
                  ? { boxShadow: '0 0 16px -4px var(--color-brand-glow)' }
                  : undefined
              }
            >
              <Smartphone className="w-5 h-5 mt-0.5 text-brand-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-sm block text-[#EDEDEF]">Telegram Android (.attheme)</span>
                <span className="text-xs text-[#8A8F98] block mt-0.5">
                  Official format for Android phones &amp; tablets
                </span>
              </div>
            </button>

            <button
              onClick={() => setFormat('tgx')}
              className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                format === 'tgx'
                  ? 'bg-brand-500/12 border-brand-500/50 text-white'
                  : 'bg-surface-card/60 border-surface-border text-[#8A8F98] hover:text-[#EDEDEF] hover:border-white/[0.16]'
              }`}
              style={
                format === 'tgx'
                  ? { boxShadow: '0 0 16px -4px var(--color-brand-glow)' }
                  : undefined
              }
            >
              <Zap className="w-5 h-5 mt-0.5 text-brand-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-sm block text-[#EDEDEF]">Telegram X (.tgx-theme)</span>
                <span className="text-xs text-[#8A8F98] block mt-0.5">
                  Converted format for Telegram X Android client
                </span>
              </div>
            </button>
          </div>

          {/* Wallpaper status indicator */}
          {(settings.wallpaperType === 'image' || settings.wallpaperImage || settings.wallpaperBlob) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-brand-500/[0.08] border border-brand-500/25 text-xs">
              <div className="flex items-center gap-2 text-brand-300">
                <ImageIcon className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="font-medium">Custom Wallpaper Attached</span>
              </div>
              <button
                onClick={handleDownloadWallpaper}
                disabled={isDownloading}
                className="linear-btn-secondary px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Save Wallpaper (.jpg)</span>
              </button>
            </div>
          )}

          {/* Telegram X Cloud Wallpaper Linker (for 1-tap auto-wallpaper in Telegram X) */}
          {format === 'tgx' && (
            <div className="p-3.5 rounded-xl bg-surface-card/80 border border-surface-border text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-[#EDEDEF] font-medium">
                  <Link2 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>Telegram X Cloud Wallpaper Link (Optional)</span>
                </div>
                {tgxConversion.wallpaper ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                    {tgxConversion.wallpaperSource === 'cloud-link'
                      ? '✓ Cloud photo linked'
                      : tgxConversion.wallpaperSource === 'gradient'
                      ? '✓ Gradient auto-linked'
                      : '✓ Solid color auto-linked'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                    Photo not linked yet
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={effectiveTgxLink}
                  onChange={e => handleTgxWallpaperLinkChange(e.target.value)}
                  placeholder="Paste https://t.me/bg/... or tg://bg?slug=... for 1-tap photo wallpaper"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-surface-base border border-surface-border text-xs text-[#EDEDEF] placeholder:text-[#8A8F98]/60 font-mono focus:outline-none focus:border-brand-500/60"
                />
                {effectiveTgxLink && (
                  <button
                    type="button"
                    onClick={() => handleTgxWallpaperLinkChange('')}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] text-[#8A8F98] hover:text-[#EDEDEF] bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {effectiveTgxLink && !parseTgxWallpaperInput(effectiveTgxLink) ? (
                <p className="text-[11px] text-rose-400">
                  Please paste a valid Telegram wallpaper link (e.g. <code className="font-mono">https://t.me/bg/Qe9IiLLfiVIBAAAAn_BDUKSYaCs</code>) or slug.
                </p>
              ) : (settings.wallpaperType === 'image' || settings.wallpaperImage || settings.wallpaperBlob) &&
                tgxConversion.wallpaperSource === 'none' ? (
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  <strong>Why wasn&apos;t the photo inside .tgx-theme?</strong> Unlike <code className="text-[#EDEDEF] bg-white/[0.06] px-1 rounded font-mono">.attheme</code>, Telegram X&apos;s <code className="text-[#EDEDEF] bg-white/[0.06] px-1 rounded font-mono">.tgx-theme</code> format is pure text and cannot hold raw image bytes — it loads photo wallpapers from Telegram Cloud via <code className="text-[#EDEDEF] bg-white/[0.06] px-1 rounded font-mono">t.me/bg/...</code>.
                  <br />
                  <span className="text-[#8A8F98]">
                    <strong className="text-[#EDEDEF]">To bundle your photo in 10s:</strong> Click <em>Save Wallpaper (.jpg)</em> above → set it once in Telegram / Telegram X (<em>Settings → Chat Background</em>) → tap <em>Share</em> to copy the <code className="font-mono text-[#EDEDEF]">t.me/bg/...</code> link → paste it here!
                  </span>
                </p>
              ) : (
                tgxConversion.wallpaper && (
                  <p className="text-[11px] text-[#8A8F98] font-mono truncate">
                    Exporting <span className="text-emerald-300">wallpaper: &quot;{tgxConversion.wallpaper}&quot;</span> in .tgx-theme
                  </p>
                )
              )}
            </div>
          )}

          {/* Quick instructions */}
          {format === 'attheme' ? (
            <div className="p-4 rounded-xl bg-surface-card/70 border border-surface-border text-xs space-y-1.5">
              <span className="font-semibold text-brand-300 block">📱 How to apply on Telegram Android in 3 steps:</span>
              <p className="text-[#8A8F98]">
                1. Tap <strong className="text-[#EDEDEF]">"Download .attheme"</strong> below (wallpaper image is automatically bundled into the file).
              </p>
              <p className="text-[#8A8F98]">
                2. Open Telegram on your Android device and send the downloaded file to your <strong className="text-[#EDEDEF]">Saved Messages</strong> chat.
              </p>
              <p className="text-[#8A8F98]">
                3. Tap directly on the file bubble inside Telegram and press <strong className="text-[#EDEDEF]">"Apply Theme"</strong>!
              </p>
              {(settings.wallpaperImage || settings.wallpaperBlob) && (
                <p className="text-amber-300/90 text-[11px] pt-1 border-t border-surface-border mt-2">
                  💡 <strong>Wallpaper Note:</strong> The wallpaper photo is embedded inside the binary <code className="text-[#EDEDEF] bg-white/[0.06] px-1 py-0.5 rounded font-mono">.attheme</code> file. Copying plain text only copies the color palette, not the image.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-card/70 border border-surface-border text-xs space-y-1.5">
              <span className="font-semibold text-brand-300 block">⚡ How to apply on Telegram X in 3 steps:</span>
              <p className="text-[#8A8F98]">
                1. Tap <strong className="text-[#EDEDEF]">"Download .tgx-theme"</strong> below (or <strong className="text-[#EDEDEF]">ZIP Package</strong> to include <code className="text-[#EDEDEF] bg-white/[0.06] px-1 rounded font-mono">wallpaper.jpg</code>).
              </p>
              <p className="text-[#8A8F98]">
                2. Open <strong className="text-[#EDEDEF]">Telegram X</strong> on Android and send the <code className="text-[#EDEDEF] bg-white/[0.06] px-1 py-0.5 rounded font-mono">.tgx-theme</code> file to your <strong className="text-[#EDEDEF]">Saved Messages</strong>.
              </p>
              <p className="text-[#8A8F98]">
                3. Tap the file bubble inside Telegram X and press <strong className="text-[#EDEDEF]">"Install"</strong> to apply!
              </p>
            </div>
          )}

          {/* Code Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A8F98] font-medium">
                {format === 'attheme'
                  ? 'Generated Theme Code (.attheme):'
                  : `Converted Telegram X Code (.tgx-theme • Base: ${tgxConversion.parentThemeName}):`}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to clipboard' : 'Copy code'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-surface-base border border-surface-border font-mono text-[11px] text-[#EDEDEF]/85 max-h-48 overflow-y-auto select-all leading-relaxed">
              {rawCode}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 pb-safe border-t border-surface-border bg-surface-base/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <span className="text-[11px] sm:text-xs text-[#8A8F98] font-mono">
            {format === 'attheme'
              ? `${Object.keys(colors).length} variables configured`
              : `${tgxConversion.mappedCount} Telegram X colors converted`}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-xs font-medium text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="linear-btn-secondary px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              title={
                format === 'attheme'
                  ? 'Download ZIP archive containing .attheme, wallpaper and instructions'
                  : 'Download ZIP archive containing .tgx-theme, wallpaper and Telegram X instructions'
              }
            >
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span>ZIP</span>
              <span className="hidden sm:inline">Package</span>
            </button>

            <button
              onClick={handleDownloadTheme}
              disabled={isDownloading}
              className="linear-btn-primary flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-2 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>
                {isDownloading
                  ? 'Bundling...'
                  : format === 'attheme'
                  ? 'Download .attheme'
                  : 'Download .tgx-theme'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
