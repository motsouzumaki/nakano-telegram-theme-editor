import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  Undo2,
  Redo2,
  MessageSquare,
  List,
  Settings,
  MousePointerClick,
  Pencil,
  Volume2,
  Search,
  Mic,
  Music,
  Sparkles,
  MoreVertical,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { StudioView, PreviewToggles } from '../types/theme';
import { toCssColor } from '../utils/colorUtils';
import appIcon from '../assets/app-icon.png';

interface NavbarProps {
  themeName: string;
  onThemeNameChange: (name: string) => void;
  currentView: StudioView;
  onViewChange: (view: StudioView) => void;
  inspectMode: boolean;
  onToggleInspectMode: () => void;
  adaptiveStudioTheme: boolean;
  onToggleAdaptiveStudioTheme: () => void;
  studioMoodLabel?: string;
  onExportClick: () => void;
  onImportClick: () => void;
  onCopyClick: () => void;
  copied: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  previewToggles: PreviewToggles;
  onTogglePreview: (key: keyof PreviewToggles) => void;
  activeTargetKey: string;
  activeTargetHex: string;
  isMobileLayout?: boolean;
  showMobilePreviewControls?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  themeName,
  onThemeNameChange,
  currentView,
  onViewChange,
  inspectMode,
  onToggleInspectMode,
  adaptiveStudioTheme,
  onToggleAdaptiveStudioTheme,
  studioMoodLabel,
  onExportClick,
  onImportClick,
  onCopyClick,
  copied,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  previewToggles,
  onTogglePreview,
  activeTargetKey,
  activeTargetHex,
  isMobileLayout = false,
  showMobilePreviewControls = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(themeName);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileTogglesRow, setShowMobileTogglesRow] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftName(themeName);
  }, [themeName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // Close mobile overflow menu on outside tap or Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed) {
      onThemeNameChange(trimmed);
    } else {
      setDraftName(themeName);
    }
    setIsEditingName(false);
  };

  const activePreviewToggleCount = [
    previewToggles.reactions,
    previewToggles.channelMute,
    previewToggles.search,
    previewToggles.voiceBar,
    previewToggles.miniPlayer,
    previewToggles.emojiHints,
  ].filter(Boolean).length;

  const previewToggleButtons = (
    <>
      <button
        type="button"
        onClick={() => onTogglePreview('reactions')}
        className={`px-2.5 py-1 md:py-0.5 rounded-full border flex items-center gap-1 whitespace-nowrap transition cursor-pointer shrink-0 ${
          previewToggles.reactions
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400 font-medium'
            : 'border-surface-border bg-surface-card/60 hover:bg-surface-card text-slate-300'
        }`}
      >
        <span>❤️</span>
        <span>Reactions</span>
      </button>

      <button
        type="button"
        onClick={() => onTogglePreview('channelMute')}
        className={`px-2.5 py-1 md:py-0.5 rounded-full border flex items-center gap-1 whitespace-nowrap transition cursor-pointer shrink-0 ${
          previewToggles.channelMute
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400 font-medium'
            : 'border-surface-border bg-surface-card/60 hover:bg-surface-card text-slate-300'
        }`}
      >
        <Volume2
          className={`w-3 h-3 ${previewToggles.channelMute ? 'text-brand-400' : 'text-slate-400'}`}
        />
        <span>Channel Mute</span>
      </button>

      <button
        type="button"
        onClick={() => onTogglePreview('search')}
        className={`px-2.5 py-1 md:py-0.5 rounded-full border flex items-center gap-1 whitespace-nowrap transition cursor-pointer shrink-0 ${
          previewToggles.search
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400 font-medium'
            : 'border-surface-border bg-surface-card/60 hover:bg-surface-card text-slate-300'
        }`}
      >
        <Search className={`w-3 h-3 ${previewToggles.search ? 'text-brand-400' : 'text-slate-400'}`} />
        <span>Search</span>
      </button>

      <button
        type="button"
        onClick={() => onTogglePreview('voiceBar')}
        className={`px-2.5 py-1 md:py-0.5 rounded-full border flex items-center gap-1 whitespace-nowrap transition cursor-pointer shrink-0 ${
          previewToggles.voiceBar
            ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 font-medium'
            : 'border-surface-border bg-surface-card/60 hover:bg-surface-card text-slate-300'
        }`}
      >
        <Mic className={`w-3 h-3 ${previewToggles.voiceBar ? 'text-rose-400' : 'text-slate-400'}`} />
        <span>Voice Bar</span>
      </button>

      <button
        type="button"
        onClick={() => onTogglePreview('miniPlayer')}
        className={`px-2.5 py-1 md:py-0.5 rounded-full border flex items-center gap-1 whitespace-nowrap transition cursor-pointer shrink-0 ${
          previewToggles.miniPlayer
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400 font-medium'
            : 'border-surface-border bg-surface-card/60 hover:bg-surface-card text-slate-300'
        }`}
      >
        <Music
          className={`w-3 h-3 ${previewToggles.miniPlayer ? 'text-brand-400' : 'text-slate-400'}`}
        />
        <span>Mini Player</span>
      </button>

      <button
        type="button"
        onClick={() => onTogglePreview('emojiHints')}
        className={`px-2.5 py-1 md:py-0.5 rounded-full border flex items-center gap-1 whitespace-nowrap transition cursor-pointer shrink-0 ${
          previewToggles.emojiHints
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-400 font-medium'
            : 'border-surface-border bg-surface-card/60 hover:bg-surface-card text-slate-300'
        }`}
      >
        <span>✨</span>
        <span>Emoji Hints</span>
      </button>
    </>
  );

  // ================= MOBILE HEADER & COMPACT PREVIEW BAR (< 768px) =================
  if (isMobileLayout) {
    return (
      <div className="relative shrink-0 z-30 select-none">
        <header className="h-[52px] border-b border-surface-border bg-surface-panel/85 backdrop-blur-xl px-3 flex items-center justify-between gap-2 transition-colors duration-300">
          {/* Left: Compact Brand + Active Theme Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src={appIcon}
              alt="Nakano Theme Editor"
              className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(235,75,56,0.35)]"
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[13.5px] leading-tight tracking-tight text-white truncate">
                Nakano Theme Editor
              </div>
              <div className="text-[10px] leading-tight text-slate-400 truncate">
                {themeName || 'My Custom Android Theme'}
              </div>
            </div>
          </div>

          {/* Right: Undo/Redo, Export CTA, Overflow Menu */}
          <div className="flex items-center gap-1.5 shrink-0" ref={mobileMenuRef}>
            <div className="flex items-center bg-surface-base rounded-lg border border-surface-border p-0.5">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className={`p-1.5 rounded transition ${
                  canUndo
                    ? 'text-slate-200 active:bg-surface-card cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Redo"
                className={`p-1.5 rounded transition ${
                  canRedo
                    ? 'text-slate-200 active:bg-surface-card cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onExportClick}
              className="studio-btn-primary px-2.5 py-1.5 text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-label="More options"
              aria-expanded={isMobileMenuOpen}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isMobileMenuOpen
                  ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                  : 'border-surface-border bg-surface-card/50 text-slate-300'
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </button>

            {/* Anchored Mobile Overflow Popover */}
            {isMobileMenuOpen && (
              <div
                role="menu"
                aria-label="Theme options"
                className="absolute right-3 top-[calc(100%+6px)] w-68 max-w-[calc(100vw-24px)] rounded-2xl bg-surface-panel/98 backdrop-blur-xl border border-surface-border p-2.5 space-y-2 z-50 animate-fade-in"
                style={{
                  boxShadow:
                    '0 20px 50px rgba(0,0,0,0.88), 0 0 28px var(--color-brand-glow)',
                }}
              >
                {/* Inline Theme Name Editor */}
                <div className="space-y-1 pb-2 border-b border-surface-border/70">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 block">
                    Theme Name
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={e => {
                      setDraftName(e.target.value);
                      if (e.target.value.trim()) {
                        onThemeNameChange(e.target.value);
                      }
                    }}
                    onBlur={commitName}
                    placeholder="My Custom Android Theme"
                    className="studio-input w-full px-2.5 py-1.5 text-xs"
                  />
                </div>

                {/* Import Action */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onImportClick();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-surface-card text-xs text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="font-medium">Import Theme or Photo</span>
                </button>

                {/* Copy Code Action */}
                <button
                  type="button"
                  onClick={() => {
                    onCopyClick();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-surface-card text-xs text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-medium">
                    {copied ? 'Copied .attheme Code!' : 'Copy .attheme Code'}
                  </span>
                </button>

                {/* Adaptive Wallpaper UI Toggle */}
                <button
                  type="button"
                  onClick={onToggleAdaptiveStudioTheme}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-surface-card text-xs text-slate-200 flex items-center justify-between gap-2 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Sparkles
                      className={`w-4 h-4 shrink-0 ${
                        adaptiveStudioTheme ? 'text-brand-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="min-w-0 text-left">
                      <span className="font-medium block leading-tight">Adaptive Wallpaper UI</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {adaptiveStudioTheme
                          ? studioMoodLabel || 'Synced to wallpaper'
                          : 'Default dark studio'}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`w-8 h-4.5 rounded-full relative transition-colors shrink-0 ${
                      adaptiveStudioTheme ? 'bg-brand-500' : 'bg-surface-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        adaptiveStudioTheme ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Compact Preview Controls Strip (ONLY when viewing the live Phone Preview tab on mobile) */}
        {showMobilePreviewControls && (
          <div className="bg-surface-panel/70 backdrop-blur-lg border-b border-surface-border transition-colors duration-300">
            <div className="h-[42px] px-3 flex items-center justify-between gap-2">
              {/* Segmented Preview View Switcher */}
              <nav
                aria-label="Preview views"
                className="bg-surface-base p-0.5 rounded-lg border border-surface-border flex items-center gap-0.5 text-[11px] min-w-0"
              >
                <button
                  type="button"
                  onClick={() => onViewChange('chat')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                    currentView === 'chat'
                      ? 'bg-surface-card text-brand-400 shadow-xs border border-brand-500/25'
                      : 'text-slate-400 border border-transparent'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewChange('chatlist')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                    currentView === 'chatlist'
                      ? 'bg-surface-card text-brand-400 shadow-xs border border-brand-500/25'
                      : 'text-slate-400 border border-transparent'
                  }`}
                >
                  <List className="w-3 h-3 shrink-0" />
                  <span>List</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewChange('profile')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                    currentView === 'profile'
                      ? 'bg-surface-card text-brand-400 shadow-xs border border-brand-500/25'
                      : 'text-slate-400 border border-transparent'
                  }`}
                >
                  <Settings className="w-3 h-3 shrink-0" />
                  <span>Profile</span>
                </button>
              </nav>

              {/* Right: Inspect Toggle + Collapsible Preview Toggles Trigger */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleInspectMode}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    inspectMode
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : 'border-surface-border bg-surface-card/50 text-slate-400'
                  }`}
                >
                  <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden min-[380px]:inline">Inspect</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMobileTogglesRow(prev => !prev)}
                  aria-expanded={showMobileTogglesRow}
                  title="Preview feature toggles"
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    showMobileTogglesRow
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : 'border-surface-border bg-surface-card/50 text-slate-300'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3 shrink-0" />
                  {activePreviewToggleCount > 0 && (
                    <span className="text-[9.5px] font-mono px-1 rounded-full bg-brand-500/25 text-brand-300 leading-tight">
                      {activePreviewToggleCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Preview Toggles Strip */}
            {showMobileTogglesRow && (
              <div className="px-3 py-2 border-t border-surface-border/70 bg-surface-base/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] animate-fade-in">
                {previewToggleButtons}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ================= TABLET & DESKTOP HEADER (>= 768px) =================
  return (
    <div className="relative shrink-0 z-30 select-none">
      {/* BEGIN: TopGlobalNavigationHeader */}
      <header className="h-14 border-b border-surface-border bg-surface-panel/80 backdrop-blur-xl px-4 flex items-center justify-between gap-3 transition-colors duration-300">
        {/* Left branding & inline editable project title */}
        <div className="flex items-center gap-2.5 lg:gap-3 min-w-0">
          {/* Nakano App Icon */}
          <img
            src={appIcon}
            alt="Nakano Theme Editor"
            className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_6px_14px_rgba(235,75,56,0.35)]"
          />

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-sm tracking-tight text-white">Nakano</span>
            <span className="hidden lg:inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30 font-mono">
              THEME EDITOR
            </span>
          </div>

          <div className="h-4 w-px bg-surface-border mx-0.5 hidden lg:block shrink-0" />

          {/* Inline Editable Theme Title */}
          <div className="hidden lg:flex items-center min-w-0">
            {isEditingName ? (
              <input
                ref={inputRef}
                type="text"
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') {
                    setDraftName(themeName);
                    setIsEditingName(false);
                  }
                }}
                className="w-[150px] 2xl:w-[180px] text-xs font-medium text-white bg-surface-base border border-brand-500/60 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                title="Click to rename theme"
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-surface-card transition cursor-pointer group min-w-0"
              >
                <span className="max-w-[115px] xl:max-w-[135px] 2xl:max-w-[165px] truncate font-medium text-slate-200">
                  {themeName || 'My Custom Android Theme'}
                </span>
                <Pencil className="w-3 h-3 text-slate-400 group-hover:text-brand-400 transition shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Center View Switcher & Inspect Mode */}
        <div className="flex items-center gap-1.5 shrink-0">
          <nav
            aria-label="Preview views"
            className="bg-surface-base p-1 rounded-lg border border-surface-border flex items-center gap-1 text-xs shrink-0"
          >
            <button
              type="button"
              onClick={() => onViewChange('chat')}
              title="Chat View"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                currentView === 'chat'
                  ? 'bg-surface-card text-brand-400 shadow-sm border border-brand-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card/60 border border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Chat View</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('chatlist')}
              title="Chats List"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                currentView === 'chatlist'
                  ? 'bg-surface-card text-brand-400 shadow-sm border border-brand-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card/60 border border-transparent'
              }`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Chats List</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('profile')}
              title="Profile"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                currentView === 'profile'
                  ? 'bg-surface-card text-brand-400 shadow-sm border border-brand-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card/60 border border-transparent'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Profile</span>
            </button>
          </nav>

          {/* Inspect Mode Toggle with [I] shortcut */}
          <button
            type="button"
            onClick={onToggleInspectMode}
            title="Click any element on the phone preview to jump to its token (Shortcut: I)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
              inspectMode
                ? 'border-brand-500/50 bg-brand-500/15 text-white'
                : 'border-surface-border bg-surface-card/60 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
            style={
              inspectMode
                ? { boxShadow: '0 0 16px -3px var(--color-brand-glow)' }
                : undefined
            }
          >
            <MousePointerClick
              className={`w-3.5 h-3.5 shrink-0 ${inspectMode ? 'text-brand-400' : 'text-slate-400'}`}
            />
            <span className="hidden xl:inline">Inspect</span>
            <kbd
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                inspectMode
                  ? 'bg-brand-500/20 border-brand-400/40 text-brand-300'
                  : 'bg-surface-base border-surface-border text-slate-400'
              }`}
            >
              I
            </kbd>
          </button>

          {/* Adaptive Wallpaper App Theme Toggle */}
          <button
            type="button"
            onClick={onToggleAdaptiveStudioTheme}
            title={
              adaptiveStudioTheme
                ? `Adaptive Wallpaper UI: ON (${studioMoodLabel || 'Synced to wallpaper'}) — Click for default studio dark`
                : 'Adaptive Wallpaper UI: OFF — Click to adapt the web app to your wallpaper'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
              adaptiveStudioTheme
                ? 'border-brand-500/45 bg-brand-500/15 text-brand-300 hover:bg-brand-500/20'
                : 'border-surface-border bg-surface-card/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
            style={
              adaptiveStudioTheme
                ? { boxShadow: '0 0 14px -4px var(--color-brand-glow)' }
                : undefined
            }
          >
            <Sparkles
              className={`w-3.5 h-3.5 shrink-0 ${
                adaptiveStudioTheme ? 'text-brand-400' : 'text-slate-400'
              }`}
            />
            <span className="hidden 2xl:inline">Wallpaper UI</span>
            <span
              className={`w-2 h-2 rounded-full border border-white/30 transition-all shrink-0 ${
                adaptiveStudioTheme ? 'bg-brand-400 scale-100' : 'bg-slate-600 scale-90'
              }`}
            />
          </button>
        </div>

        {/* Right: Undo/Redo, Copy Code, Import, Export CTA */}
        <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          {/* Undo / Redo */}
          <div className="flex items-center bg-surface-base rounded-lg border border-surface-border p-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
              className={`p-1.5 rounded transition ${
                canUndo
                  ? 'text-slate-300 hover:text-white hover:bg-surface-card cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title={canRedo ? 'Redo (Ctrl+Shift+Z)' : 'Nothing to redo'}
              className={`p-1.5 rounded transition ${
                canRedo
                  ? 'text-slate-300 hover:text-white hover:bg-surface-card cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy Code */}
          <button
            type="button"
            onClick={onCopyClick}
            title="Copy .attheme code to clipboard"
            className="px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface-card/40 text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-card flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden xl:inline">{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          {/* Import */}
          <button
            type="button"
            onClick={onImportClick}
            title="Import .attheme, .zip, or wallpaper image"
            className="px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface-card/40 text-xs font-medium text-slate-300 hover:text-white hover:bg-surface-card flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline">Import</span>
          </button>

          {/* Primary Export CTA */}
          <button
            type="button"
            onClick={onExportClick}
            title="Export ready-to-use Telegram .attheme file"
            className="studio-btn-primary px-3 lg:px-3.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Export Theme (.attheme)</span>
            <span className="xl:hidden">Export</span>
          </button>
        </div>
      </header>
      {/* END: TopGlobalNavigationHeader */}

      {/* BEGIN: ContextStateQuickBar */}
      <aside className="h-10 bg-surface-panel/60 backdrop-blur-lg border-b border-surface-border px-4 lg:px-6 flex items-center justify-between gap-4 text-xs text-slate-400 transition-colors duration-300">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
            Preview toggles:
          </span>
          {previewToggleButtons}
        </div>

        {/* Active element telemetry hint */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            Active Target:{' '}
            <span className="text-slate-200 font-medium">{activeTargetKey}</span>{' '}
            <span className="inline-flex items-center gap-1">
              (
              <span
                className="inline-block w-2 h-2 rounded-full border border-white/25"
                style={{ backgroundColor: toCssColor(activeTargetHex) }}
              />
              <span className="text-brand-400">{activeTargetHex.toLowerCase()}</span>)
            </span>
          </span>
        </div>
      </aside>
      {/* END: ContextStateQuickBar */}
    </div>
  );
};
