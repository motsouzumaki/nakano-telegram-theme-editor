import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LeftToolRail, STUDIO_TOKEN_KEYS } from './components/LeftToolRail';
import { PhoneSimulator } from './components/PhoneSimulator';
import { SidebarEditor } from './components/SidebarEditor';
import { MobileBottomNav, type MobileTab } from './components/MobileBottomNav';
import { ExportModal } from './components/ExportModal';
import { ImageCropModal, type ImageCropResult } from './components/ImageCropModal';
import type {
  ThemeColors,
  ThemeSettings,
  StudioView,
  PreviewToggles,
  GeneratorEngine,
} from './types/theme';
import { THEME_PRESETS } from './data/presets';
import { parseThemeFile, serializeAttheme } from './utils/atthemeParser';
import {
  normalizeThemeColors,
  getLuminance,
} from './utils/colorUtils';
import {
  autoGenerateThemeFromWallpaper,
  extractWallpaperColors,
  type ExtractedWallpaperPalette,
  type WallpaperThemeStyle,
} from './utils/wallpaperThemeExtractor';
import {
  computeStudioTheme,
  applyStudioThemeToDocument,
} from './utils/studioThemeAdapter';
import { isImageFile, isThemeFile } from './utils/fileUtils';
import { useThemeHistory, type ThemeHistoryEntry } from './hooks/useThemeHistory';
import {
  loadSavedThemeState,
  saveThemeState,
  imageBlobToDataUrl,
  dataUrlToBlob,
} from './utils/storageUtils';

