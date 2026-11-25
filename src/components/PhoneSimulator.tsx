import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  MoreVertical,
  Search,
  Paperclip,
  Smile,
  Send,
  Mic,
  CheckCheck,
  Check,
  Play,
  Pause,
  ChevronDown,
  X,
  Menu,
  Edit3,
  Bookmark,
  Wifi,
  Signal,
  Battery,
  BellOff,
  Trash2,
  Eraser,
  Palette,
  Reply,
  Copy,
  Forward,
  Pin,
  Video,
  Volume2,
  FileText,
  Archive,
  Folder,
  VolumeX,
  CornerUpRight,
  MessageCircle,
  Image as ImageIcon,
  Music,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Phone,
  Bell,
  AtSign,
  QrCode,
  Shield,
  Link2,
  Minus,
  Plus,
} from 'lucide-react';
import type { ThemeColors, ThemeSettings, ChatMessage, StudioView, PreviewToggles } from '../types/theme';
import { toCssColor, extractAlphaPercent, setHexAlpha, getBaseRgbHex, getLuminance, blend, getThemeDarkBase, resolveBadgeTextColor, getContrastRatio, adjustBrightness } from '../utils/colorUtils';
import { isImageFile } from '../utils/fileUtils';

interface PhoneSimulatorProps {
  colors: ThemeColors;
  settings: ThemeSettings;
  currentView: StudioView;
  inspectMode: boolean;
  selectedVariableKey?: string;
  onSelectVariable: (key: string) => void;
  onHoverVariable?: (info: { key: string; label: string } | null) => void;
  onImportImage?: (file: File) => void;
  previewToggles: PreviewToggles;
  onSetPreviewToggle: (key: keyof PreviewToggles, value: boolean) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onResetZoom: () => void;
  isMobileLayout?: boolean;
  onColorChange?: (key: string, hex: string) => void;
  onEditSelectedVariable?: (key: string) => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  colors,
  settings,
  currentView,
  inspectMode,
  selectedVariableKey,
  onSelectVariable,
  onHoverVariable,
  onImportImage,
  previewToggles,
  onSetPreviewToggle,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onResetZoom,
  isMobileLayout = false,
  onColorChange,
  onEditSelectedVariable,
}) => {
  const [isPlayingOutVoice, setIsPlayingOutVoice] = useState(false);
  const [isPlayingInVoice, setIsPlayingInVoice] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ key: string; label: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isChatSelectionMode, setIsChatSelectionMode] = useState(false);
  const [activeFolderTab, setActiveFolderTab] = useState<'all' | 'personal' | 'anime'>('all');
  const [searchQuery, setSearchQuery] = useState('Study');
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [profileNotificationsOn, setProfileNotificationsOn] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState<'media' | 'files' | 'links' | 'music'>('media');

  // Bind preview toggle state to parent-controlled Quick Feature Bar
  const showOptionsMenu = previewToggles.optionsMenu;
  const setShowOptionsMenu = (val: boolean) => onSetPreviewToggle('optionsMenu', val);
  const showMessageContextMenu = previewToggles.contextMenu;
  const setShowMessageContextMenu = (val: boolean) => onSetPreviewToggle('contextMenu', val);
  const showRecordingUI = previewToggles.voiceBar;
  const isSearchOpen = previewToggles.search;
  const setIsSearchOpen = (val: boolean) => onSetPreviewToggle('search', val);
  const showMiniPlayer = previewToggles.miniPlayer;
  const setShowMiniPlayer = (val: boolean) => onSetPreviewToggle('miniPlayer', val);
  const showAudioPlayerModal = previewToggles.playerModal;
  const setShowAudioPlayerModal = (val: boolean) => onSetPreviewToggle('playerModal', val);
  const showEmojiHints = previewToggles.emojiHints;
  const setShowEmojiHints = (val: boolean) => onSetPreviewToggle('emojiHints', val);
  const showReactionPicker = previewToggles.reactions;
  const isChannelMode = previewToggles.channelMute;

  // Drag and drop image onto phone simulator
  const [isPhoneDragging, setIsPhoneDragging] = useState(false);
  const phoneDragCounterRef = useRef(0);

  const handlePhoneDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
      phoneDragCounterRef.current++;
      if (phoneDragCounterRef.current === 1) {
        setIsPhoneDragging(true);
      }
    }
  };

  const handlePhoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    phoneDragCounterRef.current--;
    if (phoneDragCounterRef.current <= 0) {
      phoneDragCounterRef.current = 0;
      setIsPhoneDragging(false);
    }
  };

  const handlePhoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handlePhoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    phoneDragCounterRef.current = 0;
    setIsPhoneDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && onImportImage && isImageFile(file)) {
      onImportImage(file);
    }
  };

  // Handle pointer move / drag across phone screen to detect inspectable element in real-time (desktop mouse/pen only)
  const handleScreenPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!inspectMode || isMobileLayout || e.pointerType === 'touch') return;
    setMousePos({ x: e.clientX, y: e.clientY });

    const target = (e.target as HTMLElement)?.closest('[data-inspect]');
    if (target) {
      const key = target.getAttribute('data-inspect');
      const label = target.getAttribute('data-label') || key;
      if (key && (hoveredKey !== key || hoveredInfo?.key !== key)) {
        const nextInfo = { key, label: label || key };
        setHoveredKey(key);
        setHoveredInfo(nextInfo);
        onHoverVariable?.(nextInfo);
      }
    } else if (!target && hoveredKey) {
      setHoveredKey(null);
      setHoveredInfo(null);
      onHoverVariable?.(null);
    }
  };

  const handleScreenPointerLeave = () => {
    setHoveredKey(null);
    setHoveredInfo(null);
    onHoverVariable?.(null);
  };

  // Modern Telegram UI States
  const [isRoundVideoMode, setIsRoundVideoMode] = useState(false); // mic vs round video note
  const [isChannelMuted, setIsChannelMuted] = useState(false);
  const [inReactions, setInReactions] = useState<{ emoji: string; count: number }[]>([
    { emoji: '❤️', count: 4 },
    { emoji: '🔥', count: 2 },
  ]);
  const [outReactions, setOutReactions] = useState<{ emoji: string; count: number }[]>([
    { emoji: '👍', count: 1 },
  ]);

  // Dynamic test messages that users can add to
  const [extraMessages, setExtraMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'out',
      text: typedMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
    };
    setExtraMessages(prev => [...prev, newMsg]);
    setTypedMessage('');
  };

  // Active temporary inspect highlight and popup down toast (auto-disappears after short period)
  const [activeInspectKey, setActiveInspectKey] = useState<string | null>(null);
  const [inspectToast, setInspectToast] = useState<{ key: string; label?: string; hex?: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerInspectPopup = (key: string, label?: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setActiveInspectKey(key);
    setInspectToast({
      key,
      label: label || key,
      hex: colors[key] || '#5E6AD2',
    });

    // Auto-disappear after short period (2.4 seconds)
    toastTimerRef.current = setTimeout(() => {
      setActiveInspectKey(null);
      setInspectToast(null);
    }, 2400);
  };

  useEffect(() => {
    if (selectedVariableKey && inspectMode) {
      triggerInspectPopup(selectedVariableKey);
    }
    if (
      selectedVariableKey === 'actionBarDefaultSearch' ||
      selectedVariableKey === 'actionBarDefaultSearchPlaceholder' ||
      selectedVariableKey === 'graySection' ||
      selectedVariableKey === 'key_graySectionText' ||
      selectedVariableKey === 'graySectionText' ||
      selectedVariableKey === 'windowBackgroundWhiteGrayText2'
    ) {
      setIsSearchOpen(true);
    }
    if (selectedVariableKey?.startsWith('inappPlayer')) {
      setShowMiniPlayer(true);
    }
    if (selectedVariableKey?.startsWith('player_')) {
      setShowAudioPlayerModal(true);
    }
    if (
      selectedVariableKey === 'chat_stickersHintPanel' ||
      selectedVariableKey?.startsWith('chat_emojiPanel')
    ) {
      setShowEmojiHints(true);
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [selectedVariableKey]);

  // Inspect helper wrapper with prominent glowing highlight and hover/drag awareness
  const inspectable = (key: string, label?: string) => {
    const isTemporarilyHighlighted = activeInspectKey === key || selectedVariableKey === key;
    const isHovered = hoveredKey === key;
    const resolvedLabel = label || key;

    return {
      onClick: (e: React.MouseEvent) => {
        if (inspectMode) {
          e.stopPropagation();
          onSelectVariable(key);
          triggerInspectPopup(key, resolvedLabel);
        }
      },
      onMouseEnter: (e: React.MouseEvent) => {
        if (inspectMode) {
          e.stopPropagation();
          setHoveredKey(key);
          const nextInfo = { key, label: resolvedLabel };
          setHoveredInfo(nextInfo);
          onHoverVariable?.(nextInfo);
        }
      },
      onMouseLeave: (e: React.MouseEvent) => {
        if (inspectMode) {
          e.stopPropagation();
          setHoveredKey(prev => prev === key ? null : prev);
          setHoveredInfo(prev => {
            const next = prev?.key === key ? null : prev;
            if (!next) onHoverVariable?.(null);
            return next;
          });
        }
      },
      className: `relative transition-all duration-150 ${
        inspectMode ? 'cursor-pointer select-none' : ''
      } ${
        isTemporarilyHighlighted
          ? 'ring-2 ring-brand-400/80 ring-offset-1 ring-offset-black/60 shadow-[0_0_20px_rgba(42,171,238,0.65)] z-40'
          : isHovered && inspectMode
          ? 'outline outline-2 outline-brand-400 ring-2 ring-brand-500/60 shadow-[0_0_16px_rgba(56,189,248,0.7)] z-30'
          : ''
      }`,
      'data-inspect': key,
      'data-label': resolvedLabel,
    };
  };

  // Compute wallpaper style (applied to dedicated background layer so blur never blurs chat messages)
  const getWallpaperStyle = (): React.CSSProperties => {
    const blurFilter = settings.wallpaperBlur > 0 ? `blur(${settings.wallpaperBlur}px)` : undefined;
    if (settings.wallpaperType === 'image' && settings.wallpaperImage) {
      return {
        backgroundImage: `url(${settings.wallpaperImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: blurFilter,
        transform: settings.wallpaperBlur > 0 ? 'scale(1.06)' : undefined,
      };
    }
    if (settings.wallpaperType === 'gradient') {
      return {
        background: `linear-gradient(${settings.wallpaperGradient.angle}deg, ${settings.wallpaperGradient.color1}, ${settings.wallpaperGradient.color2})`,
        filter: blurFilter,
      };
    }
    return {
      backgroundColor: toCssColor(colors.chat_wallpaper || '#0e1621'),
      filter: blurFilter,
    };
  };

  const bubbleRadius = `${settings.cornerRadius}px`;

  // Theme accent and header luminance resolution
  const headerBg = colors.actionBarDefault || '#1c242d';
  const isHeaderLight = getLuminance(headerBg) > 0.58;
  const isDarkMode = !isHeaderLight;
  const tabAccent = colors.actionBarTabActiveText || colors.chats_unreadCounter || colors.chat_messagePanelSend || '#a855f7';
  const themeAccent = tabAccent;

  // Action bar icons resolution: In light mode, icons adapt to the theme accent (never dark charcoal or invisible white)
  const targetThemeHeaderIcon = getContrastRatio(headerBg, themeAccent) >= 2.8
    ? themeAccent
    : adjustBrightness(themeAccent, -28);

  let resolvedActionBarIcon = colors.actionBarDefaultIcon;
  if (
    !resolvedActionBarIcon ||
    (isHeaderLight && (
      resolvedActionBarIcon === '#212529' ||
      resolvedActionBarIcon === '#1c1c1e' ||
      resolvedActionBarIcon === '#111827' ||
      resolvedActionBarIcon === '#000000' ||
      resolvedActionBarIcon === '#7f93a5' ||
      getLuminance(resolvedActionBarIcon) > 0.8
    ))
  ) {
    resolvedActionBarIcon = isHeaderLight ? targetThemeHeaderIcon : '#ffffff';
  }

  // Action mode bar resolution (multi-select top bar)
  const actionModeBg = colors.actionBarActionModeDefault || headerBg;
  const isActionModeLight = getLuminance(actionModeBg) > 0.58;
  const targetActionModeIcon = getContrastRatio(actionModeBg, themeAccent) >= 2.8
    ? themeAccent
    : adjustBrightness(themeAccent, -28);

  let resolvedActionModeIcon = colors.actionBarActionModeDefaultIcon;
  if (
    !resolvedActionModeIcon ||
    (isActionModeLight && (
      resolvedActionModeIcon === '#1c1c1e' ||
      resolvedActionModeIcon === '#212529' ||
      resolvedActionModeIcon === '#111827' ||
      resolvedActionModeIcon === '#000000' ||
      getLuminance(resolvedActionModeIcon) > 0.8
    ))
  ) {
    resolvedActionModeIcon = isActionModeLight
      ? targetActionModeIcon
      : (getContrastRatio(actionModeBg, themeAccent) >= 3.0 ? themeAccent : '#ffffff');
  }

  // Dropdown options menu (3-dots menu card & items) resolution
  const resolvedSubmenuBg = colors.actionBarDefaultSubmenuBackground || (isHeaderLight ? (colors.windowBackgroundWhite || '#ffffff') : (colors.actionBarDefault || '#1c242d'));
  const isSubmenuLight = getLuminance(resolvedSubmenuBg) > 0.58;
  const resolvedSubmenuItemText = colors.actionBarDefaultSubmenuItem && getContrastRatio(resolvedSubmenuBg, colors.actionBarDefaultSubmenuItem) >= 3.0
    ? colors.actionBarDefaultSubmenuItem
    : (isSubmenuLight ? (colors.windowBackgroundWhiteBlackText || '#111827') : '#ffffff');

  const targetSubmenuIcon = getContrastRatio(resolvedSubmenuBg, themeAccent) >= 2.8
    ? themeAccent
    : adjustBrightness(themeAccent, -28);

  let resolvedSubmenuItemIcon = colors.actionBarDefaultSubmenuItemIcon;
  if (
    !resolvedSubmenuItemIcon ||
    resolvedSubmenuItemIcon === '#7f93a5' ||
    resolvedSubmenuItemIcon === '#52606d' ||
    resolvedSubmenuItemIcon === '#708291' ||
    resolvedSubmenuItemIcon === '#8a8a8a' ||
    resolvedSubmenuItemIcon === '#212529' ||
    resolvedSubmenuItemIcon === '#1c1c1e' ||
    resolvedSubmenuItemIcon === '#111827' ||
    (isSubmenuLight && getLuminance(resolvedSubmenuItemIcon) > 0.82)
  ) {
    resolvedSubmenuItemIcon = targetSubmenuIcon;
  }

  // Action bar search field resolution (e.g. typed text "Hello" & placeholder hint)
  const isDarkActionBar = getLuminance(headerBg) < 0.55;
  const resolvedSearchText = colors.actionBarDefaultSearch && (!isDarkActionBar || getContrastRatio(headerBg, colors.actionBarDefaultSearch) >= 2.8)
    ? colors.actionBarDefaultSearch
    : (isDarkActionBar ? (colors.actionBarDefaultTitle || '#ffffff') : (colors.actionBarDefaultTitle || colors.windowBackgroundWhiteBlackText || '#111827'));
  const resolvedSearchPlaceholder = colors.actionBarDefaultSearchPlaceholder || (isDarkActionBar ? blend(resolvedSearchText, headerBg, 0.45) : (colors.actionBarDefaultSubtitle || blend(resolvedSearchText, headerBg, 0.5) || '#7f93a5'));

  // Section Headers & Search Result Bars resolution (PREVENTS DEFAULT GLARING WHITE BARS IN SEARCH RESULTS)
  const canvasBg = colors.windowBackgroundWhite || colors.windowBackgroundGray || colors.chat_wallpaper || '#17212b';
  const isDarkCanvas = getLuminance(canvasBg) < 0.5;
  const resolvedGraySection = colors.graySection && (!isDarkCanvas || getLuminance(colors.graySection) <= 0.55)
    ? colors.graySection
    : (isDarkCanvas ? (colors.windowBackgroundGray ? adjustBrightness(colors.windowBackgroundGray, 5) : '#131b24') : '#f0f2f5');
  const resolvedGraySectionText = colors.key_graySectionText || colors.graySectionText || colors.windowBackgroundWhiteGrayText2 || (getLuminance(resolvedGraySection) < 0.5 ? '#7f93a5' : '#708291');
  const resolvedSectionBlueHeader = colors.windowBackgroundWhiteBlueHeader || colors.chats_unreadCounter || colors.actionBarDefaultTitle || '#4ea4f5';

  // Folder tab colors resolution with adaptive luminance & contrast
  const themeDark = getThemeDarkBase(colors);
  const headerTitle = colors.actionBarDefaultTitle && getLuminance(colors.actionBarDefaultTitle) < 0.5
    ? colors.actionBarDefaultTitle
    : (isHeaderLight ? themeDark : '#ffffff');

  const adaptiveTabUnactiveText = colors.actionBarTabUnactiveText && colors.actionBarTabUnactiveText !== '#7f93a5' && colors.actionBarTabUnactiveText !== '#708291'
    ? colors.actionBarTabUnactiveText
    : (isHeaderLight ? blend(themeDark, headerBg, 0.45) : blend(headerTitle, tabAccent, 0.2));

  const tabActiveBadgeBg = colors.chats_tabUnreadActiveBackground || tabAccent;
  const resolvedTabActiveBadgeText = resolveBadgeTextColor(
    tabActiveBadgeBg,
    colors.chats_tabUnreadActiveText,
    themeDark,
    isDarkMode
  );

  // Inactive badge background: adapt to theme accent with contrast against themeDark
  let tabUnactiveBadgeBg = colors.chats_tabUnreadUnactiveBackground;
  if (!tabUnactiveBadgeBg ||
      tabUnactiveBadgeBg === 'rgba(255,255,255,0.18)' ||
      tabUnactiveBadgeBg === '#283645' ||
      tabUnactiveBadgeBg === blend('#ffffff', headerBg, 0.18) ||
      tabUnactiveBadgeBg === blend(tabAccent, headerBg, 0.22) ||
      (isDarkMode && getContrastRatio(tabUnactiveBadgeBg, themeDark) < 3.0)) {
    tabUnactiveBadgeBg = isHeaderLight
      ? blend(tabAccent, headerBg, 0.14)
      : blend(tabAccent, '#ffffff', 0.25);
  }

  const resolvedTabUnactiveBadgeText = resolveBadgeTextColor(
    tabUnactiveBadgeBg,
    colors.chats_tabUnreadUnactiveText,
    themeDark,
    isDarkMode
  );

  // Unread Counter Badge Text (Home Screen Chat List)
  const resolvedUnreadCounterText = resolveBadgeTextColor(
    colors.chats_unreadCounter || tabAccent,
    colors.chats_unreadCounterText,
    themeDark,
    isDarkMode
  );

  // Scroll to Bottom Floating Badge Text (Chat Screen)
  const resolvedGoDownCounterText = resolveBadgeTextColor(
    colors.chat_goDownButtonCounterBackground || colors.chat_goToEndButtonCounter || tabAccent,
    colors.chat_goDownButtonCounter || colors.chat_goToEndButtonCounterText,
    themeDark,
    isDarkMode
  );

  // In-App Mini Music Player Bar Colors
  const miniPlayerBaseBg = colors.inappPlayerBackground || (isDarkCanvas ? (colors.surfaceVariant ? adjustBrightness(colors.surfaceVariant, 4) : (colors.actionBarDefault || '#18222d')) : '#edf2f7');
  const isDarkMiniPlayer = getLuminance(miniPlayerBaseBg) < 0.5;
  const resolvedInappPlayerBg = miniPlayerBaseBg;
  const resolvedInappPlayerTitle = colors.inappPlayerTitle && (!isDarkMiniPlayer || getLuminance(colors.inappPlayerTitle) >= 0.4)
    ? colors.inappPlayerTitle
    : (isDarkMiniPlayer ? (colors.actionBarDefaultTitle || '#ffffff') : (colors.windowBackgroundWhiteBlackText || '#1c242d'));
  const resolvedInappPlayerPerformer = colors.inappPlayerPerformer && (!isDarkMiniPlayer || getLuminance(colors.inappPlayerPerformer) >= 0.3)
    ? colors.inappPlayerPerformer
    : (isDarkMiniPlayer ? (colors.actionBarDefaultSubtitle || colors.windowBackgroundWhiteGrayText || '#7f93a5') : '#708291');
  const resolvedInappPlayerPlayPause = colors.inappPlayerPlayPause || themeAccent;
  const resolvedInappPlayerClose = colors.inappPlayerClose || (isDarkMiniPlayer ? (colors.actionBarDefaultIcon || '#ffffff') : '#52606d');

  // Full Audio Player Card / Bottom Sheet Colors
  const resolvedPlayerBg = colors.player_background && (!isDarkCanvas || getLuminance(colors.player_background) <= 0.6)
    ? colors.player_background
    : (isDarkCanvas ? (colors.surfaceVariant || colors.dialogBackground || colors.windowBackgroundWhite || '#17212b') : '#ffffff');
  const isDarkPlayer = getLuminance(resolvedPlayerBg) < 0.5;
  const resolvedPlayerActionBar = colors.player_actionBar || resolvedPlayerBg;
  const resolvedPlayerActionBarTitle = colors.player_actionBarTitle || (isDarkPlayer ? (colors.actionBarDefaultTitle || '#ffffff') : '#1c242d');
  const resolvedPlayerActionBarSubtitle = colors.player_actionBarSubtitle || (isDarkPlayer ? (colors.actionBarDefaultSubtitle || '#7f93a5') : '#708291');
  const resolvedPlayerActionBarItems = colors.player_actionBarItems || (isDarkPlayer ? '#ffffff' : '#52606d');
  const resolvedPlayerProgress = colors.player_progress || themeAccent;
  const resolvedPlayerProgressBg = colors.player_progressBackground || (isDarkPlayer ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)');
  const resolvedPlayerTime = colors.player_time || (isDarkPlayer ? '#7f93a5' : '#708291');
  const resolvedPlayerButton = colors.player_button || (isDarkPlayer ? '#ffffff' : '#1c242d');
  const resolvedPlayerButtonActive = colors.player_buttonActive || themeAccent;
  const resolvedPlayerPlaceholder = colors.player_placeholder || themeAccent;
  const resolvedPlayerPlaceholderBg = colors.player_placeholderBackground || (isDarkPlayer ? (resolvedPlayerBg ? adjustBrightness(resolvedPlayerBg, -6) : '#121922') : '#f4f4f4');

  // Floating Emoji Suggestion Speech-Bubble Tooltip
  const resolvedStickersHintPanel = colors.chat_stickersHintPanel && (!isDarkCanvas || getLuminance(colors.chat_stickersHintPanel) <= 0.6)
    ? colors.chat_stickersHintPanel
    : (isDarkCanvas ? (colors.surfaceVariant ? adjustBrightness(colors.surfaceVariant, 8) : '#202b36') : '#ffffff');

  const selectedHex = selectedVariableKey ? colors[selectedVariableKey] || '#2AABEE' : '#2AABEE';
  const selectedBaseHex = getBaseRgbHex(selectedHex);
  const selectedAlpha = extractAlphaPercent(selectedHex);

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${
        isMobileLayout ? 'px-2 pt-2 pb-[62px]' : 'p-4 pb-16'
      }`}
    >
      {/* Floating Inspect Popup Down (Desktop/Tablet only; Mobile uses dedicated Quick-Inspect Bar) */}
      {!isMobileLayout && inspectToast && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface-panel/95 border border-brand-500/45 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(42,171,238,0.25)] backdrop-blur-xl text-xs text-slate-200 max-w-[calc(100vw-24px)]">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 text-[11px] shrink-0">Selected:</span>
              <span className="font-mono font-semibold text-white bg-brand-500/20 px-2 py-0.5 rounded border border-brand-500/35 text-[11px] truncate max-w-[200px]">
                {inspectToast.key}
              </span>
            </div>

            {inspectToast.hex && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-surface-border shrink-0">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/25 shadow-xs flex-shrink-0"
                  style={{ backgroundColor: toCssColor(inspectToast.hex) }}
                />
                <span className="font-mono text-[11px] text-brand-400 uppercase">
                  {inspectToast.hex}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Live Hover Tooltip (Desktop hover only — hidden on touch/mobile) */}
      {!isMobileLayout && hoveredInfo && inspectMode && (
        <div
          className="fixed z-[100] pointer-events-none transition-transform duration-75 ease-out select-none"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y - 14}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-base/95 border border-brand-400/60 shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_22px_rgba(42,171,238,0.35)] backdrop-blur-xl text-white">
            <span
              className="w-4 h-4 rounded-full border border-white/40 shadow-xs flex-shrink-0"
              style={{ backgroundColor: toCssColor(colors[hoveredInfo.key] || '#2AABEE') }}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-xs truncate max-w-[190px]">
                  {hoveredInfo.label}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-400/35">
                  Click to edit
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                <span className="text-brand-300 font-medium truncate max-w-[155px]">{hoveredInfo.key}</span>
                {colors[hoveredInfo.key] && (
                  <span className="text-white/90 uppercase font-semibold">
                    {colors[hoveredInfo.key]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Android Device Outer Chassis with Smooth Zoom Transform */}
      <div
        onDragEnter={handlePhoneDragEnter}
        onDragOver={handlePhoneDragOver}
        onDragLeave={handlePhoneDragLeave}
        onDrop={handlePhoneDrop}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
        className={`relative w-[360px] h-[680px] rounded-[42px] bg-black p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.12)] ring-1 flex flex-col z-10 transition-transform duration-200 shrink-0 ${
          isPhoneDragging
            ? 'ring-brand-500 shadow-[0_0_60px_rgba(42,171,238,0.5)]'
            : 'ring-white/10'
        }`}
      >
        {/* Physical Bezel Elements: Speaker Slot & Punch Hole Camera */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-1 bg-neutral-800 rounded-full z-50 pointer-events-none" />
        <div className="absolute top-5.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-black ring-1 ring-white/10 z-50 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-950" />
        </div>

        {/* Screen Bezel Container with Pointer Move Drag Detection */}
        <div
          onPointerMove={handleScreenPointerMove}
          onPointerLeave={handleScreenPointerLeave}
          className="relative w-full h-full rounded-[32px] overflow-hidden flex flex-col bg-black shadow-inner"
        >
          {/* Drop Image Overlay Inside Phone */}
          {isPhoneDragging && (
            <div className="absolute inset-0 z-50 rounded-[32px] bg-surface-base/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-brand-500 animate-fade-in pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 mb-3 shadow-[0_0_30px_rgba(42,171,238,0.4)] animate-bounce">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-base font-semibold text-white tracking-tight">Drop Image Here</p>
              <p className="text-xs text-sky-200/90 mt-1 max-w-[200px] leading-relaxed">
                Set as chat wallpaper & auto-generate matching palette
              </p>
              <div className="mt-3 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-white/70 font-mono">
                PNG • JPG • WEBP
              </div>
            </div>
          )}
          {/* ================= STATUS BAR ================= */}
          <div
            className="w-full h-7 px-6 flex items-center justify-between text-[11px] font-semibold text-white/90 z-40 select-none"
            style={{
              backgroundColor: toCssColor(colors.actionBarDefault || '#1c242d'),
            }}
          >
            <span>12:45</span>
            <div className="flex items-center gap-2">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px]">94%</span>
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* ================= VIEW: CHAT SCREEN ================= */}
          {currentView === 'chat' && (
            <div className="relative flex-1 flex flex-col overflow-hidden">
              {/* TOP ACTION BAR */}
              <div
                {...inspectable('actionBarDefault', 'Action Bar Background')}
                className="w-full h-14 px-3 flex items-center justify-between shadow-md z-30"
                style={{ backgroundColor: toCssColor(colors.actionBarDefault || '#1c242d') }}
              >
                {isSearchOpen ? (
                  <div className="w-full flex items-center gap-2 animate-fade-in">
                    <button
                      {...inspectable('actionBarDefaultIcon', 'Search Bar Back Arrow')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('actionBarDefaultIcon');
                        } else {
                          setIsSearchOpen(false);
                        }
                      }}
                      className="p-1 rounded-full hover:bg-white/10 transition flex-shrink-0"
                      title="Exit Search"
                    >
                      <ArrowLeft
                        className="w-5 h-5"
                        style={{ color: toCssColor(resolvedActionBarIcon) }}
                      />
                    </button>

                    {/* Search Input Box / Pill matching Telegram Android */}
                    <div className="flex-1 min-w-0 flex items-center px-3 py-1.5 rounded-full bg-black/20 border border-white/10 shadow-inner">
                      <style>{`
                        .search-input-field::placeholder {
                          color: ${toCssColor(resolvedSearchPlaceholder)};
                          opacity: 0.85;
                        }
                      `}</style>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search in chat..."
                        {...(searchQuery
                          ? inspectable('actionBarDefaultSearch', 'Search Typed Text (actionBarDefaultSearch)')
                          : inspectable('actionBarDefaultSearchPlaceholder', 'Search Placeholder Hint (actionBarDefaultSearchPlaceholder)'))}
                        className="search-input-field w-full bg-transparent outline-none text-sm font-medium tracking-wide"
                        style={{
                          color: toCssColor(resolvedSearchText),
                          caretColor: toCssColor(resolvedSearchText),
                        }}
                      />
                    </div>

                    <button
                      {...inspectable('actionBarDefaultIcon', 'Clear/Close Search Button (X)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('actionBarDefaultIcon');
                        } else {
                          if (searchQuery) {
                            setSearchQuery('');
                          } else {
                            setIsSearchOpen(false);
                          }
                        }
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 transition flex-shrink-0"
                      title="Clear or Close Search"
                    >
                      <X
                        className="w-4 h-4"
                        style={{ color: toCssColor(resolvedActionBarIcon) }}
                      />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        {...inspectable('actionBarDefaultIcon', 'Action Bar Back Icon')}
                        className="p-1 rounded-full hover:bg-white/10 transition"
                      >
                        <ArrowLeft
                          className="w-5 h-5"
                          style={{ color: toCssColor(resolvedActionBarIcon) }}
                        />
                      </button>

                      {/* Contact Avatar with Online Indicator */}
                      <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                        <span>NS</span>
                        <span
                          {...inspectable('chats_onlineCircle', 'Online Indicator')}
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 shadow-xs"
                          style={{ backgroundColor: toCssColor(colors.chats_onlineCircle || '#10b981') }}
                        />
                      </div>

                      {/* Header Title & Subtitle */}
                      <div className="min-w-0 leading-tight">
                        <h3
                          {...inspectable('actionBarDefaultTitle', 'Header Title')}
                          className="font-bold text-sm truncate"
                          style={{ color: toCssColor(colors.actionBarDefaultTitle || (isHeaderLight ? '#212529' : '#ffffff')) }}
                        >
                          Nakano Study Group
                        </h3>
                        <p
                          {...inspectable('actionBarDefaultSubtitle', 'Header Subtitle')}
                          className="text-xs truncate font-medium"
                          style={{ color: toCssColor(colors.actionBarDefaultSubtitle || (isHeaderLight ? '#52606d' : '#7f93a5')) }}
                        >
                          6 members, 5 online
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 relative">
                      <button
                        {...inspectable('actionBarDefaultIcon', 'Search Icon')}
                        onClick={(e) => {
                          if (inspectMode) {
                            e.stopPropagation();
                            onSelectVariable('actionBarDefaultIcon');
                          } else {
                            setIsSearchOpen(true);
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 transition"
                        title="Search in chat"
                      >
                        <Search
                          className="w-4 h-4"
                          style={{ color: toCssColor(resolvedActionBarIcon) }}
                        />
                      </button>
                      <button
                        {...inspectable('actionBarDefaultIcon', 'Menu 3-Dots')}
                        onClick={(e) => {
                          if (inspectMode) {
                            e.stopPropagation();
                            onSelectVariable('actionBarDefaultIcon');
                          } else {
                            setShowOptionsMenu(!showOptionsMenu);
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 transition"
                        title="3-Dots Options Menu"
                      >
                        <MoreVertical
                          className="w-4 h-4"
                          style={{ color: toCssColor(resolvedActionBarIcon) }}
                        />
                      </button>

                      {/* TELEGRAM ANDROID DROPDOWN OPTIONS MENU */}
                      {showOptionsMenu && (
                        <div
                          {...inspectable('actionBarDefaultSubmenuBackground', 'Dropdown Menu Card')}
                          className="absolute top-10 right-0 w-48 rounded-2xl shadow-2xl border border-white/10 p-1.5 z-50 animate-scale-in"
                          style={{
                            backgroundColor: toCssColor(resolvedSubmenuBg),
                          }}
                        >
                          {[
                            { icon: BellOff, label: 'Mute notifications' },
                            { icon: Search, label: 'Search in chat' },
                            { icon: Eraser, label: 'Clear history' },
                            { icon: Palette, label: 'Change wallpaper' },
                            { icon: Trash2, label: 'Delete chat', isDanger: true },
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                if (inspectMode) {
                                  e.stopPropagation();
                                  onSelectVariable('actionBarDefaultSubmenuItem');
                                } else {
                                  setShowOptionsMenu(false);
                                  if (item.label === 'Search in chat') {
                                    setIsSearchOpen(true);
                                  }
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium hover:bg-white/10 transition text-left"
                            >
                              <item.icon
                                {...inspectable('actionBarDefaultSubmenuItemIcon', 'Dropdown Item Icon')}
                                className="w-4 h-4 flex-shrink-0"
                                style={{
                                  color: item.isDanger
                                    ? '#ef4444'
                                    : toCssColor(resolvedSubmenuItemIcon),
                                }}
                              />
                              <span
                                {...inspectable('actionBarDefaultSubmenuItem', 'Dropdown Item Text')}
                                className="truncate"
                                style={{
                                  color: item.isDanger
                                    ? '#ef4444'
                                    : toCssColor(resolvedSubmenuItemText),
                                }}
                              >
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* PINNED MESSAGE BANNER */}
              <div
                {...inspectable('chat_topPanelBackground', 'Pinned Bar Background')}
                className="w-full px-3 py-1.5 flex items-center justify-between border-b border-black/10 z-20"
                style={{ backgroundColor: toCssColor(colors.chat_topPanelBackground || '#17212b') }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    {...inspectable('chat_topPanelLine', 'Pinned Line Indicator')}
                    className="w-1 h-7 rounded-full"
                    style={{ backgroundColor: toCssColor(colors.chat_topPanelLine || colors.chat_topPanelTitle || '#4ea4f5') }}
                  />
                  <div className="min-w-0 text-xs">
                    <span
                      {...inspectable('chat_topPanelTitle', 'Pinned Title')}
                      className="font-bold block truncate"
                      style={{ color: toCssColor(colors.chat_topPanelTitle || '#4ea4f5') }}
                    >
                      Pinned Message
                    </span>
                    <span
                      {...inspectable('chat_topPanelMessage', 'Pinned Snippet')}
                      className="truncate block opacity-90 text-[11px]"
                      style={{ color: toCssColor(colors.chat_topPanelMessage || '#7f93a5') }}
                    >
                      Study session at 4:00 PM — bring your math workbook 📚
                    </span>
                  </div>
                </div>
                <button
                  {...inspectable('chat_topPanelClose', 'Pinned Close Icon')}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X
                    className="w-3.5 h-3.5"
                    style={{ color: toCssColor(colors.chat_topPanelClose || '#7f93a5') }}
                  />
                </button>
              </div>

              {/* IN-APP MINI MUSIC PLAYER BAR */}
              {showMiniPlayer && (
                <div
                  {...inspectable('inappPlayerBackground', 'Mini Player Bar Background (inappPlayerBackground)')}
                  className="w-full px-3 py-1.5 flex items-center justify-between border-b border-black/10 z-20 transition-all cursor-pointer shadow-xs select-none"
                  style={{ backgroundColor: toCssColor(resolvedInappPlayerBg) }}
                  onClick={() => {
                    if (!inspectMode) {
                      setShowAudioPlayerModal(true);
                    }
                  }}
                  title="Click to open full player sheet"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      {...inspectable('inappPlayerPlayPause', 'Mini Player Play/Pause Button (inappPlayerPlayPause)')}
                      className="p-1 rounded-full hover:opacity-85 transition flex-shrink-0"
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('inappPlayerPlayPause');
                        } else {
                          e.stopPropagation();
                          setIsPlayingAudio(!isPlayingAudio);
                        }
                      }}
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4 fill-current" style={{ color: toCssColor(resolvedInappPlayerPlayPause) }} />
                      ) : (
                        <Play className="w-4 h-4 fill-current" style={{ color: toCssColor(resolvedInappPlayerPlayPause) }} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div
                        {...inspectable('inappPlayerTitle', 'Mini Player Track Title (inappPlayerTitle)')}
                        className="text-xs font-semibold truncate"
                        style={{ color: toCssColor(resolvedInappPlayerTitle) }}
                      >
                        Gotoubun no Kimochi
                      </div>
                      <div
                        {...inspectable('inappPlayerPerformer', 'Mini Player Performer / Artist (inappPlayerPerformer)')}
                        className="text-[11px] truncate opacity-90"
                        style={{ color: toCssColor(resolvedInappPlayerPerformer) }}
                      >
                        Nakano-ke no Itsutsugo
                      </div>
                    </div>
                  </div>
                  <button
                    {...inspectable('inappPlayerClose', 'Mini Player Close Button (inappPlayerClose)')}
                    className="p-1 hover:opacity-85 transition flex-shrink-0"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('inappPlayerClose');
                      } else {
                        e.stopPropagation();
                        setShowMiniPlayer(false);
                      }
                    }}
                    title="Close Mini Player"
                  >
                    <X className="w-4 h-4" style={{ color: toCssColor(resolvedInappPlayerClose) }} />
                  </button>
                </div>
              )}

              {/* MAIN CHAT AREA (WALLPAPER + MESSAGES) */}
              <div className="relative flex-1 overflow-hidden flex flex-col">
                {/* Dedicated Wallpaper Layer (prevents blur from blurring message bubbles) */}
                <div
                  className="absolute inset-0 pointer-events-none transition-all duration-150"
                  style={getWallpaperStyle()}
                />

                {/* Wallpaper Dimming Overlay (works on image, gradient, and color wallpapers) */}
                {settings.wallpaperDim > 0 && (
                  <div
                    className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150"
                    style={{ opacity: settings.wallpaperDim / 100 }}
                  />
                )}

                {/* Optional Telegram Pattern Overlay */}
                {settings.wallpaperType === 'pattern' && (
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(${toCssColor(colors.chat_outSentCheck || '#4ea4f5')} 1px, transparent 1px)`,
                      backgroundSize: '16px 16px',
                    }}
                  />
                )}

                {/* Scrollable Messages Viewport */}
                <div
                  {...inspectable('chat_wallpaper', 'Chat Wallpaper')}
                  className="relative z-10 flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-2.5"
                >

                {/* Date Pill */}
                <div className="flex justify-center my-1 z-10">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/35 text-white/90 backdrop-blur-sm">
                    Today
                  </span>
                </div>

                {/* 1. INCOMING MESSAGE 1 (with Avatar & Reaction) */}
                <div className="flex items-end gap-1.5 max-w-[85%] self-start z-10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    M
                  </div>
                  <div className="flex flex-col items-start">
                    <div
                      {...inspectable('chat_inBubble', 'Incoming Bubble')}
                      className="relative px-3 py-2 shadow-sm text-xs leading-relaxed backdrop-blur-xs"
                      style={{
                        backgroundColor: toCssColor(colors.chat_inBubble || '#182533'),
                        borderRadius: bubbleRadius,
                        borderBottomLeftRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                      }}
                    >
                      <span
                        className="font-bold text-[11px] block mb-0.5"
                        style={{ color: toCssColor(colors.chat_inReplyName || '#64b5ef') }}
                      >
                        Miku Nakano
                      </span>
                      <p
                        {...inspectable('chat_messageTextIn', 'Incoming Text')}
                        style={{ color: toCssColor(colors.chat_messageTextIn || '#ffffff') }}
                      >
                        Hey everyone! I just finished reviewing the Sengoku history chapter. Ready for the quiz? 🎧
                      </p>
                      <div className="flex justify-end items-center mt-1">
                        <span
                          {...inspectable('chat_inTimeText', 'Incoming Time')}
                          className="text-[10px]"
                          style={{ color: toCssColor(colors.chat_inTimeText || '#6d8397') }}
                        >
                          12:41
                        </span>
                      </div>
                    </div>

                    {/* Modern Reactions Pill Row (Incoming) */}
                    <div className="mt-1 ml-1 flex items-center gap-1.5 flex-wrap">
                      {inReactions.map((r, idx) => (
                        <div
                          key={idx}
                          {...inspectable('chat_inReactionButtonBackground', 'Incoming Reaction Pill')}
                          onClick={(e) => {
                            if (!inspectMode) {
                              e.stopPropagation();
                              setInReactions(prev =>
                                prev.map((item, i) => i === idx ? { ...item, count: item.count + 1 } : item)
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 text-[11px] shadow-xs cursor-pointer active:scale-95 transition"
                          style={{
                            backgroundColor: toCssColor(colors.chat_inReactionButtonBackground || 'rgba(0,0,0,0.25)'),
                          }}
                        >
                          <span>{r.emoji}</span>
                          <span
                            {...inspectable('chat_inReactionButtonText', 'Incoming Reaction Text')}
                            className="text-[10px] font-bold"
                            style={{
                              color: toCssColor(colors.chat_inReactionButtonText || colors.chat_outSentCheck || '#4ea4f5'),
                            }}
                          >
                            {r.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MODERN TELEGRAM FLOATING REACTION BAR */}
                {showReactionPicker && (
                  <div
                    {...inspectable('actionBarDefaultSubmenuBackground', 'Reaction Bar Background')}
                    className="self-center my-1 px-3 py-1.5 rounded-full shadow-2xl border border-white/10 z-30 flex items-center gap-2 animate-fade-in backdrop-blur-md"
                    style={{
                      backgroundColor: toCssColor(colors.actionBarDefaultSubmenuBackground || colors.actionBarDefault || '#1c242d'),
                    }}
                  >
                    {['❤️', '👍', '🔥', '🎉', '👏', '🥰', '⚡', '💯'].map((emoji, eIdx) => (
                      <button
                        key={eIdx}
                        onClick={() => {
                          if (!inspectMode) {
                            setInReactions(prev => {
                              const existing = prev.find(p => p.emoji === emoji);
                              if (existing) {
                                return prev.map(p => p.emoji === emoji ? { ...p, count: p.count + 1 } : p);
                              }
                              return [...prev, { emoji, count: 1 }];
                            });
                          }
                        }}
                        className="text-sm hover:scale-130 transition transform active:scale-95"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. INCOMING MESSAGE 2 (with Modern Telegram Quote) */}
                <div className="flex items-end gap-1.5 max-w-[85%] self-start z-10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    Y
                  </div>
                  <div
                    {...inspectable('chat_inBubble', 'Incoming Bubble')}
                    className="relative px-3 py-2 shadow-sm text-xs leading-relaxed backdrop-blur-xs"
                    style={{
                      backgroundColor: toCssColor(colors.chat_inBubble || '#182533'),
                      borderRadius: bubbleRadius,
                      borderBottomLeftRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                    }}
                  >
                    {/* Modern Telegram Android Quote Block */}
                    <div
                      {...inspectable('chat_inQuote', 'Incoming Quote Block')}
                      className="px-2.5 py-1.5 mb-1.5 rounded-lg flex items-center gap-2 border-l-2 shadow-inner"
                      style={{
                        backgroundColor: toCssColor(colors.chat_inQuote || 'rgba(0,0,0,0.18)'),
                        borderLeftColor: toCssColor(colors.chat_inReplyLine || '#64b5ef'),
                      }}
                    >
                      <div className="min-w-0 text-[11px]">
                        <span
                          {...inspectable('chat_inReplyName', 'Incoming Quote Author')}
                          className="font-bold block truncate"
                          style={{ color: toCssColor(colors.chat_inReplyName || '#64b5ef') }}
                        >
                          Fuutarou Uesugi
                        </span>
                        <span
                          {...inspectable('chat_inReplyMessageText', 'Incoming Quote Snippet')}
                          className="truncate block opacity-85 text-[10px]"
                          style={{ color: toCssColor(colors.chat_inReplyMessageText || '#8da6ba') }}
                        >
                          Did everyone finish practice set #4 yet?
                        </span>
                      </div>
                    </div>

                    <p
                      {...inspectable('chat_messageTextIn', 'Incoming Text')}
                      style={{ color: toCssColor(colors.chat_messageTextIn || '#ffffff') }}
                    >
                      I tried my best! Can we go over the last two equations together later? ✨
                    </p>
                    <div className="flex justify-end items-center mt-1">
                      <span
                        {...inspectable('chat_inTimeText', 'Incoming Time')}
                        className="text-[10px]"
                        style={{ color: toCssColor(colors.chat_inTimeText || '#6d8397') }}
                      >
                        12:42
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2.5 FORWARDED MESSAGE (Forward Arrow, Date & Author colored by avatar_nameInMessageGreen) */}
                <div className="flex items-end gap-1.5 max-w-[85%] self-start z-10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    I
                  </div>
                  <div
                    {...inspectable('chat_inBubble', 'Incoming Bubble')}
                    className="relative px-3 py-2 shadow-sm text-xs leading-relaxed backdrop-blur-xs min-w-[220px]"
                    style={{
                      backgroundColor: toCssColor(colors.chat_inBubble || '#182533'),
                      borderRadius: bubbleRadius,
                      borderBottomLeftRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                    }}
                  >
                    {/* Forward Header: Arrow & Date */}
                    <div
                      {...inspectable('avatar_nameInMessageGreen', 'Forward Author / Arrow (Green)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('avatar_nameInMessageGreen');
                        }
                      }}
                      className="flex items-center gap-1.5 mb-1 cursor-pointer"
                    >
                      <CornerUpRight
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: toCssColor(colors.avatar_nameInMessageGreen || colors.chat_inForwardedNameText || colors.chat_inReplyName || '#e76a8f') }}
                      />
                      <span
                        className="text-[11px] font-semibold tracking-tight"
                        style={{ color: toCssColor(colors.avatar_nameInMessageGreen || colors.chat_inForwardedNameText || colors.chat_inReplyName || '#e76a8f') }}
                      >
                        Today | 12:35 PM
                      </span>
                    </div>

                    {/* Forwarded Author Name with Mini Avatar */}
                    <div
                      {...inspectable('avatar_nameInMessageGreen', 'Forward Author Name (Green)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('avatar_nameInMessageGreen');
                        }
                      }}
                      className="flex items-center gap-1.5 mb-2 cursor-pointer"
                    >
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-slate-600 to-indigo-700 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                        F
                      </div>
                      <span
                        className="font-bold text-[12px] truncate"
                        style={{ color: toCssColor(colors.avatar_nameInMessageGreen || colors.chat_inForwardedNameText || colors.chat_inReplyName || '#e76a8f') }}
                      >
                        Fuutarou Uesugi
                      </span>
                    </div>

                    {/* Forwarded Message Content */}
                    <div
                      {...inspectable('chat_messageTextIn', 'Incoming Text')}
                      style={{ color: toCssColor(colors.chat_messageTextIn || '#ffffff') }}
                      className="space-y-1 font-normal text-xs"
                    >
                      <p className="font-semibold">✅ Practice test sheets are ready.</p>
                      <p className="opacity-90">📚 Subjects: Mathematics · Modern Japanese</p>
                    </div>

                    {/* Forwarded Message Footer: Reactions + Time */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">📖</span>
                        <span className="text-xs">✨</span>
                      </div>
                      <span
                        {...inspectable('chat_inTimeText', 'Incoming Time')}
                        className="text-[10px]"
                        style={{ color: toCssColor(colors.chat_inTimeText || '#6d8397') }}
                      >
                        12:42
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. OUTGOING MESSAGE 1 (Sent Text with Double Checks & Reactions) */}
                <div className="flex flex-col items-end self-end max-w-[85%] z-10">
                  <div
                    {...inspectable('chat_outBubble', 'Outgoing Bubble')}
                    className="w-full relative px-3 py-2 shadow-sm text-xs leading-relaxed backdrop-blur-xs"
                    style={{
                      backgroundColor: toCssColor(colors.chat_outBubble || '#2b5278'),
                      borderRadius: bubbleRadius,
                      borderBottomRightRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                    }}
                  >
                    <p
                      {...inspectable('chat_messageTextOut', 'Outgoing Text')}
                      style={{ color: toCssColor(colors.chat_messageTextOut || '#ffffff') }}
                    >
                      Sounds good! Let's review chapter 4 first and grab matcha soda afterwards. 🍵
                    </p>
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span
                        {...inspectable('chat_outTimeText', 'Outgoing Time')}
                        className="text-[10px]"
                        style={{ color: toCssColor(colors.chat_outTimeText || '#7099be') }}
                      >
                        12:43
                      </span>
                      <CheckCheck
                        {...inspectable('chat_outSentCheck', 'Read Checkmarks')}
                        className="w-3.5 h-3.5"
                        style={{ color: toCssColor(colors.chat_outSentCheck || '#4ea4f5') }}
                      />
                    </div>
                  </div>

                  {/* Modern Reactions Pill Row (Outgoing) */}
                  <div className="mt-1 mr-1 flex items-center gap-1.5">
                    {outReactions.map((r, idx) => (
                      <div
                        key={idx}
                        {...inspectable('chat_outReactionButtonBackground', 'Outgoing Reaction Pill')}
                        onClick={(e) => {
                          if (!inspectMode) {
                            e.stopPropagation();
                            setOutReactions(prev =>
                              prev.map((item, i) => i === idx ? { ...item, count: item.count + 1 } : item)
                            );
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 text-[11px] shadow-xs cursor-pointer active:scale-95 transition"
                        style={{
                          backgroundColor: toCssColor(colors.chat_outReactionButtonBackground || 'rgba(255,255,255,0.18)'),
                        }}
                      >
                        <span>{r.emoji}</span>
                        <span
                          {...inspectable('chat_outReactionButtonText', 'Outgoing Reaction Text')}
                          className="text-[10px] font-bold"
                          style={{
                            color: toCssColor(colors.chat_outReactionButtonText || '#ffffff'),
                          }}
                        >
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. MESSAGE POPUP CONTEXT MENU (PREVIEWABLE / INTERACTIVE) */}
                {showMessageContextMenu && (
                  <div
                    {...inspectable('actionBarDefaultSubmenuBackground', 'Message Context Menu')}
                    className="self-center my-1 rounded-2xl shadow-2xl border border-white/10 p-1.5 z-30 animate-scale-in"
                    style={{
                      backgroundColor: toCssColor(colors.actionBarDefaultSubmenuBackground || colors.actionBarDefault || '#1c242d'),
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {[
                        { icon: Reply, label: 'Reply' },
                        { icon: Copy, label: 'Copy' },
                        { icon: Forward, label: 'Forward' },
                        { icon: Pin, label: 'Pin' },
                        { icon: Trash2, label: 'Delete', isDanger: true },
                      ].map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable('actionBarDefaultSubmenuItem');
                            } else {
                              setShowMessageContextMenu(false);
                            }
                          }}
                          className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition"
                        >
                          <action.icon
                            {...inspectable('actionBarDefaultSubmenuItemIcon', 'Context Menu Icon')}
                            className="w-4 h-4"
                            style={{
                              color: action.isDanger
                                ? '#ef4444'
                                : toCssColor(colors.actionBarDefaultSubmenuItemIcon || colors.actionBarDefaultSubtitle || '#7f93a5'),
                            }}
                          />
                          <span
                            {...inspectable('actionBarDefaultSubmenuItem', 'Context Menu Text')}
                            className="text-[10px] font-medium"
                            style={{
                              color: action.isDanger
                                ? '#ef4444'
                                : toCssColor(colors.actionBarDefaultSubmenuItem || colors.actionBarDefaultTitle || '#ffffff'),
                            }}
                          >
                            {action.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. INCOMING RECORDED VOICE NOTE BUBBLE */}
                <div className="flex items-end gap-1.5 max-w-[85%] self-start z-10">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    N
                  </div>
                  <div
                    {...inspectable('chat_inBubble', 'Incoming Bubble')}
                    className="relative px-3 py-2.5 shadow-sm text-xs z-10 backdrop-blur-xs min-w-[210px]"
                    style={{
                      backgroundColor: toCssColor(colors.chat_inBubble || '#182533'),
                      borderRadius: bubbleRadius,
                      borderBottomLeftRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Play/Pause Button Circle */}
                      <button
                        {...inspectable('chat_inLoader', 'Play Button Circle (Received)')}
                        onClick={(e) => {
                          if (inspectMode) {
                            e.stopPropagation();
                            onSelectVariable('chat_inLoader');
                          } else {
                            setIsPlayingInVoice(!isPlayingInVoice);
                          }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-95 shadow-sm"
                        style={{
                          backgroundColor: toCssColor(colors.chat_inLoader || colors.chat_inAudioProgress || '#4ea4f5'),
                        }}
                      >
                        {isPlayingInVoice ? (
                          <Pause
                            {...inspectable('chat_inMediaIcon', 'Play Icon (Received)')}
                            className="w-4 h-4 fill-current"
                            style={{ color: toCssColor(colors.chat_inMediaIcon || colors.chat_inBubble || '#ffffff') }}
                          />
                        ) : (
                          <Play
                            {...inspectable('chat_inMediaIcon', 'Play Icon (Received)')}
                            className="w-4 h-4 fill-current ml-0.5"
                            style={{ color: toCssColor(colors.chat_inMediaIcon || colors.chat_inBubble || '#ffffff') }}
                          />
                        )}
                      </button>

                      {/* Waveform Scrubber */}
                      <div className="flex-1 flex flex-col gap-1">
                        <div
                          {...inspectable('chat_inVoiceSeekbarFill', 'Waveform Fill (Received)')}
                          className="flex items-center gap-0.5 h-4 cursor-pointer"
                        >
                          {[45, 80, 50, 100, 65, 90, 55, 75, 40, 85, 95, 35, 70, 50, 85].map((h, i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full transition-all"
                              style={{
                                height: `${h}%`,
                                backgroundColor:
                                  i < (isPlayingInVoice ? 9 : 5)
                                    ? toCssColor(colors.chat_inVoiceSeekbarFill || colors.chat_inAudioProgress || '#4ea4f5')
                                    : toCssColor(colors.chat_inVoiceSeekbar || 'rgba(128,128,128,0.4)'),
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span
                            {...inspectable('chat_inAudioDurationText', 'Incoming Voice Duration')}
                            style={{ color: toCssColor(colors.chat_inAudioDurationText || colors.chat_inTimeText || '#6d8397') }}
                          >
                            0:28
                          </span>
                          <span style={{ color: toCssColor(colors.chat_inTimeText || '#6d8397') }}>
                            12:43
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. OUTGOING RECORDED VOICE NOTE BUBBLE */}
                <div
                  {...inspectable('chat_outBubble', 'Outgoing Bubble')}
                  className="max-w-[85%] self-end relative px-3 py-2.5 shadow-sm text-xs z-10 backdrop-blur-xs min-w-[210px]"
                  style={{
                    backgroundColor: toCssColor(colors.chat_outBubble || '#2b5278'),
                    borderRadius: bubbleRadius,
                    borderBottomRightRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Play/Pause Button Circle */}
                    <button
                      {...inspectable('chat_outLoader', 'Play Button Circle (Sent)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('chat_outLoader');
                        } else {
                          setIsPlayingOutVoice(!isPlayingOutVoice);
                        }
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-95 shadow-sm"
                      style={{
                        backgroundColor: toCssColor(colors.chat_outLoader || colors.chat_outAudioProgress || '#ffffff'),
                      }}
                    >
                      {isPlayingOutVoice ? (
                        <Pause
                          {...inspectable('chat_outMediaIcon', 'Play Icon (Sent)')}
                          className="w-4 h-4 fill-current"
                          style={{ color: toCssColor(colors.chat_outMediaIcon || colors.chat_outBubble || '#2b5278') }}
                        />
                      ) : (
                        <Play
                          {...inspectable('chat_outMediaIcon', 'Play Icon (Sent)')}
                          className="w-4 h-4 fill-current ml-0.5"
                          style={{ color: toCssColor(colors.chat_outMediaIcon || colors.chat_outBubble || '#2b5278') }}
                        />
                      )}
                    </button>

                    {/* Waveform Scrubber */}
                    <div className="flex-1 flex flex-col gap-1">
                      <div
                        {...inspectable('chat_outVoiceSeekbarFill', 'Waveform Fill (Sent)')}
                        className="flex items-center gap-0.5 h-4 cursor-pointer"
                      >
                        {[35, 75, 45, 95, 60, 100, 50, 85, 40, 70, 90, 30, 65, 45, 80].map((h, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full transition-all"
                            style={{
                              height: `${h}%`,
                              backgroundColor:
                                i < (isPlayingOutVoice ? 11 : 7)
                                  ? toCssColor(colors.chat_outVoiceSeekbarFill || colors.chat_outAudioProgress || '#ffffff')
                                  : toCssColor(colors.chat_outVoiceSeekbar || 'rgba(255,255,255,0.4)'),
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          {...inspectable('chat_outAudioDurationText', 'Outgoing Voice Duration')}
                          style={{ color: toCssColor(colors.chat_outAudioDurationText || colors.chat_outTimeText || '#7099be') }}
                        >
                          0:42
                        </span>
                        <div className="flex items-center gap-1">
                          <span style={{ color: toCssColor(colors.chat_outTimeText || '#7099be') }}>12:44</span>
                          <CheckCheck
                            {...inspectable('chat_outSentCheck', 'Read Checkmarks')}
                            className="w-3.5 h-3.5"
                            style={{ color: toCssColor(colors.chat_outSentCheck || '#4ea4f5') }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. OUTGOING FILE ATTACHMENT BUBBLE (DOCUMENT) */}
                <div
                  {...inspectable('chat_outBubble', 'Outgoing Bubble')}
                  className="max-w-[85%] self-end relative px-3 py-2.5 shadow-sm text-xs z-10 backdrop-blur-xs min-w-[210px]"
                  style={{
                    backgroundColor: toCssColor(colors.chat_outBubble || '#2b5278'),
                    borderRadius: bubbleRadius,
                    borderBottomRightRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* File Icon Circle */}
                    <div
                      {...inspectable('chat_outFileBackground', 'File Icon Container')}
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{
                        backgroundColor: toCssColor(colors.chat_outFileBackground || '#ffffff'),
                      }}
                    >
                      <FileText
                        {...inspectable('chat_outFileProgress', 'File Icon')}
                        className="w-5 h-5"
                        style={{
                          color: toCssColor(colors.chat_outFileProgress || colors.chat_outMessageText || '#2b5278'),
                        }}
                      />
                    </div>

                    {/* File Name & Size Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        {...inspectable('chat_outFileNameText', 'File Name Text')}
                        className="font-bold text-xs truncate"
                        style={{
                          color: toCssColor(colors.chat_outFileNameText || colors.chat_messageTextOut || '#ffffff'),
                        }}
                      >
                        Midterm_Study_Notes.pdf
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span
                          {...inspectable('chat_outFileInfoText', 'File Info Text')}
                          className="text-[10px]"
                          style={{
                            color: toCssColor(colors.chat_outFileInfoText || colors.chat_outTimeText || '#cfb5bd'),
                          }}
                        >
                          4.8 MB PDF
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            {...inspectable('chat_outTimeText', 'Time Text')}
                            className="text-[10px]"
                            style={{ color: toCssColor(colors.chat_outTimeText || '#7099be') }}
                          >
                            12:45
                          </span>
                          <CheckCheck
                            {...inspectable('chat_outSentCheck', 'Read Checkmarks')}
                            className="w-3.5 h-3.5"
                            style={{ color: toCssColor(colors.chat_outSentCheck || '#4ea4f5') }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Extra Messages */}
                {extraMessages.map(msg => (
                  <div
                    key={msg.id}
                    {...inspectable('chat_outBubble', 'Outgoing Bubble')}
                    className="max-w-[85%] self-end relative px-3 py-2 shadow-sm text-xs leading-relaxed z-10 backdrop-blur-xs animate-fade-in"
                    style={{
                      backgroundColor: toCssColor(colors.chat_outBubble || '#2b5278'),
                      borderRadius: bubbleRadius,
                      borderBottomRightRadius: settings.bubbleTails ? '4px' : bubbleRadius,
                    }}
                  >
                    <p style={{ color: toCssColor(colors.chat_messageTextOut || '#ffffff') }}>
                      {msg.text}
                    </p>
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span
                        className="text-[10px]"
                        style={{ color: toCssColor(colors.chat_outTimeText || '#7099be') }}
                      >
                        {msg.time}
                      </span>
                      <CheckCheck
                        className="w-3.5 h-3.5"
                        style={{ color: toCssColor(colors.chat_outSentCheck || '#4ea4f5') }}
                      />
                    </div>
                  </div>
                ))}
                </div>
              </div>

              {/* FLOATING SCROLL TO BOTTOM BUTTON */}
              <div className="absolute right-3 bottom-16 z-20">
                <button
                  {...inspectable('chat_goDownButton', 'Scroll-to-Bottom Button')}
                  className="relative w-9 h-9 rounded-full shadow-lg flex items-center justify-center transition active:scale-95"
                  style={{
                    backgroundColor: toCssColor(colors.chat_goDownButton || colors.chat_goToEndButtonBackground || '#1d2733'),
                  }}
                >
                  <ChevronDown
                    className="w-5 h-5"
                    style={{ color: toCssColor(colors.chat_goDownButtonIcon || colors.chat_goToEndButtonIcon || '#7f93a5') }}
                  />
                  {/* Unread Counter Badge */}
                  <span
                    {...inspectable('chat_goDownButtonCounterBackground', 'Scroll Button Badge (chat_goDownButtonCounterBackground)')}
                    className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm cursor-pointer"
                    style={{
                      backgroundColor: toCssColor(colors.chat_goDownButtonCounterBackground || colors.chat_goToEndButtonCounter || '#4ea4f5'),
                      color: toCssColor(resolvedGoDownCounterText),
                    }}
                  >
                    <span
                      {...inspectable('chat_goDownButtonCounter', 'Scroll Button Badge Text (chat_goDownButtonCounter)')}
                      className="inline-block px-0.5 cursor-pointer font-bold"
                      style={{ color: toCssColor(resolvedGoDownCounterText) }}
                    >
                      3
                    </span>
                  </span>
                </button>
              </div>

              {/* ACTIVE RECORDING OVERLAY (WHEN PREVIEW IS ON) */}
              {showRecordingUI && (
                <div
                  {...inspectable('chat_recordedVoiceBackground', 'Recording Panel Background')}
                  className="w-full px-3 py-2 flex items-center justify-between shadow-xl border-t border-black/20 z-30 animate-fade-in"
                  style={{
                    backgroundColor: toCssColor(colors.chat_recordedVoiceBackground || colors.actionBarDefault || '#1c242d'),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      {...inspectable('chat_recordedVoiceDot', 'Recording Red Dot')}
                      className="w-3 h-3 rounded-full animate-ping"
                      style={{ backgroundColor: toCssColor(colors.chat_recordedVoiceDot || '#ef4444') }}
                    />
                    <span
                      {...inspectable('chat_recordTime', 'Recording Timer')}
                      className="font-mono text-xs font-bold"
                      style={{ color: toCssColor(colors.chat_recordTime || '#ffffff') }}
                    >
                      0:08
                    </span>
                  </div>

                  {/* Waveform Animation */}
                  <div className="flex items-center gap-1 h-3">
                    {[50, 90, 40, 100, 70, 85, 60, 95].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full animate-pulse"
                        style={{
                          height: `${h}%`,
                          backgroundColor: toCssColor(colors.chat_recordedVoiceProgress || '#4ea4f5'),
                        }}
                      />
                    ))}
                  </div>

                  <span
                    {...inspectable('chat_recordVoiceCancel', 'Slide to Cancel')}
                    className="text-xs font-semibold"
                    style={{ color: toCssColor(colors.chat_recordVoiceCancel || '#7f93a5') }}
                  >
                    ‹ Slide to cancel
                  </span>
                </div>
              )}

              {/* BOTTOM MESSAGE INPUT BAR OR BROADCAST CHANNEL BAR */}
              {isChannelMode ? (
                <div
                  {...inspectable('chat_messagePanelBackground', 'Channel Bottom Bar')}
                  className="w-full min-h-[52px] px-4 py-2 flex items-center justify-center shadow-lg z-30"
                  style={{
                    backgroundColor: toCssColor(colors.chat_messagePanelBackground || '#17212b'),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsChannelMuted(!isChannelMuted)}
                    className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
                    style={{
                      backgroundColor: toCssColor(colors.chat_messagePanelSend || '#4ea4f5'),
                      color: '#ffffff',
                    }}
                  >
                    {isChannelMuted ? (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>UNMUTE CHANNEL</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="w-4 h-4" />
                        <span>MUTE CHANNEL</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="relative w-full z-30">
                  {/* FLOATING EMOJI SUGGESTIONS BALLOON */}
                  {(showEmojiHints || typedMessage.toLowerCase().includes('laugh') || typedMessage.toLowerCase().includes('smile') || selectedVariableKey === 'chat_stickersHintPanel' || selectedVariableKey?.startsWith('chat_emojiPanel')) && (
                    <div
                      {...inspectable('chat_stickersHintPanel', 'Emoji Suggestions Balloon (chat_stickersHintPanel)')}
                      className="absolute bottom-full left-3 mb-2 px-3 py-1.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-black/10 z-40 animate-fade-in select-none"
                      style={{
                        backgroundColor: toCssColor(resolvedStickersHintPanel),
                      }}
                    >
                      {['😄', '😆', '😂', '🤣', '😃'].map((emoji, idx) => (
                        <span
                          key={idx}
                          className="text-xl hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!inspectMode) {
                              setTypedMessage(prev => (prev ? prev + ' ' : '') + emoji);
                            }
                          }}
                        >
                          {emoji}
                        </span>
                      ))}
                      {/* Downward triangle pointer arrow matching Telegram Android speech bubble */}
                      <div
                        className="absolute -bottom-1.5 left-5 w-3 h-3 rotate-45 border-r border-b border-black/10 shadow-sm pointer-events-none"
                        style={{ backgroundColor: toCssColor(resolvedStickersHintPanel) }}
                      />
                    </div>
                  )}

                  <form
                    onSubmit={handleSendMessage}
                    {...inspectable('chat_messagePanelBackground', 'Message Input Bar')}
                    className="w-full min-h-[52px] px-3 py-2 flex items-center gap-2 shadow-lg"
                    style={{
                      backgroundColor: toCssColor(colors.chat_messagePanelBackground || '#17212b'),
                    }}
                  >
                    <button
                      type="button"
                      {...inspectable('glass_defaultIcon', 'Modern Input Emoji Icon')}
                      className="p-1 hover:opacity-80 transition"
                    >
                      <Smile
                        className="w-5 h-5"
                        style={{ color: toCssColor(colors.glass_defaultIcon || colors.chat_messagePanelIcons || '#b0c4de') }}
                      />
                    </button>

                    <input
                      type="text"
                      placeholder="Message (type 'laugh' for emoji bubble)"
                      value={typedMessage}
                      onChange={e => setTypedMessage(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-opacity-60"
                      style={{
                        color: toCssColor(colors.chat_messagePanelText || '#ffffff'),
                      }}
                    />

                    {/* Attachment Paperclip Button (Left Action) */}
                    <button
                      type="button"
                      {...inspectable('glass_defaultIcon', 'Modern Input Attachment Icon')}
                      className="p-1 hover:opacity-80 transition"
                    >
                      <Paperclip
                        className="w-5 h-5 rotate-45"
                        style={{
                          color: toCssColor(colors.glass_defaultIcon || colors.chat_messagePanelAttach || colors.chat_messagePanelIcons || '#b0c4de'),
                        }}
                      />
                    </button>

                    {/* Modern Voice / Video Message Switcher Button (Right Action) */}
                    <button
                      type="submit"
                      {...inspectable('chat_messagePanelVoiceBackground', 'Voice/Video Button Circle')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('chat_messagePanelVoiceBackground');
                        } else if (!typedMessage.trim()) {
                          e.preventDefault();
                          setIsRoundVideoMode(!isRoundVideoMode);
                        }
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 shadow-sm"
                      style={{
                        backgroundColor: typedMessage.trim()
                          ? toCssColor(colors.chat_messagePanelSend || '#4ea4f5')
                          : toCssColor(colors.chat_messagePanelVoiceBackground || colors.chat_messagePanelBackground || '#17212b'),
                        color: typedMessage.trim()
                          ? '#ffffff'
                          : toCssColor(colors.glass_defaultIcon || colors.chat_messagePanelVoice || colors.chat_messagePanelIcons || '#b0c4de'),
                      }}
                      title={typedMessage.trim() ? "Send Message" : isRoundVideoMode ? "Switch to Voice (Mic)" : "Switch to Round Video"}
                    >
                      {typedMessage.trim() ? (
                        <Send className="w-4 h-4" />
                      ) : isRoundVideoMode ? (
                        <Video className="w-4 h-4 animate-scale-in" />
                      ) : (
                        <Mic className="w-4 h-4 animate-scale-in" />
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW: CHATS LIST (HOME SCREEN) ================= */}
          {currentView === 'chatlist' && (
            <div
              className="relative flex-1 flex flex-col overflow-hidden"
              style={{ backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b') }}
            >
              {/* Home Screen Action Bar / Action Mode */}
              {isChatSelectionMode ? (
                <div
                  {...inspectable('actionBarActionModeDefault', 'Action Mode Bar')}
                  className="w-full h-14 px-3 flex items-center justify-between shadow-md z-30 transition-all duration-200"
                  style={{
                    backgroundColor: toCssColor(colors.actionBarActionModeDefault || colors.actionBarDefault || '#1c242d'),
                  }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsChatSelectionMode(false)}
                      className="p-1 rounded-full hover:bg-white/10 transition"
                      title="Cancel Selection"
                    >
                      <X
                        className="w-5 h-5"
                        style={{ color: toCssColor(resolvedActionModeIcon) }}
                      />
                    </button>
                    <span
                      {...inspectable('actionBarActionModeDefaultIcon', 'Action Mode Counter / Icon Color')}
                      className="font-bold text-base"
                      style={{ color: toCssColor(resolvedActionModeIcon) }}
                    >
                      1
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      title="Pin Chat"
                    >
                      <Pin
                        className="w-4 h-4 rotate-45"
                        style={{ color: toCssColor(resolvedActionModeIcon) }}
                      />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      title="Mute Notifications"
                    >
                      <BellOff
                        className="w-4 h-4"
                        style={{ color: toCssColor(resolvedActionModeIcon) }}
                      />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      title="Archive Chat"
                    >
                      <Archive
                        className="w-4 h-4"
                        style={{ color: toCssColor(resolvedActionModeIcon) }}
                      />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      title="Delete Chat"
                    >
                      <Trash2
                        className="w-4 h-4"
                        style={{ color: toCssColor(resolvedActionModeIcon) }}
                      />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  {...inspectable('actionBarDefault', 'Action Bar Background')}
                  className="w-full h-14 px-3 flex items-center justify-between shadow-md z-30"
                  style={{ backgroundColor: toCssColor(colors.actionBarDefault || '#1c242d') }}
                >
                  {isSearchOpen ? (
                    <div className="w-full flex items-center gap-2 animate-fade-in">
                      <button
                        {...inspectable('actionBarDefaultIcon', 'Search Bar Back Arrow')}
                        onClick={(e) => {
                          if (inspectMode) {
                            e.stopPropagation();
                            onSelectVariable('actionBarDefaultIcon');
                          } else {
                            setIsSearchOpen(false);
                          }
                        }}
                        className="p-1 rounded-full hover:bg-white/10 transition flex-shrink-0"
                        title="Exit Search"
                      >
                        <ArrowLeft
                          className="w-5 h-5"
                          style={{ color: toCssColor(resolvedActionBarIcon) }}
                        />
                      </button>

                      {/* Search Input Box / Pill matching Telegram Android */}
                      <div className="flex-1 min-w-0 flex items-center px-3 py-1.5 rounded-full bg-black/20 border border-white/10 shadow-inner">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search chats, messages..."
                          {...(searchQuery
                            ? inspectable('actionBarDefaultSearch', 'Search Typed Text (actionBarDefaultSearch)')
                            : inspectable('actionBarDefaultSearchPlaceholder', 'Search Placeholder Hint (actionBarDefaultSearchPlaceholder)'))}
                          className="search-input-field w-full bg-transparent outline-none text-sm font-medium tracking-wide"
                          style={{
                            color: toCssColor(resolvedSearchText),
                            caretColor: toCssColor(resolvedSearchText),
                          }}
                        />
                      </div>

                      <button
                        {...inspectable('actionBarDefaultIcon', 'Clear/Close Search Button (X)')}
                        onClick={(e) => {
                          if (inspectMode) {
                            e.stopPropagation();
                            onSelectVariable('actionBarDefaultIcon');
                          } else {
                            if (searchQuery) {
                              setSearchQuery('');
                            } else {
                              setIsSearchOpen(false);
                            }
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-white/10 transition flex-shrink-0"
                        title="Clear or Close Search"
                      >
                        <X
                          className="w-4 h-4"
                          style={{ color: toCssColor(resolvedActionBarIcon) }}
                        />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <button
                          {...inspectable('actionBarDefaultIcon', 'Drawer Menu (3-Lines)')}
                          className="p-1 rounded-full hover:bg-white/10 transition"
                          title="Telegram Drawer Menu (3-Lines)"
                        >
                          <Menu
                            className="w-5 h-5"
                            style={{ color: toCssColor(resolvedActionBarIcon) }}
                          />
                        </button>
                        <h3
                          {...inspectable('actionBarDefaultTitle', 'Telegram Title')}
                          className="font-bold text-base"
                          style={{ color: toCssColor(colors.actionBarDefaultTitle || (isHeaderLight ? '#212529' : '#ffffff')) }}
                        >
                          Telegram
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 relative">
                        <button
                          onClick={() => setIsChatSelectionMode(true)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium transition"
                          style={{
                            backgroundColor: toCssColor(colors.actionBarActionModeDefaultSelector || (isHeaderLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)')),
                            color: toCssColor(resolvedActionBarIcon),
                          }}
                          title="Toggle Multi-Select Action Mode"
                        >
                          Select
                        </button>
                        <button
                          {...inspectable('actionBarDefaultIcon', 'Search Icon')}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable('actionBarDefaultIcon');
                            } else {
                              setIsSearchOpen(true);
                            }
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 transition"
                          title="Search Chats"
                        >
                          <Search
                            className="w-5 h-5"
                            style={{ color: toCssColor(resolvedActionBarIcon) }}
                          />
                        </button>
                        <button
                          {...inspectable('actionBarDefaultIcon', 'Options Menu (3-Dots)')}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable('actionBarDefaultIcon');
                            } else {
                              setShowOptionsMenu(!showOptionsMenu);
                            }
                          }}
                          className="p-1.5 rounded-full hover:bg-white/10 transition"
                          title="3-Dots Options Menu"
                        >
                          <MoreVertical
                            className="w-5 h-5"
                            style={{ color: toCssColor(resolvedActionBarIcon) }}
                          />
                        </button>

                        {/* Chat List Dropdown Options Menu */}
                        {showOptionsMenu && currentView === 'chatlist' && (
                          <div
                            {...inspectable('actionBarDefaultSubmenuBackground', 'Dropdown Menu Card')}
                            className="absolute top-11 right-0 w-48 rounded-2xl shadow-2xl border border-white/10 p-1.5 z-50 animate-scale-in"
                            style={{
                              backgroundColor: toCssColor(resolvedSubmenuBg),
                            }}
                          >
                            <div
                              onClick={() => {
                                if (inspectMode) {
                                  onSelectVariable('actionBarDefaultSubmenuItem');
                                } else {
                                  setShowOptionsMenu(false);
                                }
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 cursor-pointer transition"
                            >
                              <Folder
                                {...inspectable('actionBarDefaultSubmenuItemIcon', 'Dropdown Item Icon')}
                                className="w-3.5 h-3.5"
                                style={{
                                  color: toCssColor(resolvedSubmenuItemIcon),
                                }}
                              />
                              <span
                                {...inspectable('actionBarDefaultSubmenuItem', 'Dropdown Item Text')}
                                style={{
                                  color: toCssColor(resolvedSubmenuItemText),
                                }}
                              >
                                Edit Folders
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {isSearchOpen ? (
                /* Interactive Search Results View */
                <div
                  {...inspectable('windowBackgroundWhite', 'Search Results Canvas')}
                  className="flex-1 overflow-y-auto select-none"
                  style={{
                    backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b'),
                  }}
                >
                  {/* Section Bar 1: Global search */}
                  <div
                    {...inspectable('graySection', 'Section Header Bar Background (graySection)')}
                    onClick={() => {
                      if (inspectMode) onSelectVariable('graySection');
                    }}
                    className="px-3.5 py-2 flex items-center justify-between text-xs font-semibold tracking-wide transition cursor-pointer select-none"
                    style={{
                      backgroundColor: toCssColor(resolvedGraySection),
                      borderBottom: `1px solid ${toCssColor(colors.divider || 'rgba(255,255,255,0.06)')}`,
                    }}
                  >
                    <span
                      {...inspectable('key_graySectionText', 'Section Header Bar Text (key_graySectionText)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('key_graySectionText');
                        }
                      }}
                      className="font-medium text-xs"
                      style={{ color: toCssColor(resolvedGraySectionText) }}
                    >
                      Global search
                    </span>
                    <button
                      {...inspectable('windowBackgroundWhiteBlueHeader', 'Section Action Text (windowBackgroundWhiteBlueHeader)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('windowBackgroundWhiteBlueHeader');
                        }
                      }}
                      className="text-xs font-medium hover:underline cursor-pointer"
                      style={{ color: toCssColor(resolvedSectionBlueHeader) }}
                    >
                      Show more
                    </button>
                  </div>

                  {/* Global Search Results List */}
                  <div className="divide-y" style={{ borderColor: toCssColor(colors.divider || '#111921') }}>
                    {/* Channel 1 */}
                    <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                        GN
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            {...inspectable('chats_name', 'Contact / Channel Name')}
                            className="font-bold text-sm truncate"
                            style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                          >
                            {searchQuery || 'Gotoubun'} Fan Channel
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400">
                            verified
                          </span>
                        </div>
                        <p
                          {...inspectable('chats_message', 'Message Snippet / Channel Details')}
                          className="text-xs truncate"
                          style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                        >
                          @gotoubun_channel • 14.8K subscribers
                        </p>
                      </div>
                    </div>

                    {/* Group 2 */}
                    <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                        NS
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          {...inspectable('chats_name', 'Contact / Group Name')}
                          className="font-bold text-sm truncate block mb-0.5"
                          style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                        >
                          {searchQuery || 'Nakano'} Community & Notes
                        </span>
                        <p
                          {...inspectable('chats_message', 'Message Snippet / Group Details')}
                          className="text-xs truncate"
                          style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                        >
                          @nakano_study • 3,240 members
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Bar 2: Messages */}
                  <div
                    {...inspectable('graySection', 'Section Header Bar Background (graySection)')}
                    onClick={() => {
                      if (inspectMode) onSelectVariable('graySection');
                    }}
                    className="px-3.5 py-2 flex items-center justify-between text-xs font-semibold tracking-wide transition cursor-pointer select-none"
                    style={{
                      backgroundColor: toCssColor(resolvedGraySection),
                      borderBottom: `1px solid ${toCssColor(colors.divider || 'rgba(255,255,255,0.06)')}`,
                    }}
                  >
                    <span
                      {...inspectable('key_graySectionText', 'Section Header Bar Text (key_graySectionText)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('key_graySectionText');
                        }
                      }}
                      className="font-medium text-xs"
                      style={{ color: toCssColor(resolvedGraySectionText) }}
                    >
                      Messages
                    </span>
                    <div
                      {...inspectable('key_graySectionText', 'Section Filter Dropdown (key_graySectionText)')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('key_graySectionText');
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-normal cursor-pointer"
                      style={{ color: toCssColor(resolvedGraySectionText) }}
                    >
                      <span>From all chats</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Messages Search Results List */}
                  <div className="divide-y" style={{ borderColor: toCssColor(colors.divider || '#111921') }}>
                    {/* Message Result 1 */}
                    <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                        MN
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            {...inspectable('chats_name', 'Chat Sender Name')}
                            className="font-bold text-sm truncate"
                            style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                          >
                            Miku Nakano
                          </span>
                          <span
                            {...inspectable('chats_date', 'Search Timestamp (chats_date)')}
                            className="text-[11px]"
                            style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                          >
                            11:42 AM
                          </span>
                        </div>
                        <p
                          {...inspectable('chats_message', 'Message Snippet')}
                          className="text-xs truncate"
                          style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                        >
                          Found the notes for <span className="font-bold underline" style={{ color: toCssColor(colors.chats_unreadCounter || colors.actionBarDefaultTitle || '#4ea4f5') }}>{searchQuery || 'study'}</span>, sending them over now!
                        </p>
                      </div>
                    </div>

                    {/* Message Result 2 */}
                    <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                        IN
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            {...inspectable('chats_name', 'Chat Group Name')}
                            className="font-bold text-sm truncate"
                            style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                          >
                            Itsuki Nakano
                          </span>
                          <span
                            {...inspectable('chats_date', 'Search Timestamp (chats_date)')}
                            className="text-[11px]"
                            style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                          >
                            Yesterday
                          </span>
                        </div>
                        <p
                          {...inspectable('chats_message', 'Message Snippet')}
                          className="text-xs truncate"
                          style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                        >
                          Let's review <span className="font-bold underline" style={{ color: toCssColor(colors.chats_unreadCounter || colors.actionBarDefaultTitle || '#4ea4f5') }}>{searchQuery || 'study'}</span> before tomorrow's mock exam.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Folder Tabs */}
                  <div
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-xs font-semibold border-b overflow-x-auto scrollbar-none select-none"
                style={{
                  backgroundColor: toCssColor(colors.actionBarDefault || '#1c242d'),
                  borderColor: toCssColor(colors.divider || '#111921'),
                }}
              >
                {/* Tab 1: All */}
                <button
                  {...inspectable(
                    activeFolderTab === 'all' ? 'actionBarTabLine' : 'actionBarTabUnactiveText',
                    activeFolderTab === 'all' ? 'Active Tab Indicator Pill / Label (actionBarTabLine)' : 'Inactive Folder Tab (actionBarTabUnactiveText)'
                  )}
                  onClick={(e) => {
                    if (inspectMode) {
                      e.stopPropagation();
                      const key = activeFolderTab === 'all' ? 'actionBarTabLine' : 'actionBarTabUnactiveText';
                      const label = activeFolderTab === 'all' ? 'Active Tab Indicator Pill / Label (actionBarTabLine)' : 'Inactive Folder Tab (actionBarTabUnactiveText)';
                      onSelectVariable(key);
                      triggerInspectPopup(key, label);
                    } else {
                      setActiveFolderTab('all');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer border ${
                    activeFolderTab === 'all'
                      ? 'shadow-xs'
                      : 'hover:bg-white/5 opacity-85 border-transparent'
                  }`}
                  style={{
                    backgroundColor: activeFolderTab === 'all'
                      ? (extractAlphaPercent(colors.actionBarTabLine || '') < 100
                          ? toCssColor(colors.actionBarTabLine || '#a855f7')
                          : toCssColor(setHexAlpha(colors.actionBarTabLine || colors.actionBarTabActiveText || '#a855f7', 22)))
                      : 'transparent',
                    color: activeFolderTab === 'all'
                      ? toCssColor(colors.actionBarTabActiveText || colors.chats_unreadCounter || '#a855f7')
                      : toCssColor(adaptiveTabUnactiveText),
                    borderColor: activeFolderTab === 'all'
                      ? toCssColor(colors.actionBarTabLine || colors.chats_unreadCounter || '#a855f7')
                      : 'transparent',
                  }}
                >
                  <MessageCircle
                    {...inspectable(activeFolderTab === 'all' ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText', activeFolderTab === 'all' ? 'Active Folder Tab Icon (actionBarTabActiveText)' : 'Inactive Folder Tab Icon (actionBarTabUnactiveText)')}
                    className="w-3.5 h-3.5"
                  />
                  <span {...inspectable(activeFolderTab === 'all' ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText', activeFolderTab === 'all' ? 'Active Folder Tab Text (actionBarTabActiveText)' : 'Inactive Folder Tab Text (actionBarTabUnactiveText)')}>
                    All
                  </span>
                  <span
                    {...inspectable(
                      activeFolderTab === 'all' ? 'chats_tabUnreadActiveBackground' : 'chats_tabUnreadUnactiveBackground',
                      activeFolderTab === 'all' ? 'Active Tab Badge Background (chats_tabUnreadActiveBackground)' : 'Inactive Tab Badge Background (chats_tabUnreadUnactiveBackground)'
                    )}
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-bold inline-flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: activeFolderTab === 'all'
                        ? toCssColor(tabActiveBadgeBg)
                        : toCssColor(tabUnactiveBadgeBg),
                      color: activeFolderTab === 'all'
                        ? toCssColor(resolvedTabActiveBadgeText)
                        : toCssColor(resolvedTabUnactiveBadgeText),
                    }}
                  >
                    <span
                      {...inspectable(
                        activeFolderTab === 'all' ? 'chats_tabUnreadActiveText' : 'chats_tabUnreadUnactiveText',
                        activeFolderTab === 'all' ? 'Active Tab Badge Text (chats_tabUnreadActiveText)' : 'Inactive Tab Badge Text (chats_tabUnreadUnactiveText)'
                      )}
                      className="inline-block px-0.5 cursor-pointer font-bold"
                      style={{
                        color: activeFolderTab === 'all'
                          ? toCssColor(resolvedTabActiveBadgeText)
                          : toCssColor(resolvedTabUnactiveBadgeText),
                      }}
                    >
                      18
                    </span>
                  </span>
                </button>

                {/* Tab 2: Personal */}
                <button
                  {...inspectable(
                    activeFolderTab === 'personal' ? 'actionBarTabLine' : 'actionBarTabUnactiveText',
                    activeFolderTab === 'personal' ? 'Active Tab Indicator Pill / Label (actionBarTabLine)' : 'Inactive Folder Tab (actionBarTabUnactiveText)'
                  )}
                  onClick={(e) => {
                    if (inspectMode) {
                      e.stopPropagation();
                      const key = activeFolderTab === 'personal' ? 'actionBarTabLine' : 'actionBarTabUnactiveText';
                      const label = activeFolderTab === 'personal' ? 'Active Tab Indicator Pill / Label (actionBarTabLine)' : 'Inactive Folder Tab (actionBarTabUnactiveText)';
                      onSelectVariable(key);
                      triggerInspectPopup(key, label);
                    } else {
                      setActiveFolderTab('personal');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer border ${
                    activeFolderTab === 'personal'
                      ? 'shadow-xs'
                      : 'hover:bg-white/5 opacity-85 border-transparent'
                  }`}
                  style={{
                    backgroundColor: activeFolderTab === 'personal'
                      ? (extractAlphaPercent(colors.actionBarTabLine || '') < 100
                          ? toCssColor(colors.actionBarTabLine || '#a855f7')
                          : toCssColor(setHexAlpha(colors.actionBarTabLine || colors.actionBarTabActiveText || '#a855f7', 22)))
                      : 'transparent',
                    color: activeFolderTab === 'personal'
                      ? toCssColor(colors.actionBarTabActiveText || colors.chats_unreadCounter || '#a855f7')
                      : toCssColor(adaptiveTabUnactiveText),
                    borderColor: activeFolderTab === 'personal'
                      ? toCssColor(colors.actionBarTabLine || colors.chats_unreadCounter || '#a855f7')
                      : 'transparent',
                  }}
                >
                  <Folder
                    {...inspectable(activeFolderTab === 'personal' ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText', activeFolderTab === 'personal' ? 'Active Folder Tab Icon (actionBarTabActiveText)' : 'Inactive Folder Tab Icon (actionBarTabUnactiveText)')}
                    className="w-3.5 h-3.5"
                  />
                  <span {...inspectable(activeFolderTab === 'personal' ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText', activeFolderTab === 'personal' ? 'Active Folder Tab Text (actionBarTabActiveText)' : 'Inactive Folder Tab Text (actionBarTabUnactiveText)')}>
                    Personal
                  </span>
                  <span
                    {...inspectable(
                      activeFolderTab === 'personal' ? 'chats_tabUnreadActiveBackground' : 'chats_tabUnreadUnactiveBackground',
                      activeFolderTab === 'personal' ? 'Active Tab Badge Background (chats_tabUnreadActiveBackground)' : 'Inactive Tab Badge Background (chats_tabUnreadUnactiveBackground)'
                    )}
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-bold inline-flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: activeFolderTab === 'personal'
                        ? toCssColor(tabActiveBadgeBg)
                        : toCssColor(tabUnactiveBadgeBg),
                      color: activeFolderTab === 'personal'
                        ? toCssColor(resolvedTabActiveBadgeText)
                        : toCssColor(resolvedTabUnactiveBadgeText),
                    }}
                  >
                    <span
                      {...inspectable(
                        activeFolderTab === 'personal' ? 'chats_tabUnreadActiveText' : 'chats_tabUnreadUnactiveText',
                        activeFolderTab === 'personal' ? 'Active Tab Badge Text (chats_tabUnreadActiveText)' : 'Inactive Tab Badge Text (chats_tabUnreadUnactiveText)'
                      )}
                      className="inline-block px-0.5 cursor-pointer font-bold"
                      style={{
                        color: activeFolderTab === 'personal'
                          ? toCssColor(resolvedTabActiveBadgeText)
                          : toCssColor(resolvedTabUnactiveBadgeText),
                      }}
                    >
                      5
                    </span>
                  </span>
                </button>

                {/* Tab 3: Anime */}
                <button
                  {...inspectable(
                    activeFolderTab === 'anime' ? 'actionBarTabLine' : 'actionBarTabUnactiveText',
                    activeFolderTab === 'anime' ? 'Active Tab Indicator Pill / Label (actionBarTabLine)' : 'Inactive Folder Tab (actionBarTabUnactiveText)'
                  )}
                  onClick={(e) => {
                    if (inspectMode) {
                      e.stopPropagation();
                      const key = activeFolderTab === 'anime' ? 'actionBarTabLine' : 'actionBarTabUnactiveText';
                      const label = activeFolderTab === 'anime' ? 'Active Tab Indicator Pill / Label (actionBarTabLine)' : 'Inactive Folder Tab (actionBarTabUnactiveText)';
                      onSelectVariable(key);
                      triggerInspectPopup(key, label);
                    } else {
                      setActiveFolderTab('anime');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer border ${
                    activeFolderTab === 'anime'
                      ? 'shadow-xs'
                      : 'hover:bg-white/5 opacity-85 border-transparent'
                  }`}
                  style={{
                    backgroundColor: activeFolderTab === 'anime'
                      ? (extractAlphaPercent(colors.actionBarTabLine || '') < 100
                          ? toCssColor(colors.actionBarTabLine || '#a855f7')
                          : toCssColor(setHexAlpha(colors.actionBarTabLine || colors.actionBarTabActiveText || '#a855f7', 22)))
                      : 'transparent',
                    color: activeFolderTab === 'anime'
                      ? toCssColor(colors.actionBarTabActiveText || colors.chats_unreadCounter || '#a855f7')
                      : toCssColor(adaptiveTabUnactiveText),
                    borderColor: activeFolderTab === 'anime'
                      ? toCssColor(colors.actionBarTabLine || colors.chats_unreadCounter || '#a855f7')
                      : 'transparent',
                  }}
                >
                  <Folder
                    {...inspectable(activeFolderTab === 'anime' ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText', activeFolderTab === 'anime' ? 'Active Folder Tab Icon (actionBarTabActiveText)' : 'Inactive Folder Tab Icon (actionBarTabUnactiveText)')}
                    className="w-3.5 h-3.5 fill-current"
                  />
                  <span {...inspectable(activeFolderTab === 'anime' ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText', activeFolderTab === 'anime' ? 'Active Folder Tab Text (actionBarTabActiveText)' : 'Inactive Folder Tab Text (actionBarTabUnactiveText)')}>
                    Anime
                  </span>
                  <span
                    {...inspectable(
                      activeFolderTab === 'anime' ? 'chats_tabUnreadActiveBackground' : 'chats_tabUnreadUnactiveBackground',
                      activeFolderTab === 'anime' ? 'Active Tab Badge Background (chats_tabUnreadActiveBackground)' : 'Inactive Tab Badge Background (chats_tabUnreadUnactiveBackground)'
                    )}
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-bold shadow-xs inline-flex items-center justify-center cursor-pointer"
                    style={{
                      backgroundColor: activeFolderTab === 'anime'
                        ? toCssColor(tabActiveBadgeBg)
                        : toCssColor(tabUnactiveBadgeBg),
                      color: activeFolderTab === 'anime'
                        ? toCssColor(resolvedTabActiveBadgeText)
                        : toCssColor(resolvedTabUnactiveBadgeText),
                    }}
                  >
                    <span
                      {...inspectable(
                        activeFolderTab === 'anime' ? 'chats_tabUnreadActiveText' : 'chats_tabUnreadUnactiveText',
                        activeFolderTab === 'anime' ? 'Active Folder Tab Badge Text (chats_tabUnreadActiveText)' : 'Inactive Folder Tab Badge Text (chats_tabUnreadUnactiveText)'
                      )}
                      className="inline-block px-0.5 cursor-pointer font-bold"
                      style={{
                        color: activeFolderTab === 'anime'
                          ? toCssColor(resolvedTabActiveBadgeText)
                          : toCssColor(resolvedTabUnactiveBadgeText),
                      }}
                    >
                      2
                    </span>
                  </span>
                </button>
              </div>

              {/* IN-APP MINI MUSIC PLAYER BAR - CHATLIST VIEW */}
              {showMiniPlayer && (
                <div
                  {...inspectable('inappPlayerBackground', 'Mini Player Bar Background (inappPlayerBackground)')}
                  className="w-full px-3 py-1.5 flex items-center justify-between border-b border-black/10 z-20 transition-all cursor-pointer shadow-xs select-none"
                  style={{ backgroundColor: toCssColor(resolvedInappPlayerBg) }}
                  onClick={() => {
                    if (!inspectMode) {
                      setShowAudioPlayerModal(true);
                    }
                  }}
                  title="Click to open full player sheet"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      {...inspectable('inappPlayerPlayPause', 'Mini Player Play/Pause Button (inappPlayerPlayPause)')}
                      className="p-1 rounded-full hover:opacity-85 transition flex-shrink-0"
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('inappPlayerPlayPause');
                        } else {
                          e.stopPropagation();
                          setIsPlayingAudio(!isPlayingAudio);
                        }
                      }}
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4 fill-current" style={{ color: toCssColor(resolvedInappPlayerPlayPause) }} />
                      ) : (
                        <Play className="w-4 h-4 fill-current" style={{ color: toCssColor(resolvedInappPlayerPlayPause) }} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div
                        {...inspectable('inappPlayerTitle', 'Mini Player Track Title (inappPlayerTitle)')}
                        className="text-xs font-semibold truncate"
                        style={{ color: toCssColor(resolvedInappPlayerTitle) }}
                      >
                        Gotoubun no Kimochi
                      </div>
                      <div
                        {...inspectable('inappPlayerPerformer', 'Mini Player Performer / Artist (inappPlayerPerformer)')}
                        className="text-[11px] truncate opacity-90"
                        style={{ color: toCssColor(resolvedInappPlayerPerformer) }}
                      >
                        Nakano-ke no Itsutsugo
                      </div>
                    </div>
                  </div>
                  <button
                    {...inspectable('inappPlayerClose', 'Mini Player Close Button (inappPlayerClose)')}
                    className="p-1 hover:opacity-85 transition flex-shrink-0"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('inappPlayerClose');
                      } else {
                        e.stopPropagation();
                        setShowMiniPlayer(false);
                      }
                    }}
                    title="Close Mini Player"
                  >
                    <X className="w-4 h-4" style={{ color: toCssColor(resolvedInappPlayerClose) }} />
                  </button>
                </div>
              )}

              {/* Modern Telegram Android Stories Row */}
              <div
                className="w-full px-3 py-2 flex items-center gap-3 overflow-x-auto border-b select-none scrollbar-none"
                style={{
                  backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b'),
                  borderColor: toCssColor(colors.divider || '#111921'),
                }}
              >
                {[
                  { name: 'My Story', initials: '+', isMy: true },
                  { name: 'Ichika', initials: 'I', grad: 'from-amber-400 to-orange-500' },
                  { name: 'Nino', initials: 'N', grad: 'from-fuchsia-500 to-purple-600' },
                  { name: 'Miku', initials: 'M', grad: 'from-sky-400 to-indigo-600' },
                  { name: 'Yotsuba', initials: 'Y', grad: 'from-emerald-400 to-green-600' },
                  { name: 'Itsuki', initials: 'It', grad: 'from-rose-500 to-red-600' },
                ].map((st, sIdx) => (
                  <div key={sIdx} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
                    <div
                      className={`w-11 h-11 rounded-full p-0.5 flex items-center justify-center ${
                        st.isMy
                          ? 'border border-dashed border-sky-400'
                          : 'bg-gradient-to-tr from-sky-400 via-indigo-500 to-pink-500'
                      }`}
                    >
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                          st.grad ? `bg-gradient-to-tr ${st.grad}` : 'bg-slate-800'
                        }`}
                      >
                        {st.initials}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-medium truncate max-w-[48px]"
                      style={{ color: toCssColor(colors.windowBackgroundWhiteBlackText || '#ffffff') }}
                    >
                      {st.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chats List Items */}
              <div
                {...inspectable('windowBackgroundWhite', 'Chats List Background')}
                className="flex-1 overflow-y-auto divide-y select-none"
                style={{
                  backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b'),
                  borderColor: toCssColor(colors.divider || '#111921'),
                }}
              >
                {/* 1. ARCHIVED CHATS ROW */}
                <div
                  onClick={() => {
                    if (inspectMode) onSelectVariable('avatar_backgroundArchived');
                  }}
                  className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer"
                >
                  <div
                    {...inspectable('avatar_backgroundArchived', 'Archived Chats Avatar Background')}
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: toCssColor(colors.avatar_backgroundArchived || colors.chats_unreadCounter || '#e76a8f'),
                    }}
                  >
                    <Archive
                      {...inspectable('chats_archiveIcon', 'Archived Chats Box Icon')}
                      className="w-5 h-5 text-white"
                      style={{ color: toCssColor(colors.chats_archiveIcon || '#ffffff') }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        {...inspectable('chats_archiveText', 'Archived Chats Label Text')}
                        className="font-bold text-sm truncate"
                        style={{ color: toCssColor(colors.chats_archiveText || colors.chats_name || '#ffffff') }}
                      >
                        Archived Chats
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs truncate max-w-[200px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        <span
                          {...inspectable('chats_nameMessageArchived', 'Archived Chats Author Snippet')}
                          className="font-medium mr-1"
                          style={{
                            color: toCssColor(colors.chats_nameMessageArchived || colors.chats_nameMessage || colors.chats_unreadCounter || '#e76a8f'),
                          }}
                        >
                          Class 2-1 Notice,
                        </span>
                        Midterm schedule...
                      </p>
                      <span
                        {...inspectable('chats_unreadCounterMuted', 'Muted Unread Badge Background (chats_unreadCounterMuted)')}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: toCssColor(colors.chats_unreadCounterMuted || 'rgba(255,255,255,0.18)'),
                          color: toCssColor(resolvedUnreadCounterText),
                        }}
                      >
                        <span
                          {...inspectable('chats_unreadCounterText', 'Unread Counter Badge Text (chats_unreadCounterText)')}
                          className="inline-block px-0.5 cursor-pointer font-bold"
                          style={{ color: toCssColor(resolvedUnreadCounterText) }}
                        >
                          5
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. PINNED CHAT ROW: Nakano Study Group (Pinned Icon & Overlay) */}
                <div
                  {...inspectable('chats_pinnedOverlay', 'Pinned Chat Background Overlay')}
                  className="px-3 py-2.5 flex items-center gap-3 transition cursor-pointer relative"
                  style={{
                    backgroundColor: toCssColor(colors.chats_pinnedOverlay || '#14e76a8f'),
                  }}
                >
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                    NS
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        {...inspectable('chats_name', 'Chat Name')}
                        className="font-bold text-sm truncate"
                        style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                      >
                        Nakano Study Group
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Pin
                          {...inspectable('chats_pinnedIcon', 'Pinned Chat Pin Icon')}
                          className="w-3.5 h-3.5 fill-current rotate-45"
                          style={{ color: toCssColor(colors.chats_pinnedIcon || colors.chats_date || '#e76a8f') }}
                        />
                        <span
                          {...inspectable('chats_date', 'Chat Date/Time')}
                          className="text-[11px]"
                          style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                        >
                          12:44
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs truncate max-w-[200px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        <span
                          {...inspectable('chats_nameMessage', 'Author Name in Snippet')}
                          className="font-medium mr-1"
                          style={{ color: toCssColor(colors.chats_nameMessage || colors.chats_unreadCounter || '#e76a8f') }}
                        >
                          Miku:
                        </span>
                        <span
                          {...inspectable('chats_attachMessage', 'Attachment Indicator')}
                          style={{ color: toCssColor(colors.chats_attachMessage || colors.chats_nameMessage || '#e76a8f') }}
                        >
                          Photo
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. MUTED CHAT ROW: Gotoubun OST Channel (Mute Icon, Time & Muted Badge) */}
                <div
                  onClick={() => {
                    if (inspectMode) onSelectVariable('chats_muteIcon');
                  }}
                  className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          {...inspectable('chats_name', 'Chat Name')}
                          className="font-bold text-sm truncate"
                          style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                        >
                          Gotoubun OST Channel
                        </span>
                        <VolumeX
                          {...inspectable('chats_muteIcon', 'Chat List Mute Icon')}
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: toCssColor(colors.chats_muteIcon || colors.chats_date || '#7f93a5') }}
                        />
                      </div>
                      <span
                        {...inspectable('chats_date', 'Chat Date/Time')}
                        className="text-[11px]"
                        style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                      >
                        11:20
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs truncate max-w-[200px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        <span
                          {...inspectable('chats_nameMessage', 'Author Name in Snippet')}
                          className="font-medium mr-1"
                          style={{ color: toCssColor(colors.chats_nameMessage || colors.chats_unreadCounter || '#e76a8f') }}
                        >
                          Ichika:
                        </span>
                        🎵 New acoustic version out!
                      </p>
                      <span
                        {...inspectable('chats_unreadCounterMuted', 'Muted Unread Badge Background (chats_unreadCounterMuted)')}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: toCssColor(colors.chats_unreadCounterMuted || 'rgba(255,255,255,0.18)'),
                          color: toCssColor(resolvedUnreadCounterText),
                        }}
                      >
                        <span
                          {...inspectable('chats_unreadCounterText', 'Unread Counter Badge Text (chats_unreadCounterText)')}
                          className="inline-block px-0.5 cursor-pointer font-bold"
                          style={{ color: toCssColor(resolvedUnreadCounterText) }}
                        >
                          18
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. UNMUTED CHAT ROW: Nino Nakano */}
                <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm">
                    NN
                    <span
                      {...inspectable('chats_onlineCircle', 'Online Indicator')}
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 shadow-xs"
                      style={{ backgroundColor: toCssColor(colors.chats_onlineCircle || '#10b981') }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        {...inspectable('chats_name', 'Chat Name')}
                        className="font-bold text-sm truncate"
                        style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                      >
                        Nino Nakano
                      </span>
                      <span
                        {...inspectable('chats_date', 'Chat Date')}
                        className="text-[11px]"
                        style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                      >
                        12:45
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        {...inspectable('chats_message', 'Message Snippet')}
                        className="text-xs truncate max-w-[200px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        <span
                          {...inspectable('chats_nameMessage', 'Author Name in Snippet')}
                          className="font-medium mr-1"
                          style={{ color: toCssColor(colors.chats_nameMessage || colors.chats_unreadCounter || '#4ea4f5') }}
                        >
                          Nino:
                        </span>
                        Don't be late for our cafe shift!
                      </p>
                      <span
                        {...inspectable('chats_unreadCounter', 'Unread Counter Badge (chats_unreadCounter)')}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm cursor-pointer"
                        style={{
                          backgroundColor: toCssColor(colors.chats_unreadCounter || '#4ea4f5'),
                          color: toCssColor(resolvedUnreadCounterText),
                        }}
                      >
                        <span
                          {...inspectable('chats_unreadCounterText', 'Unread Counter Badge Text (chats_unreadCounterText)')}
                          className="inline-block px-0.5 cursor-pointer font-bold"
                          style={{ color: toCssColor(resolvedUnreadCounterText) }}
                        >
                          3
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chat Row 2 */}
                <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                    <Bookmark className="w-6 h-6 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="font-bold text-sm truncate"
                        style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                      >
                        Saved Messages
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                      >
                        Yesterday
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs truncate max-w-[220px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        <span
                          {...inspectable('chats_attachMessage', 'Attachment Indicator')}
                          className="font-medium mr-1"
                          style={{ color: toCssColor(colors.chats_attachMessage || colors.chats_nameMessage || colors.chats_unreadCounter || '#4ea4f5') }}
                        >
                          📁 File:
                        </span>
                        Midterm_Study_Notes.pdf (4.8 MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Row 3 */}
                <div className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition cursor-pointer">
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm">
                    IN
                    <span
                      {...inspectable('chats_onlineCircle', 'Online Indicator')}
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 shadow-xs"
                      style={{ backgroundColor: toCssColor(colors.chats_onlineCircle || '#10b981') }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="font-bold text-sm truncate"
                        style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                      >
                        Itsuki Nakano
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          {...inspectable('chats_sentReadCheck', 'Sent/Read Checks (Chat List)')}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable('chats_sentReadCheck');
                            }
                          }}
                          className="cursor-pointer flex items-center"
                          title="Chat List Read Checkmark (chats_sentReadCheck)"
                        >
                          <CheckCheck
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: toCssColor(colors.chats_sentReadCheck || colors.chats_sentCheck || colors.chat_outSentCheckRead || colors.chat_outSentCheck || '#4ea4f5') }}
                          />
                        </span>
                        <span
                          {...inspectable('chats_pinnedIcon', 'Pinned Icon')}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable('chats_pinnedIcon');
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <Pin
                            className="w-3 h-3 rotate-45"
                            style={{ color: toCssColor(colors.chats_pinnedIcon || colors.chats_unreadCounter || '#e76a8f') }}
                          />
                        </span>
                        <span
                          {...inspectable('chats_date', 'Chat Date')}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable('chats_date');
                            }
                          }}
                          className="text-[11px] cursor-pointer"
                          style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                        >
                          Sun
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        {...inspectable('chats_message', 'Message Snippet')}
                        className="text-xs truncate max-w-[200px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        Thanks for the math summary!
                      </p>
                      <span
                        {...inspectable('chats_sentCheck', 'Chat List Sent Tickmark')}
                        onClick={(e) => {
                          if (inspectMode) {
                            e.stopPropagation();
                            onSelectVariable('chats_sentCheck');
                          }
                        }}
                        className="cursor-pointer flex items-center"
                        title="Chat List Sent Tickmark (chats_sentCheck)"
                      >
                        <Check
                          className="w-3.5 h-3.5"
                          style={{ color: toCssColor(colors.chats_sentCheck || colors.chats_sentReadCheck || colors.chat_outSentCheck || '#4ea4f5') }}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chat Row 4 */}
                <div
                  onClick={() => setIsChatSelectionMode(!isChatSelectionMode)}
                  className={`px-3 py-2.5 flex items-center gap-3 transition cursor-pointer ${
                    isChatSelectionMode ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm">
                    {isChatSelectionMode ? (
                      <CheckCheck
                        className="w-6 h-6"
                        style={{ color: toCssColor(colors.actionBarActionModeDefaultIcon || colors.chats_unreadCounter || '#e76a8f') }}
                      />
                    ) : (
                      'YN'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="font-bold text-sm truncate"
                        style={{ color: toCssColor(colors.chats_name || '#ffffff') }}
                      >
                        Yotsuba Nakano
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: toCssColor(colors.chats_date || '#7f93a5') }}
                      >
                        Oct 10
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs truncate max-w-[210px]"
                        style={{ color: toCssColor(colors.chats_message || '#7f93a5') }}
                      >
                        <span
                          {...inspectable('windowBackgroundWhiteBlueText3', 'Username (@username)')}
                          className="font-semibold mr-1.5"
                          style={{
                            color: toCssColor(colors.windowBackgroundWhiteBlueText3 || colors.telegram_color_text || colors.chats_unreadCounter || '#e76a8f'),
                          }}
                        >
                          @yotsuba_428
                        </span>
                        Tap to test selection mode
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

              {/* FLOATING ACTION BUTTON (PENCIL FAB) */}
              <div className="absolute right-4 bottom-6 z-30">
                <button
                  {...inspectable('chats_actionBackground', 'New Chat FAB Button')}
                  className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition active:scale-95"
                  style={{
                    backgroundColor: toCssColor(colors.chats_actionBackground || colors.chats_actionFAB || '#4ea4f5'),
                  }}
                >
                  <Edit3
                    className="w-6 h-6"
                    style={{ color: toCssColor(colors.chats_actionIcon || colors.chats_actionFABIcon || '#ffffff') }}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: PROFILE / SETTINGS SCREEN ================= */}
          {currentView === 'profile' && (
            <div
              {...inspectable('windowBackgroundGray', 'Profile Backdrop (windowBackgroundGray)')}
              className="relative flex-1 flex flex-col overflow-hidden"
              style={{
                backgroundColor: toCssColor(colors.windowBackgroundGray || colors.chat_wallpaper || '#0e1621'),
              }}
            >
              {/* Profile Top Header Hero */}
              <div
                {...inspectable('actionBarDefault', 'Profile Action Bar (actionBarDefault)')}
                className="px-3 pt-2 pb-4 shrink-0 shadow-sm relative z-20"
                style={{
                  backgroundColor: toCssColor(colors.actionBarDefault || '#17212b'),
                }}
              >
                {/* Nav Row */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    {...inspectable('actionBarDefaultIcon', 'Back Arrow Icon')}
                    className="p-1.5 rounded-full hover:bg-white/10 transition"
                    style={{ color: toCssColor(resolvedActionBarIcon) }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      {...inspectable('actionBarDefaultIcon', 'Video Call Icon')}
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      style={{ color: toCssColor(resolvedActionBarIcon) }}
                    >
                      <Video className="w-4.5 h-4.5" />
                    </button>
                    <button
                      {...inspectable('actionBarDefaultIcon', 'Voice Call Icon')}
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      style={{ color: toCssColor(resolvedActionBarIcon) }}
                    >
                      <Phone className="w-4.5 h-4.5" />
                    </button>
                    <button
                      {...inspectable('actionBarDefaultIcon', 'More Options Icon')}
                      className="p-1.5 rounded-full hover:bg-white/10 transition"
                      style={{ color: toCssColor(resolvedActionBarIcon) }}
                    >
                      <MoreVertical className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Avatar & Display Name */}
                <div className="flex items-center gap-3.5 px-1">
                  <div
                    {...inspectable('avatar_backgroundBlue', 'Profile Avatar Background')}
                    className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md ring-2 ring-white/15 shrink-0"
                    style={{
                      backgroundColor: toCssColor(colors.avatar_backgroundBlue || colors.chats_unreadCounter || '#2AABEE'),
                    }}
                  >
                    NS
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      {...inspectable('actionBarDefaultTitle', 'Profile Name Title')}
                      className="font-semibold text-base truncate flex items-center gap-1.5"
                      style={{ color: toCssColor(colors.actionBarDefaultTitle || '#ffffff') }}
                    >
                      <span>Nakano Study Group</span>
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px]"
                        style={{
                          backgroundColor: toCssColor(colors.chats_unreadCounter || '#2AABEE'),
                          color: '#ffffff',
                        }}
                      >
                        ✓
                      </span>
                    </div>
                    <p
                      {...inspectable('actionBarDefaultSubtitle', 'Profile Online Subtitle')}
                      className="text-xs truncate"
                      style={{ color: toCssColor(colors.actionBarDefaultSubtitle || '#7f93a5') }}
                    >
                      6 members, 5 online
                    </p>
                  </div>
                </div>

                {/* Floating Message FAB overlapping header */}
                <button
                  {...inspectable('chats_actionFAB', 'Profile Message FAB')}
                  className="absolute right-4 -bottom-5 w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition active:scale-95 z-30"
                  style={{
                    backgroundColor: toCssColor(colors.chats_actionFAB || colors.chats_unreadCounter || '#2AABEE'),
                  }}
                >
                  <MessageCircle
                    className="w-5 h-5"
                    style={{ color: toCssColor(colors.chats_actionFABIcon || '#ffffff') }}
                  />
                </button>
              </div>

              {/* Scrollable Profile Cards */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pb-6">
                {/* Info Section Card */}
                <div
                  {...inspectable('windowBackgroundWhite', 'Profile Info Card Surface')}
                  className="px-4 py-3.5 space-y-3 shadow-xs"
                  style={{
                    backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b'),
                  }}
                >
                  <div
                    {...inspectable('windowBackgroundWhiteBlueHeader', 'Section Header Accent')}
                    className="text-xs font-semibold"
                    style={{ color: toCssColor(resolvedSectionBlueHeader) }}
                  >
                    Info
                  </div>

                  {/* Bio Row */}
                  <div className="space-y-0.5">
                    <div
                      {...inspectable('windowBackgroundWhiteBlackText', 'Primary Info Text')}
                      className="text-xs leading-relaxed"
                      style={{ color: toCssColor(colors.windowBackgroundWhiteBlackText || '#ffffff') }}
                    >
                      Study schedules, mock exam prep, and weekend cafe meetups for Ichika, Nino, Miku, Yotsuba, Itsuki, and Fuutarou.
                    </div>
                    <div
                      {...inspectable('windowBackgroundWhiteGrayText', 'Secondary Label Text')}
                      className="text-[11px]"
                      style={{ color: toCssColor(colors.windowBackgroundWhiteGrayText || '#7f93a5') }}
                    >
                      Description
                    </div>
                  </div>

                  <div
                    {...inspectable('divider', 'Section Divider Line')}
                    className="h-px w-full"
                    style={{ backgroundColor: toCssColor(colors.divider || '#111921') }}
                  />

                  {/* Username Row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        {...inspectable('windowBackgroundWhiteBlueText3', 'Username Link Text')}
                        className="text-xs font-medium flex items-center gap-1"
                        style={{
                          color: toCssColor(
                            colors.windowBackgroundWhiteBlueText3 ||
                              colors.windowBackgroundWhiteValueText ||
                              themeAccent
                          ),
                        }}
                      >
                        <AtSign className="w-3.5 h-3.5" />
                        <span>nakano_study_group</span>
                      </div>
                      <div
                        {...inspectable('windowBackgroundWhiteGrayText', 'Username Sublabel')}
                        className="text-[11px]"
                        style={{ color: toCssColor(colors.windowBackgroundWhiteGrayText || '#7f93a5') }}
                      >
                        Public Invite Link
                      </div>
                    </div>
                    <QrCode
                      className="w-4.5 h-4.5"
                      style={{ color: toCssColor(themeAccent) }}
                    />
                  </div>

                  <div
                    {...inspectable('divider', 'Section Divider Line')}
                    className="h-px w-full"
                    style={{ backgroundColor: toCssColor(colors.divider || '#111921') }}
                  />

                  {/* Notifications Switch Row */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-3">
                      <Bell
                        className="w-4.5 h-4.5"
                        style={{ color: toCssColor(colors.windowBackgroundWhiteGrayText || '#7f93a5') }}
                      />
                      <div>
                        <div
                          {...inspectable('windowBackgroundWhiteBlackText', 'Notifications Label')}
                          className="text-xs font-medium"
                          style={{ color: toCssColor(colors.windowBackgroundWhiteBlackText || '#ffffff') }}
                        >
                          Notifications
                        </div>
                        <div
                          {...inspectable('windowBackgroundWhiteGrayText', 'Notifications Status')}
                          className="text-[11px]"
                          style={{ color: toCssColor(colors.windowBackgroundWhiteGrayText || '#7f93a5') }}
                        >
                          {profileNotificationsOn ? 'On' : 'Muted'}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      {...inspectable('switchTrackChecked', 'Toggle Switch Track')}
                      onClick={(e) => {
                        if (inspectMode) {
                          e.stopPropagation();
                          onSelectVariable('switchTrackChecked');
                        } else {
                          setProfileNotificationsOn(!profileNotificationsOn);
                        }
                      }}
                      className="w-10 h-5 rounded-full relative transition-colors flex items-center px-0.5"
                      style={{
                        backgroundColor: profileNotificationsOn
                          ? toCssColor(colors.switchTrackChecked || themeAccent)
                          : toCssColor(colors.switchTrack || '#3a4756'),
                      }}
                    >
                      <span
                        {...inspectable('switchThumbChecked', 'Toggle Switch Thumb')}
                        className={`w-4 h-4 rounded-full shadow transition-transform ${
                          profileNotificationsOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                        style={{
                          backgroundColor: profileNotificationsOn
                            ? toCssColor(colors.switchThumbChecked || '#ffffff')
                            : toCssColor(colors.switchThumb || '#94a3b8'),
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Settings Quick Rows Card */}
                <div
                  {...inspectable('windowBackgroundWhite', 'Profile Actions Card')}
                  className="px-4 py-3 space-y-2.5 shadow-xs"
                  style={{
                    backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b'),
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Shield
                        className="w-4 h-4"
                        style={{ color: toCssColor(themeAccent) }}
                      />
                      <span style={{ color: toCssColor(colors.windowBackgroundWhiteBlackText || '#ffffff') }}>
                        Group Type
                      </span>
                    </div>
                    <span
                      {...inspectable('windowBackgroundWhiteValueText', 'Settings Value Accent')}
                      className="font-mono text-[11px] font-medium"
                      style={{ color: toCssColor(colors.windowBackgroundWhiteValueText || themeAccent) }}
                    >
                      Public Group
                    </span>
                  </div>

                  <div
                    className="h-px w-full"
                    style={{ backgroundColor: toCssColor(colors.divider || '#111921') }}
                  />

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Link2
                        className="w-4 h-4"
                        style={{ color: toCssColor(themeAccent) }}
                      />
                      <span style={{ color: toCssColor(colors.windowBackgroundWhiteBlackText || '#ffffff') }}>
                        Shared Links
                      </span>
                    </div>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: toCssColor(colors.windowBackgroundWhiteGrayText || '#7f93a5') }}
                    >
                      128
                    </span>
                  </div>
                </div>

                {/* Shared Media Tabs Card */}
                <div
                  {...inspectable('windowBackgroundWhite', 'Shared Media Card')}
                  className="shadow-xs"
                  style={{
                    backgroundColor: toCssColor(colors.windowBackgroundWhite || '#17212b'),
                  }}
                >
                  <div
                    className="grid grid-cols-4 border-b text-[11px] font-medium"
                    style={{ borderColor: toCssColor(colors.divider || '#111921') }}
                  >
                    {(['media', 'files', 'links', 'music'] as const).map(tab => {
                      const active = activeProfileTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          {...inspectable(
                            active ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText',
                            active ? 'Active Profile Tab' : 'Inactive Profile Tab'
                          )}
                          onClick={(e) => {
                            if (inspectMode) {
                              e.stopPropagation();
                              onSelectVariable(active ? 'actionBarTabActiveText' : 'actionBarTabUnactiveText');
                            } else {
                              setActiveProfileTab(tab);
                            }
                          }}
                          className="py-2.5 capitalize relative text-center transition"
                          style={{
                            color: active
                              ? toCssColor(colors.actionBarTabActiveText || themeAccent)
                              : toCssColor(colors.actionBarTabUnactiveText || colors.windowBackgroundWhiteGrayText || '#7f93a5'),
                          }}
                        >
                          {tab}
                          {active && (
                            <span
                              className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                              style={{ backgroundColor: toCssColor(colors.actionBarTabLine || themeAccent) }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sample Media Grid */}
                  <div className="p-2.5 grid grid-cols-3 gap-1.5">
                    {[
                      { bg: colors.chat_outBubble || '#2b5278', label: '0:42' },
                      { bg: colors.chat_inBubble || '#182533', label: 'PNG' },
                      { bg: colors.actionBarDefault || '#1c242d', label: '1:18' },
                      { bg: colors.chats_unreadCounter || '#4ea4f5', label: 'Theme' },
                      { bg: colors.chat_wallpaper || '#0e1621', label: 'HD' },
                      { bg: colors.chat_outBubbleSelected || '#356391', label: 'ZIP' },
                    ].map((tile, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg relative overflow-hidden border border-white/10 flex items-end p-1.5"
                        style={{ backgroundColor: toCssColor(tile.bg) }}
                      >
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-white/90">
                          {tile.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= FULL AUDIO PLAYER SHEET / CARD ================= */}
          {showAudioPlayerModal && (
            <div
              {...inspectable('player_background', 'Player Sheet Background (player_background)')}
              className="absolute inset-0 z-50 flex flex-col animate-in slide-in-from-bottom duration-250 select-none"
              style={{
                backgroundColor: toCssColor(resolvedPlayerBg),
              }}
            >
              {/* Audio Player Action Bar Header */}
              <div
                {...inspectable('player_actionBar', 'Player Header Bar (player_actionBar)')}
                className="w-full h-14 px-3 flex items-center justify-between border-b border-black/10 flex-shrink-0"
                style={{
                  backgroundColor: toCssColor(resolvedPlayerActionBar),
                }}
              >
                <button
                  {...inspectable('player_actionBarItems', 'Player Collapse Chevron (player_actionBarItems)')}
                  className="p-1.5 rounded-full hover:bg-black/10 transition"
                  onClick={(e) => {
                    if (inspectMode) {
                      e.stopPropagation();
                      onSelectVariable('player_actionBarItems');
                    } else {
                      setShowAudioPlayerModal(false);
                    }
                  }}
                  title="Collapse Player"
                >
                  <ChevronDown
                    className="w-6 h-6"
                    style={{ color: toCssColor(resolvedPlayerActionBarItems) }}
                  />
                </button>

                <div className="flex-1 min-w-0 text-center px-2">
                  <div
                    {...inspectable('player_actionBarTitle', 'Player Track Title (player_actionBarTitle)')}
                    className="font-bold text-sm truncate"
                    style={{ color: toCssColor(resolvedPlayerActionBarTitle) }}
                  >
                    Gotoubun no Kimochi
                  </div>
                  <div
                    {...inspectable('player_actionBarSubtitle', 'Player Subtitle / Playlist (player_actionBarSubtitle)')}
                    className="text-xs truncate font-medium opacity-85"
                    style={{ color: toCssColor(resolvedPlayerActionBarSubtitle) }}
                  >
                    Nakano-ke no Itsutsugo • OST
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    {...inspectable('player_actionBarItems', 'Player Share Button (player_actionBarItems)')}
                    className="p-1.5 rounded-full hover:bg-black/10 transition"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_actionBarItems');
                      }
                    }}
                    title="Share track"
                  >
                    <Forward
                      className="w-5 h-5"
                      style={{ color: toCssColor(resolvedPlayerActionBarItems) }}
                    />
                  </button>
                  <button
                    {...inspectable('player_actionBarItems', 'Player Options Menu (player_actionBarItems)')}
                    className="p-1.5 rounded-full hover:bg-black/10 transition"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_actionBarItems');
                      }
                    }}
                    title="Options"
                  >
                    <MoreVertical
                      className="w-5 h-5"
                      style={{ color: toCssColor(resolvedPlayerActionBarItems) }}
                    />
                  </button>
                </div>
              </div>

              {/* Player Body & Album Art */}
              <div className="flex-1 px-6 py-6 flex flex-col items-center justify-between overflow-y-auto">
                {/* Artwork square placeholder */}
                <div
                  {...inspectable('player_placeholderBackground', 'Artwork Placeholder Box (player_placeholderBackground)')}
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-3xl flex items-center justify-center shadow-2xl my-auto transition-transform active:scale-98"
                  style={{
                    backgroundColor: toCssColor(resolvedPlayerPlaceholderBg),
                  }}
                >
                  <Music
                    {...inspectable('player_placeholder', 'Album Art Music Icon (player_placeholder)')}
                    className="w-24 h-24"
                    style={{ color: toCssColor(resolvedPlayerPlaceholder) }}
                  />
                </div>

                {/* Track Details & Seekbar */}
                <div className="w-full mt-4 mb-2">
                  <div className="text-left mb-4">
                    <h2
                      {...inspectable('player_actionBarTitle', 'Song Title (player_actionBarTitle)')}
                      className="text-lg font-bold truncate"
                      style={{ color: toCssColor(resolvedPlayerActionBarTitle) }}
                    >
                      Gotoubun no Kimochi
                    </h2>
                    <p
                      {...inspectable('player_actionBarSubtitle', 'Artist (player_actionBarSubtitle)')}
                      className="text-sm font-medium opacity-85 truncate"
                      style={{ color: toCssColor(resolvedPlayerActionBarSubtitle) }}
                    >
                      Nakano-ke no Itsutsugo
                    </p>
                  </div>

                  {/* Progress Seekbar */}
                  <div className="w-full flex flex-col gap-1.5">
                    <div
                      {...inspectable('player_progressBackground', 'Seekbar Unplayed Line (player_progressBackground)')}
                      className="w-full h-1.5 rounded-full relative overflow-visible cursor-pointer"
                      style={{
                        backgroundColor: toCssColor(resolvedPlayerProgressBg),
                      }}
                    >
                      <div
                        {...inspectable('player_progress', 'Seekbar Played Fill & Thumb (player_progress)')}
                        className="h-full rounded-full relative"
                        style={{
                          width: '38%',
                          backgroundColor: toCssColor(resolvedPlayerProgress),
                        }}
                      >
                        <div
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full shadow-md"
                          style={{
                            backgroundColor: toCssColor(resolvedPlayerProgress),
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono px-0.5">
                      <span
                        {...inspectable('player_time', 'Playback Elapsed Time (player_time)')}
                        style={{ color: toCssColor(resolvedPlayerTime) }}
                      >
                        0:42
                      </span>
                      <span
                        {...inspectable('player_time', 'Playback Total Duration (player_time)')}
                        style={{ color: toCssColor(resolvedPlayerTime) }}
                      >
                        3:38
                      </span>
                    </div>
                  </div>
                </div>

                {/* Media Playback Controls Row */}
                <div className="w-full flex items-center justify-between px-2 pt-2 pb-4">
                  <button
                    {...inspectable('player_buttonActive', 'Repeat Track Active (player_buttonActive)')}
                    className="p-2 rounded-full hover:bg-black/10 transition"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_buttonActive');
                      }
                    }}
                    title="Repeat track"
                  >
                    <Repeat
                      className="w-5 h-5"
                      style={{ color: toCssColor(resolvedPlayerButtonActive) }}
                    />
                  </button>

                  <button
                    {...inspectable('player_button', 'Previous Track Button (player_button)')}
                    className="p-2 rounded-full hover:bg-black/10 transition"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_button');
                      }
                    }}
                    title="Previous track"
                  >
                    <SkipBack
                      className="w-6 h-6 fill-current"
                      style={{ color: toCssColor(resolvedPlayerButton) }}
                    />
                  </button>

                  {/* Play/Pause Main Action Button */}
                  <button
                    {...inspectable('player_button', 'Play/Pause Action Button (player_button)')}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition transform active:scale-95"
                    style={{
                      backgroundColor: toCssColor(resolvedPlayerProgress),
                      color: '#ffffff',
                    }}
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_button');
                      } else {
                        setIsPlayingAudio(!isPlayingAudio);
                      }
                    }}
                    title="Play/Pause"
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    {...inspectable('player_button', 'Next Track Button (player_button)')}
                    className="p-2 rounded-full hover:bg-black/10 transition"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_button');
                      }
                    }}
                    title="Next track"
                  >
                    <SkipForward
                      className="w-6 h-6 fill-current"
                      style={{ color: toCssColor(resolvedPlayerButton) }}
                    />
                  </button>

                  <button
                    {...inspectable('player_button', 'Shuffle Mode Button (player_button)')}
                    className="p-2 rounded-full hover:bg-black/10 transition opacity-80 hover:opacity-100"
                    onClick={(e) => {
                      if (inspectMode) {
                        e.stopPropagation();
                        onSelectVariable('player_button');
                      }
                    }}
                    title="Shuffle"
                  >
                    <Shuffle
                      className="w-5 h-5"
                      style={{ color: toCssColor(resolvedPlayerButton) }}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Android Home Navigation Bar Pill */}
          <div className="w-full h-4 bg-black/60 flex items-center justify-center select-none shrink-0">
            <div className="w-24 h-1 rounded-full bg-white/30" />
          </div>
        </div>
      </div>

      {/* Bottom Stage Bar: Mobile Quick-Inspect Bar (when Inspect ON) or Viewport Zoom Controls */}
      {isMobileLayout && inspectMode && selectedVariableKey ? (
        <div
          aria-label="Selected element inspector"
          className="absolute bottom-2.5 left-3 right-3 max-w-[380px] mx-auto bg-surface-panel/95 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl border border-brand-500/40 flex items-center gap-2.5 text-xs shadow-xl z-20"
          style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.7), 0 0 18px -4px var(--color-brand-glow)' }}
        >
          {/* Live tappable color swatch */}
          <label
            className="relative w-7 h-7 rounded-lg border border-white/25 shadow-inner shrink-0 overflow-hidden cursor-pointer"
            style={{ backgroundColor: toCssColor(selectedHex) }}
            title="Tap to change color"
          >
            {onColorChange && (
              <input
                type="color"
                value={selectedBaseHex}
                onChange={e => {
                  const next =
                    selectedAlpha < 100
                      ? setHexAlpha(e.target.value, selectedAlpha)
                      : e.target.value;
                  onColorChange(selectedVariableKey, next);
                }}
                aria-label={`Change color for ${selectedVariableKey}`}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            )}
          </label>

          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] font-semibold text-white truncate leading-tight">
              {selectedVariableKey}
            </div>
            <div className="text-[10px] text-slate-400 font-mono uppercase leading-tight mt-0.5">
              {selectedHex} · Tap phone to inspect
            </div>
          </div>

          {onEditSelectedVariable && (
            <button
              type="button"
              onClick={() => onEditSelectedVariable(selectedVariableKey)}
              className="px-2.5 py-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-brand-300 text-[11px] font-semibold whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              Edit →
            </button>
          )}
        </div>
      ) : (
        <nav
          aria-label="Canvas viewport controls"
          className={`absolute left-1/2 -translate-x-1/2 bg-surface-panel/90 backdrop-blur-md rounded-full border border-surface-border flex items-center text-xs text-slate-300 shadow-xl z-20 whitespace-nowrap ${
            isMobileLayout ? 'bottom-2.5 px-2.5 py-1 gap-1.5' : 'bottom-4 px-3 py-1.5 gap-2.5'
          }`}
        >
          <button
            type="button"
            onClick={onZoomOut}
            className="hover:text-white p-1 rounded-full hover:bg-surface-card transition cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-slate-300 min-w-[36px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="hover:text-white p-1 rounded-full hover:bg-surface-card transition cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <div className="h-3.5 w-px bg-surface-border" />
          <button
            type="button"
            onClick={onFitScreen}
            className="hover:text-white text-[11px] px-2 py-0.5 rounded hover:bg-surface-card transition font-medium cursor-pointer"
          >
            {isMobileLayout ? 'Fit' : 'Fit Screen'}
          </button>
          {!isMobileLayout && (
            <button
              type="button"
              onClick={onResetZoom}
              className="hover:text-white text-[11px] px-2 py-0.5 rounded hover:bg-surface-card transition font-medium cursor-pointer"
            >
              Reset
            </button>
          )}
        </nav>
      )}
    </div>
  );
};
