import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Sun,
  Moon,
  Zap,
  Info,
  Copy,
  Check,
  Plus,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Pipette,
  Crop,
} from 'lucide-react';
import type {
  ThemeColors,
  ThemeSettings,
  GeneratorEngine,
  StudioView,
} from '../types/theme';
import { VariableInspector } from './VariableInspector';
import { LeftToolRail, STUDIO_TOKEN_KEYS } from './LeftToolRail';
import {
  generateThemeByEngine,
  getBaseRgbHex,
  getLuminance,
  toCssColor,
  getContrastRatio,
  extractAlphaPercent,
  setHexAlpha,
} from '../utils/colorUtils';
import { parseAtthemeText, serializeAttheme } from '../utils/atthemeParser';
import {
  autoGenerateThemeFromWallpaper,
  generateWallpaperTheme,
  type ExtractedWallpaperPalette,
  type WallpaperThemeStyle,
} from '../utils/wallpaperThemeExtractor';
import { imageBlobToDataUrl } from '../utils/storageUtils';
import { ColorPicker } from './ColorPicker';
import { WallpaperEyedropperModal } from './WallpaperEyedropperModal';
import { isImageFile, isThemeFile } from '../utils/fileUtils';

const FORMULA_OPTIONS: { id: WallpaperThemeStyle; label: string }[] = [
  { id: 'tonal', label: 'Material You Monet' },
  { id: 'glass', label: 'iOS Frosted Accent' },
  { id: 'vibrant', label: 'High Saturation' },
  { id: 'muted', label: 'Pastel Soft' },
  { id: 'expressive', label: 'Duo-Tone Expressive' },
  { id: 'moody', label: 'Deep Atmospheric' },
];