export function App() {
  // Default to Telegram Dark preset
  const defaultPreset = THEME_PRESETS[0];

  // Helper to determine initial state (from localStorage or default preset)
  const getInitialThemeState = (): {
    historyEntry: ThemeHistoryEntry;
    savedView: StudioView;
    savedInspect: boolean;
    savedAdaptiveStudio: boolean;
  } => {
    const saved = loadSavedThemeState();
    if (saved) {
      const restoredSettings: ThemeSettings = {
        ...saved.settings,
        wallpaperBlob: saved.settings.wallpaperImage
          ? dataUrlToBlob(saved.settings.wallpaperImage)
          : undefined,
      };

      return {
        historyEntry: {
          colors: normalizeThemeColors(saved.colors),
          settings: restoredSettings,
          activePresetName: saved.activePresetName || '',
        },
        savedView: saved.currentView || 'chat',
        savedInspect: saved.inspectMode ?? true,
        savedAdaptiveStudio: saved.adaptiveStudioTheme ?? true,
      };
    }

    return {
      historyEntry: {
        colors: normalizeThemeColors({ ...defaultPreset.colors }),
        activePresetName: defaultPreset.name,
        settings: {
          themeName: 'My Custom Android Theme',
          cornerRadius: defaultPreset.settings?.cornerRadius ?? 16,
          bubbleTails: defaultPreset.settings?.bubbleTails ?? true,
          wallpaperType: 'color',
          wallpaperGradient: {
            angle: 135,
            color1: '#0e1621',
            color2: '#1b2838',
          },
          wallpaperBlur: 0,
          wallpaperDim: 25,
          patternOpacity: 15,
        },
      },
      savedView: 'chat',
      savedInspect: true,
      savedAdaptiveStudio: true,
    };
  };

  const initial = useRef(getInitialThemeState()).current;

  // History state for colors, settings, and preset name with Undo/Redo capability
  const {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useThemeHistory({ initialState: initial.historyEntry });

  const { colors, settings, activePresetName } = state;

  const [currentView, setCurrentView] = useState<StudioView>(initial.savedView);
  const [inspectMode, setInspectMode] = useState<boolean>(initial.savedInspect);
  const [adaptiveStudioTheme, setAdaptiveStudioTheme] = useState<boolean>(
    initial.savedAdaptiveStudio
  );
  const [extractedWallpaper, setExtractedWallpaper] = useState<{
    image: string;
    palette: ExtractedWallpaperPalette;
  } | null>(null);
  const [activeEngine, setActiveEngine] = useState<GeneratorEngine>('classic-telegram');
  const [wallpaperThemeStyle, setWallpaperThemeStyle] = useState<WallpaperThemeStyle>('tonal');
  const [selectedVariableKey, setSelectedVariableKey] = useState<string>('chat_outBubble');
  const [hoveredVariable, setHoveredVariable] = useState<{ key: string; label: string } | null>(null);
  const [selectTrigger, setSelectTrigger] = useState<number>(0);
  const [openInspectTrigger, setOpenInspectTrigger] = useState<number>(0);

  // Pending image waiting for user crop / rotate / adjust confirmation
  const [pendingImageEdit, setPendingImageEdit] = useState<{
    sourceUrl: string;
    fileName: string;
    isObjectUrl: boolean;
    defaultAutoGenerateTheme: boolean;
    isEditingExisting: boolean;
  } | null>(null);

  const pendingImageEditRef = useRef(pendingImageEdit);
  pendingImageEditRef.current = pendingImageEdit;

  useEffect(() => {
    return () => {
      if (pendingImageEditRef.current?.isObjectUrl) {
        URL.revokeObjectURL(pendingImageEditRef.current.sourceUrl);
      }
    };
  }, []);

  // Only expose extractedPalette when it strictly matches the currently active wallpaperImage
  const extractedPalette =
    extractedWallpaper &&
    settings.wallpaperImage &&
    extractedWallpaper.image === settings.wallpaperImage
      ? extractedWallpaper.palette
      : null;

  const handleExtractedPaletteChange = useCallback(
    (palette: ExtractedWallpaperPalette | null, imageUrl?: string) => {
      if (!palette) {
        setExtractedWallpaper(null);
        return;
      }
      const targetImage = imageUrl || settings.wallpaperImage;
      if (targetImage) {
        setExtractedWallpaper({ image: targetImage, palette });
      }
    },
    [settings.wallpaperImage]
  );

  // Keep extracted wallpaper palette in sync whenever wallpaperImage changes (including reload/import/undo)
  useEffect(() => {
    let cancelled = false;
    const currentImage = settings.wallpaperImage;
    if (!currentImage) {
      setExtractedWallpaper(null);
      return;
    }
    if (extractedWallpaper && extractedWallpaper.image === currentImage) {
      return;
    }
    extractWallpaperColors(currentImage)
      .then(pal => {
        if (!cancelled) {
          setExtractedWallpaper({ image: currentImage, palette: pal });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settings.wallpaperImage, extractedWallpaper]);

  // Adapt the entire web app Studio UI theme to the active wallpaper & palette
  const studioTheme = useMemo(
    () =>
      computeStudioTheme({
        colors,
        settings,
        extractedPalette,
        enabled: adaptiveStudioTheme,
      }),
    [colors, settings, extractedPalette, adaptiveStudioTheme]
  );

  useEffect(() => {
    applyStudioThemeToDocument(studioTheme.cssVars);
  }, [studioTheme]);

  // Preview feature toggles (controlled from Quick Feature Sub-bar + PhoneSimulator)
  const [previewToggles, setPreviewToggles] = useState<PreviewToggles>({
    reactions: false,
    channelMute: false,
    search: false,
    voiceBar: false,
    miniPlayer: true,
    emojiHints: false,
    optionsMenu: false,
    contextMenu: false,
    playerModal: false,
  });

  // Responsive Viewport Tier (<768 mobile, 768-1023 tablet, >=1024 desktop)
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileLayout = viewportWidth < 768;
  const isTabletLayout = viewportWidth >= 768 && viewportWidth < 1024;

  // Canvas Zoom Viewport state
  const canvasStageRef = useRef<HTMLElement | null>(null);
  const isManualZoomRef = useRef<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoomIn = useCallback(() => {
    isManualZoomRef.current = true;
    setZoomLevel(prev => Math.min(1.3, Number((prev + 0.1).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    isManualZoomRef.current = true;
    setZoomLevel(prev => Math.max(0.45, Number((prev - 0.1).toFixed(2))));
  }, []);

  const computeAutoFitZoom = useCallback((stageEl: HTMLElement) => {
    const compact = window.innerWidth < 768;
    const availableH = stageEl.clientHeight - (compact ? 74 : 88);
    const availableW = stageEl.clientWidth - (compact ? 20 : 48);
    const scaleH = availableH / 680;
    const scaleW = availableW / 360;
    const maxScale = 1.0;
    const ideal = Math.max(0.42, Math.min(maxScale, Math.min(scaleH, scaleW)));
    return Number(ideal.toFixed(2));
  }, []);

  const handleFitScreen = useCallback(() => {
    const stageEl = canvasStageRef.current;
    if (!stageEl || stageEl.clientHeight <= 0 || stageEl.clientWidth <= 0) {
      return;
    }
    isManualZoomRef.current = false;
    const compact = window.innerWidth < 768;
    const availableH = stageEl.clientHeight - (compact ? 74 : 88);
    const availableW = stageEl.clientWidth - (compact ? 20 : 48);
    const scaleH = availableH / 680;
    const scaleW = availableW / 360;
    const maxScale = compact ? 1.0 : 1.15;
    const ideal = Math.max(0.42, Math.min(maxScale, Math.min(scaleH, scaleW)));
    setZoomLevel(Number(ideal.toFixed(2)));
  }, []);

  const handleResetZoom = useCallback(() => {
    isManualZoomRef.current = false;
    setZoomLevel(1);
  }, []);

  // Reset manual zoom lock when switching between mobile/tablet/desktop layout tiers
  useEffect(() => {
    isManualZoomRef.current = false;
  }, [isMobileLayout, isTabletLayout]);

  // Auto-fit phone on mount, orientation/resize changes, and when returning to Preview tab
  useEffect(() => {
    const stageEl = canvasStageRef.current;
    if (!stageEl) return;

    const applyAutoFit = () => {
      if (isManualZoomRef.current) return;
      if (stageEl.clientWidth <= 0 || stageEl.clientHeight <= 0) return;
      setZoomLevel(computeAutoFitZoom(stageEl));
    };

    applyAutoFit();

    let prevW = stageEl.clientWidth;
    let prevH = stageEl.clientHeight;

    const observer = new ResizeObserver(() => {
      const nextW = stageEl.clientWidth;
      const nextH = stageEl.clientHeight;
      if (nextW <= 0 || nextH <= 0) return;
      if (Math.abs(nextW - prevW) > 6 || Math.abs(nextH - prevH) > 6) {
        prevW = nextW;
        prevH = nextH;
        applyAutoFit();
      }
    });

    observer.observe(stageEl);
    return () => observer.disconnect();
  }, [computeAutoFitZoom, isMobileLayout, isTabletLayout, mobileTab]);

  // Jump from mobile Quick-Inspect Bar straight to the variable's editor panel
  const handleMobileEditSelectedVariable = useCallback((key: string) => {
    setSelectedVariableKey(key);
    setSelectTrigger(prev => prev + 1);
    if (STUDIO_TOKEN_KEYS.has(key)) {
      setMobileTab('colors');
    } else {
      setOpenInspectTrigger(prev => prev + 1);
      setMobileTab('inspect');
    }
  }, []);

  // Keyboard shortcut [I] to toggle Inspect Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (pendingImageEdit) return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isEditable || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setInspectMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingImageEdit]);

  const handleTogglePreview = (key: keyof PreviewToggles) => {
    setPreviewToggles(prev => ({ ...prev, [key]: !prev[key] }));
    if (
      currentView === 'profile' &&
      (key === 'reactions' || key === 'channelMute' || key === 'voiceBar' || key === 'emojiHints')
    ) {
      setCurrentView('chat');
    }
  };

  const handleSetPreviewToggle = (key: keyof PreviewToggles, value: boolean) => {
    setPreviewToggles(prev => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const handleSelectVariable = (key: string) => {
    setSelectedVariableKey(key);
    setSelectTrigger(prev => prev + 1);
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Hidden file input for import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast notification state
  interface ToastNotification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    action?: {
      label: string;
      onClick: () => void;
    };
  }

  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Global window drag-and-drop state
  const [isWindowDragging, setIsWindowDragging] = useState<boolean>(false);
  const windowDragCounterRef = useRef<number>(0);

  // Auto-dismiss toast after 4.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Prevent default browser file open on dragover & drop
  useEffect(() => {
    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDrag);
    window.addEventListener('drop', preventDrag);
    return () => {
      window.removeEventListener('dragover', preventDrag);
      window.removeEventListener('drop', preventDrag);
    };
  }, []);

  // Auto-heal legacy or stuck variable values
  useEffect(() => {
    const healed = normalizeThemeColors(colors);
    const keysToCheck = [
      'chats_tabUnreadActiveText',
      'chats_tabUnreadUnactiveText',
      'chats_tabUnreadActiveBackground',
      'chats_tabUnreadUnactiveBackground',
      'chats_unreadCounterText',
      'chat_goDownButtonCounter',
      'chat_goToEndButtonCounterText',
      'actionBarTabUnactiveText',
      'actionBarDefaultIcon',
      'actionBarActionModeDefaultIcon',
      'actionBarDefaultSubmenuBackground',
      'actionBarDefaultSubmenuItem',
      'actionBarDefaultSubmenuItemIcon',
    ] as const;

    let hasDiff = false;
    for (const k of keysToCheck) {
      if (colors[k] !== healed[k]) {
        hasDiff = true;
        break;
      }
    }

    if (hasDiff) {
      setState(prev => ({
        ...prev,
        colors: {
          ...prev.colors,
          chats_tabUnreadActiveText: healed.chats_tabUnreadActiveText,
          chats_tabUnreadUnactiveText: healed.chats_tabUnreadUnactiveText,
          chats_tabUnreadActiveBackground: healed.chats_tabUnreadActiveBackground,
          chats_tabUnreadUnactiveBackground: healed.chats_tabUnreadUnactiveBackground,
          chats_unreadCounterText: healed.chats_unreadCounterText,
          chat_goDownButtonCounter: healed.chat_goDownButtonCounter,
          chat_goToEndButtonCounterText: healed.chat_goToEndButtonCounterText,
          actionBarTabUnactiveText: healed.actionBarTabUnactiveText,
          actionBarDefaultIcon: healed.actionBarDefaultIcon,
          actionBarActionModeDefaultIcon: healed.actionBarActionModeDefaultIcon,
          actionBarDefaultSubmenuBackground: healed.actionBarDefaultSubmenuBackground,
          actionBarDefaultSubmenuItem: healed.actionBarDefaultSubmenuItem,
          actionBarDefaultSubmenuItemIcon: healed.actionBarDefaultSubmenuItemIcon,
        },
      }));
    }
  }, []);

  // Auto-persist state to localStorage across page refreshes (debounced)
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      let settingsToSave = settings;
      if (settings.wallpaperBlob && settings.wallpaperImage?.startsWith('blob:')) {
        try {
          const dataUrl = await imageBlobToDataUrl(settings.wallpaperBlob);
          if (dataUrl && !isCancelled) {
            settingsToSave = { ...settings, wallpaperImage: dataUrl };
          }
        } catch {
          // Keep current settings if conversion fails
        }
      }

      if (!isCancelled) {
        saveThemeState({
          colors,
          settings: settingsToSave,
          activePresetName,
          currentView,
          inspectMode,
          adaptiveStudioTheme,
        });
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [colors, settings, activePresetName, currentView, inspectMode, adaptiveStudioTheme]);

  const handleColorChange = (key: string, hex: string) => {
    setState(prev => {
      const updated = { ...prev.colors, [key]: hex };
      if (key === 'chat_messagePanelAttach' && !prev.colors.chat_messagePanelIcons) {
        updated.chat_messagePanelIcons = hex;
      }
      if (key === 'chat_messagePanelIcons' && !prev.colors.chat_messagePanelAttach) {
        updated.chat_messagePanelAttach = hex;
      }
      if (
        key === 'avatar_nameInMessageGreen' ||
        key === 'chat_inForwardedNameText' ||
        key === 'chat_outForwardedNameText' ||
        key === 'chat_inForwarded' ||
        key === 'chat_outForwarded'
      ) {
        updated.avatar_nameInMessageGreen = hex;
        updated.avatar_nameInMessageViolet = hex;
        updated.avatar_nameInMessagePink = hex;
        updated.avatar_nameInMessageRed = hex;
        updated.avatar_nameInMessageOrange = hex;
        updated.avatar_nameInMessageBlue = hex;
        updated.avatar_nameInMessageCyan = hex;
        updated.avatar_nameInMessageColour = hex;
        for (let i = 0; i <= 7; i++) {
          updated[`avatar_nameInMessage${i}`] = hex;
        }
        updated.chat_inForwardedNameText = hex;
        updated.chat_outForwardedNameText = hex;
        updated.chat_inForwarded = hex;
        updated.chat_outForwarded = hex;
      }
      if (
        key === 'chats_sentReadCheck' ||
        key === 'chats_sentCheck' ||
        key === 'chat_outSentCheckRead' ||
        key === 'chat_outSentCheck'
      ) {
        updated.chats_sentReadCheck = hex;
        updated.chats_sentCheck = hex;
        updated.chat_outSentCheckRead = hex;
        updated.chat_outSentCheck = hex;
        updated.chat_outSentCheckSelected = hex;
        updated.chat_outSentCheckReadSelected = hex;
      }
      if (key === 'actionBarActionModeDefault') {
        updated.actionBarActionModeDefaultTop = hex;
      }
      if (key === 'actionBarDefault') {
        const prevHeader = (prev.colors.actionBarDefault || '#1c242d').toLowerCase();
        const prevVoiceBg = prev.colors.chat_recordedVoiceBackground?.toLowerCase();
        if (!prevVoiceBg || prevVoiceBg === prevHeader) {
          updated.chat_recordedVoiceBackground = hex;
        }
        const isDark = getLuminance(hex) < 0.55;
        if (isDark) {
          updated.chats_tabUnreadActiveText = hex;
          updated.chats_tabUnreadUnactiveText = hex;
          updated.chats_unreadCounterText = hex;
          updated.chat_goDownButtonCounter = hex;
          updated.chat_goToEndButtonCounterText = hex;
        }
      }
      if (key === 'chat_goDownButtonCounter') {
        updated.chat_goToEndButtonCounterText = hex;
      }
      if (key === 'chat_goToEndButtonCounterText') {
        updated.chat_goDownButtonCounter = hex;
      }
      return {
        ...prev,
        colors: updated,
        activePresetName: '',
      };
    });
  };

  const handleBulkColorChange = (newColors: ThemeColors, immediate = true) => {
    setState(
      prev => ({
        ...prev,
        colors: normalizeThemeColors({ ...prev.colors, ...newColors }),
        activePresetName: '',
      }),
      immediate
    );
  };

  const handleBatchColorChange = (updates: ThemeColors) => {
    setState(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...updates,
      },
      activePresetName: '',
    }));
  };

  const handleSettingsChange = (newSettings: Partial<ThemeSettings>) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  };

  const handleCopyCode = () => {
    const rawCode = serializeAttheme(colors, settings.themeName);
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openImageEditorForFile = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPendingImageEdit(prev => {
      if (prev?.isObjectUrl) {
        URL.revokeObjectURL(prev.sourceUrl);
      }
      return {
        sourceUrl: objectUrl,
        fileName: file.name,
        isObjectUrl: true,
        defaultAutoGenerateTheme: true,
        isEditingExisting: false,
      };
    });
  }, []);

  const openImageEditorForCurrentWallpaper = useCallback(() => {
    if (!settings.wallpaperImage) return;
    setPendingImageEdit(prev => {
      if (prev?.isObjectUrl) {
        URL.revokeObjectURL(prev.sourceUrl);
      }
      return {
        sourceUrl: settings.wallpaperImage!,
        fileName: `${settings.themeName || 'wallpaper'}.jpg`,
        isObjectUrl: false,
        defaultAutoGenerateTheme: false,
        isEditingExisting: true,
      };
    });
  }, [settings.wallpaperImage, settings.themeName]);

  const handleCloseImageEditor = useCallback(() => {
    setPendingImageEdit(prev => {
      if (prev?.isObjectUrl) {
        URL.revokeObjectURL(prev.sourceUrl);
      }
      return null;
    });
  }, []);

  const handleConfirmCroppedImage = async ({
    file,
    dataUrl,
    autoGenerateTheme,
  }: ImageCropResult) => {
    const wasEditingExisting = pendingImageEdit?.isEditingExisting ?? false;
    try {
      const name = file.name.replace(/\.[^/.]+$/, '');
      if (autoGenerateTheme) {
        const windowBg = colors.windowBackgroundWhite || '#0e1621';
        const windowLum = getLuminance(windowBg);
        const mode: 'dark' | 'light' | 'amoled' =
          windowLum > 0.55 ? 'light' : windowLum < 0.008 ? 'amoled' : 'dark';

        const { colors: newTheme, palette } = await autoGenerateThemeFromWallpaper(
          file,
          mode,
          activeEngine,
          wallpaperThemeStyle
        );

        setExtractedWallpaper({ image: dataUrl, palette });
        setState(
          prev => ({
            colors: normalizeThemeColors(newTheme),
            activePresetName: wasEditingExisting ? prev.activePresetName : name,
            settings: {
              ...prev.settings,
              themeName: wasEditingExisting
                ? prev.settings.themeName
                : name || prev.settings.themeName,
              wallpaperType: 'image',
              wallpaperImage: dataUrl,
              wallpaperBlob: file,
            },
          }),
          true
        );

        setCurrentView('chat');
        if (isMobileLayout) setMobileTab('preview');
        setToast({
          id: Date.now(),
          message: wasEditingExisting
            ? 'Updated cropped wallpaper & regenerated matching theme!'
            : `Imported "${file.name}" as wallpaper & generated matching theme!`,
          type: 'success',
          action: {
            label: 'Undo',
            onClick: undo,
          },
        });
      } else {
        const palette = await extractWallpaperColors(file);
        setExtractedWallpaper({ image: dataUrl, palette });
        setState(
          prev => ({
            ...prev,
            settings: {
              ...prev.settings,
              wallpaperType: 'image',
              wallpaperImage: dataUrl,
              wallpaperBlob: file,
            },
          }),
          true
        );

        setCurrentView('chat');
        if (isMobileLayout) setMobileTab('preview');
        setToast({
          id: Date.now(),
          message: wasEditingExisting
            ? 'Updated wallpaper crop & adjustments!'
            : `Applied "${file.name}" as chat wallpaper (kept current colors).`,
          type: 'success',
          action: {
            label: 'Undo',
            onClick: undo,
          },
        });
      }
      handleCloseImageEditor();
    } catch (err) {
      console.error('Failed to apply cropped image file', err);
      setToast({
        id: Date.now(),
        message: 'Failed to process image. Please try another image file.',
        type: 'error',
      });
    }
  };

  const importThemeFile = async (file: File) => {
    try {
      const result = await parseThemeFile(file);
      if (Object.keys(result.colors).length > 0) {
        let wallpaperDataUrl: string | undefined;
        if (result.wallpaperBlob) {
          try {
            wallpaperDataUrl = await imageBlobToDataUrl(result.wallpaperBlob);
          } catch {
            wallpaperDataUrl = result.wallpaperUrl;
          }
        } else if (result.wallpaperUrl) {
          wallpaperDataUrl = result.wallpaperUrl;
        }

        const name = result.themeName || file.name.replace(/\.[^/.]+$/, '');
        setState(
          prev => ({
            colors: normalizeThemeColors(result.colors),
            activePresetName: name,
            settings: {
              ...prev.settings,
              themeName: name,
              cornerRadius: result.cornerRadius ?? prev.settings.cornerRadius,
              tgxWallpaperLink: result.tgxWallpaperLink ?? prev.settings.tgxWallpaperLink,
              wallpaperType: wallpaperDataUrl ? 'image' : 'color',
              wallpaperImage: wallpaperDataUrl,
              wallpaperBlob: result.wallpaperBlob,
            },
          }),
          true
        );

        setToast({
          id: Date.now(),
          message: `Imported theme "${file.name}"!`,
          type: 'success',
          action: {
            label: 'Undo',
            onClick: undo,
          },
        });
      } else {
        throw new Error('No valid theme colors found');
      }
    } catch (err) {
      console.error('Failed to import theme file', err);
      setToast({
        id: Date.now(),
        message: 'Failed to parse theme file. Please ensure it is a valid .attheme or .tgx-theme file.',
        type: 'error',
      });
    }
  };

  const handleImportFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isImageFile(file)) {
      openImageEditorForFile(file);
    } else {
      await importThemeFile(file);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (pendingImageEdit) return;
    if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
      windowDragCounterRef.current++;
      if (windowDragCounterRef.current === 1) {
        setIsWindowDragging(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    windowDragCounterRef.current--;
    if (windowDragCounterRef.current <= 0) {
      windowDragCounterRef.current = 0;
      setIsWindowDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    windowDragCounterRef.current = 0;
    setIsWindowDragging(false);
    if (pendingImageEdit) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (isImageFile(file)) {
      openImageEditorForFile(file);
    } else if (isThemeFile(file)) {
      await importThemeFile(file);
    } else {
      setToast({
        id: Date.now(),
        message:
          'Unsupported file type. Please drop an image (.jpg, .png, .webp) or Telegram theme (.attheme, .tgx-theme).',
        type: 'error',
      });
    }
  };

  // Compute live Active Target telemetry for Quick Feature Sub-bar
  const activeTargetKey = hoveredVariable?.key || selectedVariableKey || 'chat_outBubble';
  const activeTargetHex = colors[activeTargetKey] || colors.chat_outBubble || '#2b5278';

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative h-[100dvh] w-full overflow-hidden flex flex-col bg-surface-base text-slate-200 font-sans antialiased selection:bg-brand-500/35 selection:text-white transition-colors duration-300"
    >
      {/* Full-App Adaptive Wallpaper Ambient Theme Layer */}
      {adaptiveStudioTheme && (
        <div
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-500"
          aria-hidden="true"
        >
          {settings.wallpaperType === 'image' && settings.wallpaperImage ? (
            <>
              <img
                src={settings.wallpaperImage}
                alt=""
                className="w-full h-full object-cover scale-115 transition-all duration-700"
                style={{
                  filter: 'blur(48px) saturate(1.35) brightness(0.95)',
                  opacity: studioTheme.isAmoled ? 0.32 : 0.72,
                }}
              />
              <div
                className="absolute inset-0 transition-all duration-500"
                style={{
                  backgroundColor: studioTheme.surfaceBaseHex,
                  opacity: studioTheme.scrimOpacity,
                }}
              />
            </>
          ) : settings.wallpaperType === 'gradient' ? (
            <>
              <div
                className="w-full h-full scale-110 transition-all duration-700"
                style={{
                  background: `linear-gradient(${settings.wallpaperGradient.angle}deg, ${settings.wallpaperGradient.color1}, ${settings.wallpaperGradient.color2})`,
                  filter: 'blur(42px) saturate(1.2)',
                  opacity: studioTheme.isAmoled ? 0.25 : 0.55,
                }}
              />
              <div
                className="absolute inset-0 transition-all duration-500"
                style={{
                  backgroundColor: studioTheme.surfaceBaseHex,
                  opacity: studioTheme.scrimOpacity,
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0 transition-all duration-700"
              style={{
                background: `radial-gradient(circle at 28% 22%, ${studioTheme.primaryHex}24 0%, transparent 52%), radial-gradient(circle at 74% 78%, ${studioTheme.secondaryHex}20 0%, transparent 55%)`,
              }}
            />
          )}
        </div>
      )}

      {/* Global Drag & Drop Overlay */}
      {isWindowDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="w-[90%] max-w-lg p-8 rounded-3xl bg-surface-panel/95 border-2 border-dashed border-brand-500 flex flex-col items-center text-center"
            style={{ boxShadow: '0 0 80px var(--color-brand-glow)' }}
          >
            <div
              className="w-20 h-20 rounded-3xl bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 mb-4 animate-bounce"
              style={{ boxShadow: '0 0 30px var(--color-brand-glow)' }}
            >
              <ImageIcon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Drop File to Import</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
              Sets chat wallpaper &amp; auto-generates matching Telegram color palette, or loads an existing .attheme / .tgx-theme file
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-[11px] text-brand-300 font-mono">
              <span className="px-3 py-1 rounded-full bg-surface-card border border-surface-border">
                PNG, JPG, WEBP
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-card border border-surface-border">
                .attheme, .tgx-theme &amp; .zip
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar + Context State Quick Sub-bar */}
      <Navbar
        themeName={settings.themeName}
        onThemeNameChange={themeName => handleSettingsChange({ themeName })}
        currentView={currentView}
        onViewChange={setCurrentView}
        inspectMode={inspectMode}
        onToggleInspectMode={() => setInspectMode(prev => !prev)}
        adaptiveStudioTheme={adaptiveStudioTheme}
        onToggleAdaptiveStudioTheme={() => setAdaptiveStudioTheme(prev => !prev)}
        studioMoodLabel={studioTheme.moodLabel}
        onExportClick={() => setIsExportModalOpen(true)}
        onImportClick={() => fileInputRef.current?.click()}
        onCopyClick={handleCopyCode}
        copied={copied}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        previewToggles={previewToggles}
        onTogglePreview={handleTogglePreview}
        activeTargetKey={activeTargetKey}
        activeTargetHex={activeTargetHex}
        isMobileLayout={isMobileLayout}
        showMobilePreviewControls={isMobileLayout && mobileTab === 'preview'}
      />

      {/* Hidden file input for Import CTA */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".attheme,.tgx-theme,.txt,.zip,image/*"
        onChange={handleImportFileInput}
        className="hidden"
      />

      {/* BEGIN: Main Studio Workspace (3-Column Desktop / 2-Column Tablet / Tabbed Single-Pane Mobile) */}
      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">
        {/* Column 1: Left Rail (Desktop >= 1024px, or Full-Width Colors Tab on Mobile < 768px) */}
        {isMobileLayout ? (
          <div className={mobileTab === 'colors' ? 'flex-1 min-w-0 h-full flex overflow-hidden' : 'hidden'}>
            <LeftToolRail
              variant="panel"
              colors={colors}
              settings={settings}
              selectedVariableKey={selectedVariableKey}
              selectTrigger={selectTrigger}
              onSelectVariable={handleSelectVariable}
              onSettingsChange={handleSettingsChange}
              onColorChange={handleColorChange}
              onOpenDeepInspect={() => {
                setOpenInspectTrigger(prev => prev + 1);
                setMobileTab('inspect');
              }}
            />
          </div>
        ) : (
          <LeftToolRail
            colors={colors}
            settings={settings}
            selectedVariableKey={selectedVariableKey}
            selectTrigger={selectTrigger}
            onSelectVariable={handleSelectVariable}
            onSettingsChange={handleSettingsChange}
            onColorChange={handleColorChange}
            onOpenDeepInspect={() => setOpenInspectTrigger(prev => prev + 1)}
          />
        )}

        {/* Column 2: Center Stage (Telegram Mockup Canvas + Viewport Controls) */}
        <main
          ref={canvasStageRef}
          className={`${
            isMobileLayout && mobileTab !== 'preview' ? 'hidden' : 'flex'
          } flex-1 min-w-0 flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 ${
            adaptiveStudioTheme ? 'bg-surface-base/25' : 'bg-[#0b0c10]'
          }`}
          data-purpose="telegram-phone-canvas"
        >
          {/* Ambient radial spotlight behind the phone synced to wallpaper accent */}
          {adaptiveStudioTheme && (
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-700"
              aria-hidden="true"
              style={{
                background: `radial-gradient(circle at 50% 48%, ${studioTheme.primaryHex}22 0%, ${studioTheme.secondaryHex}10 38%, transparent 72%)`,
              }}
            />
          )}

          {/* Subtle dot-grid studio backdrop */}
          <div
            className="absolute inset-0 studio-canvas-grid opacity-45 pointer-events-none"
            aria-hidden="true"
          />

          <PhoneSimulator
            colors={colors}
            settings={settings}
            currentView={currentView}
            inspectMode={inspectMode}
            selectedVariableKey={selectedVariableKey}
            onSelectVariable={handleSelectVariable}
            onHoverVariable={setHoveredVariable}
            onImportImage={openImageEditorForFile}
            previewToggles={previewToggles}
            onSetPreviewToggle={handleSetPreviewToggle}
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitScreen={handleFitScreen}
            onResetZoom={handleResetZoom}
            isMobileLayout={isMobileLayout}
            onColorChange={handleColorChange}
            onEditSelectedVariable={handleMobileEditSelectedVariable}
          />
        </main>

        {/* Column 3: Right Rail (Studio, Inspect, Raw, Export — or Mobile Studio / Inspect Tabs) */}
        <SidebarEditor
          colors={colors}
          settings={settings}
          currentView={currentView}
          onViewChange={setCurrentView}
          activeEngine={activeEngine}
          onEngineChange={setActiveEngine}
          wallpaperThemeStyle={wallpaperThemeStyle}
          onWallpaperThemeStyleChange={setWallpaperThemeStyle}
          onColorChange={handleColorChange}
          onBatchColorChange={handleBatchColorChange}
          onBulkColorChange={handleBulkColorChange}
          onSettingsChange={handleSettingsChange}
          extractedPalette={extractedPalette}
          onExtractedPaletteChange={handleExtractedPaletteChange}
          adaptiveStudioTheme={adaptiveStudioTheme}
          onToggleAdaptiveStudioTheme={() => setAdaptiveStudioTheme(prev => !prev)}
          selectedVariableKey={selectedVariableKey}
          selectTrigger={selectTrigger}
          openInspectTrigger={openInspectTrigger}
          onSelectVariable={handleSelectVariable}
          onExport={() => setIsExportModalOpen(true)}
          onImportFile={handleImportFileInput}
          onImportImageFile={openImageEditorForFile}
          onEditCurrentWallpaper={openImageEditorForCurrentWallpaper}
          onImportThemeFile={importThemeFile}
          onValidateStructure={res =>
            setToast({
              id: Date.now(),
              message: res.summary,
              type: res.valid ? 'success' : 'error',
            })
          }
          mobileMode={
            isMobileLayout
              ? mobileTab === 'studio'
                ? 'studio'
                : 'tools'
              : null
          }
          isTabletLayout={isTabletLayout}
          className={
            isMobileLayout && mobileTab !== 'studio' && mobileTab !== 'inspect'
              ? 'hidden'
              : ''
          }
        />
      </div>
      {/* END: Main Studio Workspace */}

      {/* Mobile Bottom Navigation Dock (< 768px) */}
      {isMobileLayout && (
        <MobileBottomNav activeTab={mobileTab} onTabChange={setMobileTab} />
      )}

      {/* Image Crop, Rotate & Adjust Modal */}
      <ImageCropModal
        isOpen={Boolean(pendingImageEdit)}
        sourceUrl={pendingImageEdit?.sourceUrl ?? null}
        fileName={pendingImageEdit?.fileName ?? 'wallpaper.jpg'}
        defaultAutoGenerateTheme={pendingImageEdit?.defaultAutoGenerateTheme ?? true}
        isEditingExisting={pendingImageEdit?.isEditingExisting ?? false}
        onCancel={handleCloseImageEditor}
        onConfirm={handleConfirmCroppedImage}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        colors={colors}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-[72px] left-3 right-3 md:bottom-6 md:left-auto md:right-6 z-50 flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-surface-panel/95 border border-surface-border backdrop-blur-xl text-xs text-slate-200 animate-fade-in"
          style={{
            boxShadow: '0 12px 40px rgba(0,0,0,0.85), 0 0 24px var(--color-brand-glow)',
          }}
        >
          {toast.type === 'success' && (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
          <span className="font-medium flex-1 md:flex-initial md:max-w-[380px] leading-snug">
            {toast.message}
          </span>
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="ml-1 px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Undo2 className="w-3 h-3" />
              <span>{toast.action.label}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition ml-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