const QUICK_ACCENT_SWATCHES: { name: string; hex: string }[] = [
  { name: 'Telegram Blue', hex: '#2AABEE' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Soft Lavender', hex: '#a78bfa' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Cyber Pink', hex: '#ec4899' },
  { name: 'Arctic Cyan', hex: '#00a884' },
  { name: 'Coral Sunset', hex: '#f97316' },
  { name: 'Crimson Rose', hex: '#f43f5e' },
  { name: 'Electric Indigo', hex: '#6366f1' },
  { name: 'Sky Azure', hex: '#38bdf8' },
  { name: 'Mint Sage', hex: '#34d399' },
  { name: 'Warm Sand', hex: '#d97706' },
];

interface SidebarEditorProps {
  colors: ThemeColors;
  settings: ThemeSettings;
  currentView: StudioView;
  onViewChange: (view: StudioView) => void;
  activeEngine: GeneratorEngine;
  onEngineChange: (engine: GeneratorEngine) => void;
  wallpaperThemeStyle?: WallpaperThemeStyle;
  onWallpaperThemeStyleChange?: (style: WallpaperThemeStyle) => void;
  onColorChange: (key: string, hex: string) => void;
  onBatchColorChange?: (updates: ThemeColors) => void;
  onBulkColorChange: (newColors: ThemeColors, immediate?: boolean) => void;
  onSettingsChange: (settings: Partial<ThemeSettings>) => void;
  extractedPalette: ExtractedWallpaperPalette | null;
  onExtractedPaletteChange: (palette: ExtractedWallpaperPalette | null, imageUrl?: string) => void;
  adaptiveStudioTheme: boolean;
  onToggleAdaptiveStudioTheme: () => void;
  selectedVariableKey?: string;
  selectTrigger?: number;
  openInspectTrigger?: number;
  onSelectVariable: (key: string) => void;
  onExport: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportImageFile?: (file: File) => void;
  onEditCurrentWallpaper?: () => void;
  onImportThemeFile?: (file: File) => Promise<void>;
  onValidateStructure?: (result: { valid: boolean; summary: string }) => void;
  mobileMode?: 'studio' | 'tools' | null;
  isTabletLayout?: boolean;
  className?: string;
}

export const SidebarEditor: React.FC<SidebarEditorProps> = ({
  colors,
  settings,
  currentView,
  onViewChange,
  activeEngine,
  onEngineChange,
  wallpaperThemeStyle: controlledWallpaperThemeStyle,
  onWallpaperThemeStyleChange,
  onColorChange,
  onBatchColorChange,
  onBulkColorChange,
  onSettingsChange,
  extractedPalette,
  onExtractedPaletteChange,
  adaptiveStudioTheme,
  onToggleAdaptiveStudioTheme,
  selectedVariableKey,
  selectTrigger,
  openInspectTrigger,
  onSelectVariable,
  onExport,
  onImportFile,
  onImportImageFile,
  onEditCurrentWallpaper,
  onImportThemeFile,
  onValidateStructure,
  mobileMode = null,
  isTabletLayout = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'studio' | 'colors' | 'inspect' | 'raw' | 'export'>('studio');
  const [mobileToolsTab, setMobileToolsTab] = useState<'inspect' | 'raw' | 'export'>('inspect');
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [splitBubbleOpacity, setSplitBubbleOpacity] = useState(false);

  const inBubbleAlpha = extractAlphaPercent(colors.chat_inBubble || '#182533');
  const outBubbleAlpha = extractAlphaPercent(colors.chat_outBubble || '#2b5278');
  const linkedBubbleAlpha = Math.round((inBubbleAlpha + outBubbleAlpha) / 2);
  const hasSplitOpacityDiff = inBubbleAlpha !== outBubbleAlpha;

  const handleBubbleOpacityChange = (target: 'both' | 'in' | 'out', alphaPercent: number) => {
    const updates: ThemeColors = {};
    if (target === 'both' || target === 'in') {
      updates.chat_inBubble = setHexAlpha(colors.chat_inBubble || '#182533', alphaPercent);
      if (colors.chat_inBubbleSelected) {
        updates.chat_inBubbleSelected = setHexAlpha(colors.chat_inBubbleSelected, alphaPercent);
      }
    }
    if (target === 'both' || target === 'out') {
      updates.chat_outBubble = setHexAlpha(colors.chat_outBubble || '#2b5278', alphaPercent);
      if (colors.chat_outBubbleSelected) {
        updates.chat_outBubbleSelected = setHexAlpha(colors.chat_outBubbleSelected, alphaPercent);
      }
    }
    if (onBatchColorChange) {
      onBatchColorChange(updates);
    } else {
      Object.entries(updates).forEach(([k, v]) => onColorChange(k, v));
    }
  };

  const detectBaseMode = (themeColors: ThemeColors): 'dark' | 'light' | 'amoled' => {
    const lum = getLuminance(getBaseRgbHex(themeColors.windowBackgroundWhite || '#0e1621'));
    if (lum > 0.55) return 'light';
    if (lum < 0.008) return 'amoled';
    return 'dark';
  };

  const [generatorSeed, setGeneratorSeed] = useState<string>(
    () => extractedPalette?.primary || '#2AABEE'
  );
  const [manualSeedInput, setManualSeedInput] = useState<string>(
    () => extractedPalette?.primary || '#2AABEE'
  );
  const [isPickingFromWallpaper, setIsPickingFromWallpaper] = useState<boolean>(false);

  const [generatorMode, setGeneratorMode] = useState<'dark' | 'light' | 'amoled'>(() =>
    detectBaseMode(colors)
  );
  const [localWallpaperThemeStyle, setLocalWallpaperThemeStyle] =
    useState<WallpaperThemeStyle>('tonal');
  const wallpaperThemeStyle = controlledWallpaperThemeStyle ?? localWallpaperThemeStyle;
  const setWallpaperThemeStyle = (next: WallpaperThemeStyle) => {
    setLocalWallpaperThemeStyle(next);
    onWallpaperThemeStyleChange?.(next);
  };
  const [wallpaperLabel, setWallpaperLabel] = useState<string>('');
  const lastSyncedWallpaperRef = useRef<string | null>(null);

  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'warning'>('idle');

  // Drag-and-drop hover states
  const [isDraggingWallStrip, setIsDraggingWallStrip] = useState(false);
  const [isDraggingImportCard, setIsDraggingImportCard] = useState(false);

  // Auto theme from wallpaper state (extractedPalette is lifted to App so the whole studio adapts)
  const [isExtractingPalette, setIsExtractingPalette] = useState<boolean>(false);

  // Raw editor states
  const [rawFormat, setRawFormat] = useState<'int' | 'hex'>('int');
  const [rawText, setRawText] = useState('');
  const [rawCopied, setRawCopied] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarHex, setNewVarHex] = useState('#2AABEE');
  const [showAddModal, setShowAddModal] = useState(false);

  // Sync raw text when colors change
  useEffect(() => {
    if (rawFormat === 'int') {
      setRawText(serializeAttheme(colors, settings.themeName));
    } else {
      const lines = Object.keys(colors)
        .sort()
        .map(k => `${k}=${colors[k]}`);
      setRawText(lines.join('\n'));
    }
  }, [colors, settings.themeName, rawFormat]);

  // Switch to Inspect tab when explicitly requested from Left Rail
  useEffect(() => {
    if (openInspectTrigger && openInspectTrigger > 0) {
      setActiveTab('inspect');
      setMobileToolsTab('inspect');
    }
  }, [openInspectTrigger]);

  // When a variable outside the Left Rail quick list is clicked on the phone, jump to Inspect tab
  useEffect(() => {
    if (!selectedVariableKey || !selectTrigger) return;
    if (!STUDIO_TOKEN_KEYS.has(selectedVariableKey)) {
      setActiveTab('inspect');
      setMobileToolsTab('inspect');
    }
  }, [selectedVariableKey, selectTrigger]);

  // Leave tablet-only Colors tab if viewport grows to desktop (where LeftToolRail is visible on left)
  useEffect(() => {
    if (!isTabletLayout && activeTab === 'colors') {
      setActiveTab('studio');
    }
  }, [isTabletLayout, activeTab]);

  // Sync generatorSeed & label once per wallpaper image so Dark/Light/OLED and Formula switches
  // always adapt to the current wallpaper instead of a stale previous seed or default blue.
  useEffect(() => {
    const currentImage = settings.wallpaperImage;
    if (!currentImage) {
      lastSyncedWallpaperRef.current = null;
      return;
    }
    if (extractedPalette && lastSyncedWallpaperRef.current !== currentImage) {
      lastSyncedWallpaperRef.current = currentImage;
      setGeneratorSeed(extractedPalette.primary);
      // Clear previous explicit label if wallpaper was changed externally (e.g. drag-and-drop / Navbar Import)
      setWallpaperLabel('');
    }
  }, [settings.wallpaperImage, extractedPalette]);

  // Keep Theme Base Mode indicator synced if theme colors change externally (e.g. Undo/Redo or Import)
  useEffect(() => {
    setGeneratorMode(detectBaseMode(colors));
  }, [colors.windowBackgroundWhite]);

  // Keep manual hex input synced with active generator seed
  useEffect(() => {
    setManualSeedInput(generatorSeed.toUpperCase());
  }, [generatorSeed]);

  // Close full-wallpaper picker if wallpaper image is removed
  useEffect(() => {
    if (!settings.wallpaperImage) {
      setIsPickingFromWallpaper(false);
    }
  }, [settings.wallpaperImage]);

  const handleTogglePickSeed = async () => {
    if (settings.wallpaperImage) {
      setIsPickingFromWallpaper(prev => !prev);
      return;
    }

    // Fallback to native browser EyeDropper API when no wallpaper image is loaded
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as unknown as {
          EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
        }).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          void applyThemeWithParams(
            generatorMode,
            result.sRGBHex,
            wallpaperThemeStyle,
            activeEngine
          );
        }
      } catch {
        // User cancelled eyedropper
      }
    }
  };

  const handleManualSeedInputChange = (val: string) => {
    setManualSeedInput(val);
    const trimmed = val.trim();
    const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!match) return;
    let rawHex = match[1];
    if (rawHex.length === 3) {
      rawHex = rawHex
        .split('')
        .map(ch => ch + ch)
        .join('');
    }
    const formatted = `#${rawHex.toLowerCase()}`;
    void applyThemeWithParams(
      generatorMode,
      formatted,
      wallpaperThemeStyle,
      activeEngine,
      false,
      false
    );
  };

  const resolveActiveSeedForCurrentWallpaper = (): string => {
    if (
      settings.wallpaperImage &&
      extractedPalette &&
      lastSyncedWallpaperRef.current !== settings.wallpaperImage
    ) {
      return extractedPalette.primary;
    }
    return generatorSeed;
  };

  const applyThemeWithParams = async (
    nextMode: 'dark' | 'light' | 'amoled',
    nextSeed: string,
    nextStyle: WallpaperThemeStyle,
    nextEngine: GeneratorEngine = activeEngine,
    preferWallpaperPalette = false,
    immediateHistory = true
  ) => {
    setGeneratorMode(nextMode);
    setWallpaperThemeStyle(nextStyle);
    if (nextEngine !== activeEngine) {
      onEngineChange(nextEngine);
    }

    if (extractedPalette) {
      setGeneratorSeed(nextSeed);
      const themed = generateWallpaperTheme(
        extractedPalette,
        nextMode,
        nextStyle,
        nextSeed,
        nextEngine
      );
      onBulkColorChange(themed, immediateHistory);
    } else if (preferWallpaperPalette && (settings.wallpaperBlob || settings.wallpaperImage)) {
      // Wallpaper image is active but palette hasn't finished extracting yet: extract on demand
      setIsExtractingPalette(true);
      try {
        const source = settings.wallpaperBlob || settings.wallpaperImage!;
        const { colors: newTheme, palette } = await autoGenerateThemeFromWallpaper(
          source,
          nextMode,
          nextEngine,
          nextStyle
        );
        if (settings.wallpaperImage) {
          lastSyncedWallpaperRef.current = settings.wallpaperImage;
        }
        onExtractedPaletteChange(palette, settings.wallpaperImage);
        setGeneratorSeed(palette.primary);
        onBulkColorChange(newTheme, immediateHistory);
      } catch (err) {
        console.error('Failed to extract wallpaper colors during mode switch', err);
      } finally {
        setIsExtractingPalette(false);
      }
    } else {
      setGeneratorSeed(nextSeed);
      const effectiveEngine: GeneratorEngine =
        nextMode === 'amoled' ? 'amoled-contrast' : nextEngine;
      const newColors = generateThemeByEngine(effectiveEngine, nextSeed, nextMode);
      onBulkColorChange(newColors, immediateHistory);
    }
  };

  const handleWallpaperFileChange = async (file: File) => {
    if (onImportImageFile) {
      onImportImageFile(file);
      return;
    }
    setIsExtractingPalette(true);
    try {
      const dataUrl = await imageBlobToDataUrl(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');

      const { colors: newTheme, palette } = await autoGenerateThemeFromWallpaper(
        file,
        generatorMode,
        activeEngine,
        wallpaperThemeStyle
      );

      lastSyncedWallpaperRef.current = dataUrl;
      setWallpaperLabel(cleanName || 'Custom Wallpaper');
      onExtractedPaletteChange(palette, dataUrl);
      setGeneratorSeed(palette.primary);
      onSettingsChange({
        wallpaperType: 'image',
        wallpaperImage: dataUrl,
        wallpaperBlob: file,
      });
      onBulkColorChange(newTheme);
      onViewChange('chat');
    } catch (err) {
      console.error('Failed to process uploaded wallpaper', err);
    } finally {
      setIsExtractingPalette(false);
    }
  };

  const handleReExtractWallpaper = async () => {
    if (settings.wallpaperBlob || settings.wallpaperImage) {
      setIsExtractingPalette(true);
      try {
        const { colors: newTheme, palette } = await autoGenerateThemeFromWallpaper(
          settings.wallpaperBlob || settings.wallpaperImage!,
          generatorMode,
          activeEngine,
          wallpaperThemeStyle
        );
        if (settings.wallpaperImage) {
          lastSyncedWallpaperRef.current = settings.wallpaperImage;
        }
        onExtractedPaletteChange(palette, settings.wallpaperImage);
        setGeneratorSeed(palette.primary);
        onBulkColorChange(newTheme);
      } catch (err) {
        console.error('Failed to re-extract wallpaper colors', err);
      } finally {
        setIsExtractingPalette(false);
      }
    } else {
      void applyThemeWithParams(generatorMode, generatorSeed, wallpaperThemeStyle, activeEngine);
    }
  };

  const handleFormulaChange = (style: WallpaperThemeStyle) => {
    const mappedEngine: GeneratorEngine =
      style === 'glass'
        ? 'ios-glass'
        : style === 'vibrant'
        ? 'cyberpunk'
        : style === 'tonal'
        ? 'monet'
        : activeEngine;
    const activeSeed = resolveActiveSeedForCurrentWallpaper();
    void applyThemeWithParams(generatorMode, activeSeed, style, mappedEngine, true);
  };

  const handleModeChange = (mode: 'dark' | 'light' | 'amoled') => {
    const activeSeed = resolveActiveSeedForCurrentWallpaper();
    void applyThemeWithParams(mode, activeSeed, wallpaperThemeStyle, activeEngine, true);
  };

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    const parsed = parseAtthemeText(text);
    if (Object.keys(parsed).length > 0) {
      onBulkColorChange(parsed);
    }
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawText);
    setRawCopied(true);
    setTimeout(() => setRawCopied(false), 2000);
  };

  const handleAddCustomVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarKey.trim()) return;
    onColorChange(newVarKey.trim(), newVarHex);
    setNewVarKey('');
    setShowAddModal(false);
  };

  const handleValidateStructure = () => {
    const requiredKeys = [
      'actionBarDefault',
      'actionBarDefaultTitle',
      'chat_wallpaper',
      'chat_inBubble',
      'chat_outBubble',
      'chat_messageTextIn',
      'chat_messageTextOut',
      'windowBackgroundWhite',
    ];
    const missing = requiredKeys.filter(k => !colors[k]);
    const invalidHexes = Object.entries(colors).filter(
      ([, val]) => !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val.trim())
    );
    const outRatio = getContrastRatio(
      getBaseRgbHex(colors.chat_outBubble || '#2b5278'),
      getBaseRgbHex(colors.chat_messageTextOut || '#ffffff')
    );

    if (missing.length === 0 && invalidHexes.length === 0) {
      setValidationState('valid');
      onValidateStructure?.({
        valid: true,
        summary: `Structure valid! ${Object.keys(colors).length} tokens verified (.attheme v3.2, bubble contrast ${outRatio.toFixed(1)}:1).`,
      });
    } else {
      setValidationState('warning');
      const issues: string[] = [];
      if (missing.length > 0) issues.push(`${missing.length} missing core keys`);
      if (invalidHexes.length > 0) issues.push(`${invalidHexes.length} malformed hex values`);
      onValidateStructure?.({
        valid: false,
        summary: `Validation found issues: ${issues.join(', ')}.`,
      });
    }

    setTimeout(() => setValidationState('idle'), 4000);
  };

  const configuredTokenCount = Object.keys(colors).length;
  const effectiveTab: 'studio' | 'colors' | 'inspect' | 'raw' | 'export' =
    mobileMode === 'studio'
      ? 'studio'
      : mobileMode === 'tools'
      ? mobileToolsTab
      : activeTab;

  const desktopTabs: { id: 'studio' | 'colors' | 'inspect' | 'raw' | 'export'; label: string }[] = isTabletLayout
    ? [
        { id: 'studio', label: 'Studio' },
        { id: 'colors', label: 'Colors' },
        { id: 'inspect', label: 'Inspect' },
        { id: 'raw', label: 'Raw' },
        { id: 'export', label: 'Export' },
      ]
    : [
        { id: 'studio', label: 'Studio' },
        { id: 'inspect', label: 'Inspect' },
        { id: 'raw', label: 'Raw' },
        { id: 'export', label: 'Export' },
      ];

  return (
    <aside
      className={`w-full md:w-[350px] lg:w-96 xl:w-[400px] md:border-l border-surface-border bg-surface-panel/80 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden h-full transition-colors duration-300 ${className}`}
      data-purpose="token-inspector-engine"
    >
      {/* Desktop / Tablet Tab Headers */}
      {!mobileMode && (
        <div className="h-11 border-b border-surface-border px-2 flex items-center justify-between text-xs font-medium shrink-0 bg-surface-panel/70 select-none transition-colors duration-300">
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            {desktopTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-brand-400 bg-brand-500/10 font-semibold border border-brand-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            title="Wallpaper mode & bubble geometry settings"
            className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
              showQuickSettings
                ? 'text-brand-400 bg-brand-500/10 border border-brand-500/25'
                : 'text-slate-400 hover:text-white hover:bg-surface-card'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Tools Sub-Tab Switcher (Inspect / Raw / Export) */}
      {mobileMode === 'tools' && (
        <div className="px-3 py-2 border-b border-surface-border bg-surface-panel/75 shrink-0 select-none">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-base border border-surface-border text-xs">
            {(
              [
                { id: 'inspect', label: 'All Tokens' },
                { id: 'raw', label: 'Raw Code' },
                { id: 'export', label: 'Export & Info' },
              ] as const
            ).map(tab => {
              const isActive = mobileToolsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileToolsTab(tab.id)}
                  className={`py-1.5 px-2 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-brand-500/18 text-brand-300 border border-brand-500/35 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Quick Settings Drawer (accessible from any tab on tablet/desktop) */}
      {!mobileMode && showQuickSettings && (
        <div className="px-4 py-3 border-b border-surface-border bg-surface-base/90 space-y-3 text-xs animate-fade-in shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Canvas Settings
            </span>
            <button
              type="button"
              onClick={() => setShowQuickSettings(false)}
              className="text-[10px] text-brand-400 hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[11px]">
            {(
              [
                { id: 'color', label: 'Solid' },
                { id: 'gradient', label: 'Gradient' },
                { id: 'pattern', label: 'Dots' },
                { id: 'image', label: 'Photo' },
              ] as const
            ).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSettingsChange({ wallpaperType: t.id })}
                className={`py-1 rounded-md border font-medium transition cursor-pointer ${
                  settings.wallpaperType === t.id
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
                    : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inspector Scroll Content */}
      {effectiveTab === 'colors' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <LeftToolRail
            variant="panel"
            colors={colors}
            settings={settings}
            selectedVariableKey={selectedVariableKey}
            selectTrigger={selectTrigger}
            onSelectVariable={onSelectVariable}
            onSettingsChange={onSettingsChange}
            onColorChange={onColorChange}
            onOpenDeepInspect={() => setActiveTab('inspect')}
          />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 sm:space-y-5">
        {/* ================= TAB 1: STUDIO ================= */}
        {effectiveTab === 'studio' && (
          <div className="space-y-4 animate-fade-in">
            {/* Auto Theme from Wallpaper Card (with Dark / Light / OLED controls) */}
            <section
              aria-labelledby="auto-theme-heading"
              className="p-3.5 rounded-xl border border-surface-border bg-surface-card/70 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-white flex items-center gap-1.5" id="auto-theme-heading">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Auto Theme from Wallpaper</span>
                </h2>
                <button
                  type="button"
                  onClick={handleReExtractWallpaper}
                  disabled={isExtractingPalette}
                  className="text-[10px] text-brand-400 hover:underline font-medium cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isExtractingPalette ? 'Extracting...' : 'Re-extract'}
                </button>
              </div>

              {/* Dark / Light / OLED Mode Switcher (moved into Auto Theme from Wallpaper) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Theme Base Mode:</span>
                  <span className="font-mono uppercase text-brand-400">{generatorMode}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-surface-base p-1 rounded-lg border border-surface-border text-[11px]">
                  {(
                    [
                      { id: 'dark', icon: Moon, label: 'Dark', iconClass: 'text-brand-400' },
                      { id: 'light', icon: Sun, label: 'Light', iconClass: 'text-amber-400' },
                      { id: 'amoled', icon: Zap, label: 'OLED', iconClass: 'text-emerald-400' },
                    ] as const
                  ).map(m => {
                    const Icon = m.icon;
                    const active = generatorMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModeChange(m.id)}
                        className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          active
                            ? 'bg-brand-500/20 text-white font-semibold border border-brand-500/35 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card border border-transparent'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? m.iconClass : 'text-slate-500'}`} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Wallpaper Preview Strip (Drag-and-Drop + Quick Actions) */}
              <div
                onDragEnter={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingWallStrip(true);
                }}
                onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                }}
                onDragLeave={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingWallStrip(false);
                }}
                onDrop={async e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingWallStrip(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && isImageFile(file)) {
                    await handleWallpaperFileChange(file);
                  }
                }}
                className={`relative h-24 rounded-lg overflow-hidden border group transition-all duration-200 ${
                  isDraggingWallStrip
                    ? 'border-brand-400 ring-2 ring-brand-500/50'
                    : 'border-white/10'
                }`}
                style={
                  !settings.wallpaperImage
                    ? {
                        background:
                          settings.wallpaperType === 'gradient'
                            ? `linear-gradient(${settings.wallpaperGradient.angle}deg, ${settings.wallpaperGradient.color1}, ${settings.wallpaperGradient.color2})`
                            : `linear-gradient(135deg, ${toCssColor(colors.chat_wallpaper || '#0e1621')} 0%, ${toCssColor(colors.chat_outBubble || '#2b5278')} 55%, ${toCssColor(colors.actionBarDefault || '#17212b')} 100%)`,
                      }
                    : undefined
                }
              >
                {settings.wallpaperImage && (
                  <img
                    src={settings.wallpaperImage}
                    alt="Active Wallpaper Preview"
                    draggable={false}
                    className="w-full h-full object-cover select-none transition duration-300 group-hover:scale-105"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end justify-between gap-2 p-2.5">
                  <span className="text-[10.5px] text-white font-medium truncate min-w-0">
                    {isDraggingWallStrip
                      ? 'Drop wallpaper image...'
                      : settings.wallpaperImage
                      ? wallpaperLabel || settings.themeName || 'Custom Wallpaper'
                      : 'Active Theme Backdrop (Drop Photo)'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {settings.wallpaperImage && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setIsPickingFromWallpaper(true);
                        }}
                        title="Open full uncropped wallpaper to pick any color"
                        className="text-[10px] px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <Pipette className="w-2.5 h-2.5" />
                        <span>Pick</span>
                      </button>
                    )}
                    {settings.wallpaperImage && onEditCurrentWallpaper && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onEditCurrentWallpaper();
                        }}
                        title="Crop, rotate, or adjust current wallpaper"
                        className="text-[10px] px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <Crop className="w-2.5 h-2.5" />
                        <span>Crop</span>
                      </button>
                    )}
                    <label className="text-[10px] px-2.5 py-0.5 rounded bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium transition cursor-pointer">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleWallpaperFileChange(file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Color Extraction Controls: Formula / Style */}
              <div className="text-xs">
                <label className="text-[10px] text-slate-400 block mb-1">Formula / Style:</label>
                <select
                  value={wallpaperThemeStyle}
                  onChange={e => handleFormulaChange(e.target.value as WallpaperThemeStyle)}
                  className="w-full bg-surface-base border border-surface-border text-slate-200 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  {FORMULA_OPTIONS.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Extracted Seeds (12 swatches) + Pick from Wallpaper + Manual Seed Picker */}
              {(() => {
                const detailLabelByHex = new Map<string, string>();
                extractedPalette?.detailedSwatches?.forEach(d => {
                  detailLabelByHex.set(d.hex.toLowerCase(), d.label);
                });

                const seedSwatches =
                  extractedPalette && extractedPalette.swatches.length > 0
                    ? extractedPalette.swatches.slice(0, 12).map((hex, i) => ({
                        name: detailLabelByHex.get(hex.toLowerCase()) || `Seed #${i + 1}`,
                        hex,
                      }))
                    : QUICK_ACCENT_SWATCHES;

                const canPickSeed =
                  Boolean(settings.wallpaperImage) ||
                  (typeof window !== 'undefined' && 'EyeDropper' in window);

                return (
                  <div className="space-y-2.5 pt-2.5 border-t border-surface-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-slate-300 font-medium flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>
                          {extractedPalette ? 'Extracted Seeds' : 'Accent Seeds'}
                        </span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-slate-400">
                          {seedSwatches.length}
                        </span>
                      </span>

                      {canPickSeed && (
                        <button
                          type="button"
                          onClick={handleTogglePickSeed}
                          title={
                            settings.wallpaperImage
                              ? 'Pick any color directly from the wallpaper preview'
                              : 'Pick any color from screen'
                          }
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer ${
                            isPickingFromWallpaper
                              ? 'bg-brand-500/20 border-brand-400/60 text-brand-300'
                              : 'bg-surface-base border-surface-border text-slate-300 hover:text-white hover:border-white/25'
                          }`}
                        >
                          <Pipette className="w-3 h-3" />
                          <span>
                            {isPickingFromWallpaper
                              ? 'Picking...'
                              : settings.wallpaperImage
                              ? 'Pick from image'
                              : 'Eyedropper'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* 2-row Grid of up to 12 Extracted / Quick Accent Seeds */}
                    <div className="grid grid-cols-6 gap-1.5">
                      {seedSwatches.map((swatch, i) => {
                        const isSelected =
                          generatorSeed.toLowerCase() === swatch.hex.toLowerCase();
                        return (
                          <button
                            key={`${swatch.hex}-${i}`}
                            type="button"
                            title={`${swatch.name} (${swatch.hex.toUpperCase()})`}
                            onClick={() =>
                              applyThemeWithParams(
                                generatorMode,
                                swatch.hex,
                                wallpaperThemeStyle,
                                activeEngine
                              )
                            }
                            className={`h-8 sm:h-6 w-full rounded-md border transition hover:scale-105 cursor-pointer relative ${
                              isSelected
                                ? 'border-white ring-2 ring-brand-400 scale-[1.03]'
                                : 'border-white/15 hover:border-white/40'
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                          />
                        );
                      })}
                    </div>

                    {/* Manual Custom Seed Picker Row */}
                    <div className="flex items-center gap-2 pt-1">
                      <ColorPicker
                        color={generatorSeed}
                        onChange={hex =>
                          applyThemeWithParams(
                            generatorMode,
                            getBaseRgbHex(hex),
                            wallpaperThemeStyle,
                            activeEngine,
                            false,
                            false
                          )
                        }
                        showAlpha={false}
                        compact
                        label="Choose manual seed color"
                      />
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-surface-base border border-surface-border rounded-lg px-2 py-1 focus-within:border-brand-500/60 transition">
                        <span className="text-[10px] text-slate-500 shrink-0">Manual:</span>
                        <input
                          type="text"
                          value={manualSeedInput}
                          onChange={e => handleManualSeedInputChange(e.target.value)}
                          onBlur={() => setManualSeedInput(generatorSeed.toUpperCase())}
                          aria-label="Manual seed hex color"
                          placeholder="#2AABEE"
                          className="w-full min-w-0 bg-transparent font-mono text-[11px] text-slate-200 uppercase focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Adapt Web App Studio UI Toggle */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border/60">
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-slate-200 block">
                    Adapt Web App to Wallpaper
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {adaptiveStudioTheme
                      ? extractedPalette?.moodDescription || 'Synced studio colors & frosted backdrop'
                      : 'Using default dark studio palette'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={adaptiveStudioTheme}
                  onClick={onToggleAdaptiveStudioTheme}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    adaptiveStudioTheme ? 'bg-brand-500' : 'bg-surface-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      adaptiveStudioTheme ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* Bubble Geometry & Wallpaper Background Mode Card */}
            <section className="p-3.5 rounded-xl border border-surface-border bg-surface-card/70 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white">Bubble Geometry &amp; Backdrop</h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {settings.wallpaperType}
                </span>
              </div>

              {/* Wallpaper Background Type Switcher */}
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                {(
                  [
                    { id: 'color', label: 'Solid' },
                    { id: 'gradient', label: 'Gradient' },
                    { id: 'pattern', label: 'Dots' },
                    { id: 'image', label: 'Photo' },
                  ] as const
                ).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSettingsChange({ wallpaperType: t.id })}
                    className={`py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                      settings.wallpaperType === t.id
                        ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
                        : 'bg-surface-base border-surface-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Gradient controls inline when Gradient mode is active */}
              {settings.wallpaperType === 'gradient' && (
                <div className="p-2.5 rounded-lg bg-surface-base border border-surface-border space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={settings.wallpaperGradient.color1}
                        onChange={c1 =>
                          onSettingsChange({
                            wallpaperGradient: { ...settings.wallpaperGradient, color1: c1 },
                          })
                        }
                        showAlpha={false}
                      />
                      <span className="font-mono text-[10.5px] text-slate-300">
                        {settings.wallpaperGradient.color1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        color={settings.wallpaperGradient.color2}
                        onChange={c2 =>
                          onSettingsChange({
                            wallpaperGradient: { ...settings.wallpaperGradient, color2: c2 },
                          })
                        }
                        showAlpha={false}
                      />
                      <span className="font-mono text-[10.5px] text-slate-300">
                        {settings.wallpaperGradient.color2}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <span className="text-slate-400">Angle</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={settings.wallpaperGradient.angle}
                      onChange={e =>
                        onSettingsChange({
                          wallpaperGradient: {
                            ...settings.wallpaperGradient,
                            angle: Number(e.target.value),
                          },
                        })
                      }
                      className="flex-1 h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <span className="font-mono text-brand-400 w-8 text-right">
                      {settings.wallpaperGradient.angle}°
                    </span>
                  </div>
                </div>
              )}

              {/* Corner Radius Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Bubble Corner Radius</span>
                  <span className="font-mono text-brand-400">{settings.cornerRadius}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={settings.cornerRadius}
                  onChange={e => onSettingsChange({ cornerRadius: Number(e.target.value) })}
                  className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Chat Bubble Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Chat Bubble Opacity</span>
                    <button
                      type="button"
                      onClick={() => setSplitBubbleOpacity(prev => !prev)}
                      title={
                        splitBubbleOpacity
                          ? 'Link incoming & outgoing bubble opacity'
                          : 'Adjust incoming & outgoing opacity separately'
                      }
                      className={`text-[9.5px] px-1.5 py-0.5 rounded border font-medium transition cursor-pointer ${
                        splitBubbleOpacity
                          ? 'bg-brand-500/15 border-brand-500/40 text-brand-400'
                          : 'bg-surface-base border-surface-border text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {splitBubbleOpacity ? 'Split' : 'Both'}
                    </button>
                  </div>
                  <span className="font-mono text-brand-400">
                    {splitBubbleOpacity || hasSplitOpacityDiff
                      ? `${inBubbleAlpha}% / ${outBubbleAlpha}%`
                      : `${linkedBubbleAlpha}%`}
                  </span>
                </div>

                {!splitBubbleOpacity ? (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={linkedBubbleAlpha}
                    onChange={e => handleBubbleOpacityChange('both', Number(e.target.value))}
                    aria-label="Chat Bubble Opacity"
                    className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                ) : (
                  <div className="space-y-2 pt-0.5 pl-2 border-l border-surface-border/70">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Incoming Bubble</span>
                        <span className="font-mono text-slate-300">{inBubbleAlpha}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={inBubbleAlpha}
                        onChange={e => handleBubbleOpacityChange('in', Number(e.target.value))}
                        aria-label="Incoming Chat Bubble Opacity"
                        className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Outgoing Bubble</span>
                        <span className="font-mono text-slate-300">{outBubbleAlpha}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={outBubbleAlpha}
                        onChange={e => handleBubbleOpacityChange('out', Number(e.target.value))}
                        aria-label="Outgoing Chat Bubble Opacity"
                        className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Speech Bubble Tails Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-surface-border/60">
                <span className="text-[11px] text-slate-400">Speech Bubble Tails</span>
                <button
                  type="button"
                  onClick={() => onSettingsChange({ bubbleTails: !settings.bubbleTails })}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    settings.bubbleTails ? 'bg-brand-500' : 'bg-surface-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.bubbleTails ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 2: DEEP INSPECT ================= */}
        {effectiveTab === 'inspect' && (
          <VariableInspector
            colors={colors}
            settings={settings}
            currentView={currentView}
            onViewChange={onViewChange}
            onColorChange={onColorChange}
            selectedVariableKey={selectedVariableKey}
            selectTrigger={selectTrigger}
            onSelectVariable={onSelectVariable}
          />
        )}

        {/* ================= TAB 4: RAW CODE ================= */}
        {effectiveTab === 'raw' && (
          <div className="space-y-4 animate-fade-in flex flex-col h-full">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-xs text-white">Raw Telegram Variables</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {configuredTokenCount} variables configured
                </p>
              </div>

              <div className="flex items-center gap-1 bg-surface-base p-1 rounded-lg border border-surface-border text-[11px]">
                <button
                  type="button"
                  onClick={() => setRawFormat('int')}
                  className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                    rawFormat === 'int'
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Signed Ints
                </button>
                <button
                  type="button"
                  onClick={() => setRawFormat('hex')}
                  className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                    rawFormat === 'hex'
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hex
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyRaw}
                className="studio-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer"
              >
                {rawCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{rawCopied ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="studio-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-brand-400" />
                <span>Add Custom Key</span>
              </button>
            </div>

            {showAddModal && (
              <form
                onSubmit={handleAddCustomVariable}
                className="p-3 rounded-xl bg-surface-base border border-brand-500/40 space-y-2 animate-fade-in"
              >
                <div className="flex justify-between items-center text-xs font-medium text-brand-400">
                  <span>Add New Telegram Key</span>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. chat_secretTimer"
                  value={newVarKey}
                  onChange={e => setNewVarKey(e.target.value)}
                  className="studio-input w-full px-2.5 py-1.5 text-xs font-mono"
                />
                <div className="flex items-center gap-2">
                  <ColorPicker color={newVarHex} onChange={setNewVarHex} showAlpha={true} />
                  <input
                    type="text"
                    value={newVarHex}
                    onChange={e => setNewVarHex(e.target.value)}
                    className="studio-input flex-1 px-2.5 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="studio-btn-primary px-3 py-1.5 text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 flex flex-col min-h-[280px] sm:min-h-[340px]">
              <textarea
                value={rawText}
                onChange={e => handleRawTextChange(e.target.value)}
                placeholder="key=value (paste your .attheme code here to apply directly)"
                className="w-full h-72 sm:h-96 p-3 rounded-xl bg-surface-base border border-surface-border font-mono text-[11px] leading-relaxed text-slate-200 focus:outline-none focus:border-brand-500 resize-y"
                spellCheck={false}
              />
              <span className="text-[10px] text-slate-400 mt-1.5">
                Tip: Live updates sync instantaneously as you type or paste code.
              </span>
            </div>
          </div>
        )}

        {/* ================= TAB 5: EXPORT & IMPORT ================= */}
        {effectiveTab === 'export' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Theme Name:</label>
              <input
                type="text"
                value={settings.themeName}
                onChange={e => onSettingsChange({ themeName: e.target.value })}
                placeholder="My Custom Android Theme"
                className="studio-input w-full px-3 py-2 text-xs"
              />
            </div>

            <div className="p-4 rounded-xl border border-brand-500/30 bg-brand-500/[0.06] space-y-3">
              <h5 className="font-semibold text-xs text-brand-300">
                Download Telegram / Telegram X Theme
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Export as Telegram Android <code className="text-brand-300 font-mono">.attheme</code> (with native WPS/WPE wallpaper embedding) or convert directly to Telegram X <code className="text-brand-300 font-mono">.tgx-theme</code>.
              </p>
              <button
                type="button"
                onClick={onExport}
                className="studio-btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Theme (.attheme / .tgx-theme)</span>
              </button>
            </div>

            {settings.wallpaperImage && (
              <button
                type="button"
                onClick={() => {
                  onExtractedPaletteChange(null);
                  onSettingsChange({
                    wallpaperImage: undefined,
                    wallpaperBlob: undefined,
                    wallpaperType: 'color',
                  });
                }}
                className="w-full py-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/25 text-xs font-medium hover:bg-rose-500/20 transition cursor-pointer"
              >
                Remove Active Wallpaper Image
              </button>
            )}

            <div
              onDragEnter={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingImportCard(true);
              }}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingImportCard(false);
              }}
              onDrop={async e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingImportCard(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                if (isImageFile(file)) {
                  await handleWallpaperFileChange(file);
                } else if (onImportThemeFile && isThemeFile(file)) {
                  await onImportThemeFile(file);
                }
              }}
              className={`p-4 rounded-xl border bg-surface-card space-y-2.5 transition ${
                isDraggingImportCard
                  ? 'border-brand-400 bg-brand-500/10 ring-2 ring-brand-500/30'
                  : 'border-surface-border'
              }`}
            >
              <h5 className="font-semibold text-xs text-slate-200">
                Import Existing Theme or Photo
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Drop any Telegram theme (.attheme, .tgx-theme, or .zip) or wallpaper image.
              </p>
              <label className="studio-btn-secondary w-full py-2 text-xs flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-brand-400" />
                <span>Browse File</span>
                <input
                  type="file"
                  accept=".attheme,.tgx-theme,.txt,.zip,image/*"
                  onChange={onImportFile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-base/70 border border-surface-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                <Info className="w-3.5 h-3.5 text-brand-400" />
                <span>How to apply on Android:</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                <li>
                  Download your <code className="text-brand-300 font-mono">.attheme</code> file.
                </li>
                <li>
                  Send it to your Telegram <strong className="text-slate-200">Saved Messages</strong>.
                </li>
                <li>
                  Tap the file bubble and select <strong className="text-slate-200">&quot;Apply Theme&quot;</strong>.
                </li>
              </ol>
            </div>

            {/* Inline Format & Validate Card on Mobile (since bottom bar is dedicated to tab nav) */}
            {mobileMode && (
              <div className="p-3 rounded-xl bg-surface-base/80 border border-surface-border flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  <strong className="text-slate-200">.attheme</strong> v3.2
                </span>
                <button
                  type="button"
                  onClick={handleValidateStructure}
                  className={`font-medium flex items-center gap-1 transition cursor-pointer ${
                    validationState === 'valid'
                      ? 'text-emerald-400'
                      : validationState === 'warning'
                      ? 'text-amber-400'
                      : 'text-brand-400 hover:text-brand-300'
                  }`}
                >
                  <span>
                    {validationState === 'valid'
                      ? 'Verified'
                      : validationState === 'warning'
                      ? 'Check Warnings'
                      : 'Validate Structure'}
                  </span>
                  {validationState === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : validationState === 'valid' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Quick Export / Compile Footer Status (Tablet & Desktop only) */}
      {!mobileMode && (
        <div className="h-12 border-t border-surface-border px-3.5 lg:px-4 flex items-center justify-between gap-2 bg-surface-base shrink-0 text-xs select-none whitespace-nowrap">
          <span className="text-slate-400 font-mono text-[11px] truncate">
            Format: <strong className="text-slate-200">.attheme</strong>
            <span className="hidden lg:inline"> (v3.2 compliant)</span>
          </span>
          <button
            type="button"
            onClick={handleValidateStructure}
            className={`font-medium flex items-center gap-1 transition cursor-pointer shrink-0 ${
              validationState === 'valid'
                ? 'text-emerald-400'
                : validationState === 'warning'
                ? 'text-amber-400'
                : 'text-brand-400 hover:text-brand-300'
            }`}
          >
            <span>
              {validationState === 'valid'
                ? 'Verified'
                : validationState === 'warning'
                ? 'Check Warnings'
                : 'Validate Structure'}
            </span>
            {validationState === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : validationState === 'valid' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
      {/* Full-Wallpaper Uncropped Eyedropper Modal */}
      <WallpaperEyedropperModal
        isOpen={isPickingFromWallpaper}
        imageUrl={settings.wallpaperImage}
        currentSeed={generatorSeed}
        onPickColor={hex => {
          void applyThemeWithParams(
            generatorMode,
            hex,
            wallpaperThemeStyle,
            activeEngine
          );
        }}
        onClose={() => setIsPickingFromWallpaper(false)}
      />
    </aside>
  );
};
