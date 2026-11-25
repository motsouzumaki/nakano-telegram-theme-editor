import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Search, X, Copy, Check } from 'lucide-react';
import type { ThemeColors, ThemeSettings } from '../types/theme';
import {
  getContrastRatio,
  blend,
  extractAlphaPercent,
  setHexAlpha,
  getBaseRgbHex,
  toCssColor,
} from '../utils/colorUtils';

export interface StudioTokenItem {
  key: string;
  description: string;
  supportsAlpha?: boolean;
  defaultFallback: string;
}

export interface StudioTokenGroup {
  id: string;
  title: string;
  dotColorKey: string;
  dotFallback: string;
  tokens: StudioTokenItem[];
}

export const STUDIO_TOKEN_GROUPS: StudioTokenGroup[] = [
  {
    id: 'chrome',
    title: 'Chrome & Action Bars',
    dotColorKey: 'actionBarDefault',
    dotFallback: '#17212b',
    tokens: [
      { key: 'actionBarDefault', description: 'Main header toolbar', defaultFallback: '#17212b' },
      { key: 'actionBarDefaultTitle', description: 'Top header title typography', defaultFallback: '#ffffff' },
      { key: 'actionBarDefaultSubtitle', description: 'Member count & online status', defaultFallback: '#7f93a5' },
      { key: 'actionBarDefaultIcon', description: 'Header back, search & overflow icons', defaultFallback: '#ffffff' },
      { key: 'chat_topPanelBackground', description: 'Pinned message banner background', defaultFallback: '#17212b' },
      { key: 'inappPlayerBackground', description: 'Audio mini player bar surface', defaultFallback: '#18222d' },
    ],
  },
  {
    id: 'bubbles',
    title: 'Bubbles & Messages',
    dotColorKey: 'chat_outBubble',
    dotFallback: '#2b5278',
    tokens: [
      {
        key: 'chat_outBubble',
        description: 'Outgoing chat bubble background',
        supportsAlpha: true,
        defaultFallback: '#2b5278',
      },
      {
        key: 'chat_inBubble',
        description: 'Incoming message background',
        supportsAlpha: true,
        defaultFallback: '#182533',
      },
      {
        key: 'chat_outBubbleSelected',
        description: 'Selected outgoing message highlight',
        supportsAlpha: true,
        defaultFallback: '#356391',
      },
      { key: 'chat_messageTextOut', description: 'Outgoing message text color', defaultFallback: '#ffffff' },
      { key: 'chat_messageTextIn', description: 'Incoming message text color', defaultFallback: '#ffffff' },
      { key: 'chat_outTimeText', description: 'Timestamp and checks color', defaultFallback: '#7097c2' },
      { key: 'chat_inTimeText', description: 'Incoming timestamp color', defaultFallback: '#6d8397' },
    ],
  },
  {
    id: 'accents',
    title: 'Accents, Links & Badges',
    dotColorKey: 'chats_unreadCounter',
    dotFallback: '#2AABEE',
    tokens: [
      { key: 'chat_outSentCheck', description: 'Double read checkmarks', defaultFallback: '#4ea4f5' },
      { key: 'chat_messagePanelSend', description: 'Send & voice note FAB button', defaultFallback: '#4ea4f5' },
      { key: 'chat_messagePanelBackground', description: 'Bottom input composer surface', defaultFallback: '#17212b' },
      { key: 'chats_unreadCounter', description: 'Unread badge & accent pills', defaultFallback: '#4ea4f5' },
      { key: 'chats_actionFAB', description: 'Floating action button background', defaultFallback: '#4ea4f5' },
      { key: 'chat_outReplyLine', description: 'Outgoing reply quote accent bar', defaultFallback: '#8bc4f7' },
      { key: 'chat_inReplyLine', description: 'Incoming reply quote accent bar', defaultFallback: '#64b5ef' },
      { key: 'windowBackgroundWhiteBlueHeader', description: 'Profile & settings section header', defaultFallback: '#4ea4f5' },
    ],
  },
];

export const STUDIO_TOKEN_KEYS = new Set(
  STUDIO_TOKEN_GROUPS.flatMap(g => g.tokens.map(t => t.key))
);

interface LeftToolRailProps {
  colors: ThemeColors;
  settings: ThemeSettings;
  selectedVariableKey?: string;
  selectTrigger?: number;
  onSelectVariable: (key: string) => void;
  onSettingsChange: (partial: Partial<ThemeSettings>) => void;
  onColorChange: (key: string, hex: string) => void;
  onOpenDeepInspect: () => void;
  variant?: 'rail' | 'panel';
  className?: string;
}

export const LeftToolRail: React.FC<LeftToolRailProps> = ({
  colors,
  settings,
  selectedVariableKey,
  selectTrigger,
  onSelectVariable,
  onSettingsChange,
  onColorChange,
  onOpenDeepInspect,
  variant = 'rail',
  className = '',
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    chrome: true,
    bubbles: true,
    accents: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTokenRef = useRef<HTMLDivElement | null>(null);
  const activeFocusedKey = selectedVariableKey || 'chat_outBubble';
  const configuredTokenCount = Object.keys(colors).length;

  const handleCopyKey = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1600);
  };

  // When a variable in the Left Rail is selected (e.g. via Inspect Mode click), expand its group and scroll into view
  useEffect(() => {
    if (!selectedVariableKey || !selectTrigger) return;
    if (STUDIO_TOKEN_KEYS.has(selectedVariableKey)) {
      const group = STUDIO_TOKEN_GROUPS.find(g => g.tokens.some(t => t.key === selectedVariableKey));
      if (group) {
        setSearchQuery('');
        setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
        setTimeout(() => {
          activeTokenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
      }
    }
  }, [selectedVariableKey, selectTrigger]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return STUDIO_TOKEN_GROUPS;
    return STUDIO_TOKEN_GROUPS.map(group => {
      const groupMatches = group.title.toLowerCase().includes(normalizedQuery);
      const matchingTokens = groupMatches
        ? group.tokens
        : group.tokens.filter(
            t =>
              t.description.toLowerCase().includes(normalizedQuery) ||
              t.key.toLowerCase().includes(normalizedQuery)
          );
      return { ...group, tokens: matchingTokens };
    }).filter(group => group.tokens.length > 0);
  }, [normalizedQuery]);

  // Real-time WCAG contrast ratio audit for outgoing bubble text vs bubble surface
  const wcagAudit = useMemo(() => {
    const rawWallpaperBg = getBaseRgbHex(colors.chat_wallpaper || '#0e1621');
    const wallpaperBg =
      settings.wallpaperDim > 0
        ? blend(rawWallpaperBg, '#000000', settings.wallpaperDim / 100)
        : rawWallpaperBg;

    const rawOutBubble = colors.chat_outBubble || '#2b5278';
    const outAlpha = extractAlphaPercent(rawOutBubble) / 100;
    // blend(c1, c2, ratio) weights c2 by ratio, so wallpaper is c1 and bubble is c2
    const effectiveBubbleBg =
      outAlpha < 1
        ? blend(wallpaperBg, getBaseRgbHex(rawOutBubble), outAlpha)
        : getBaseRgbHex(rawOutBubble);

    const outText = getBaseRgbHex(colors.chat_messageTextOut || '#ffffff');
    const ratio = getContrastRatio(effectiveBubbleBg, outText);
    const formattedRatio = Math.min(21, ratio).toFixed(1);

    let level: 'AAA' | 'AA' | 'AA Large' | 'Fail';
    let badgeClasses: string;
    let scoreText: string;
    let scoreColor: string;
    let description: string;

    if (ratio >= 7.0) {
      level = 'AAA';
      badgeClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      scoreText = '100% Optimal';
      scoreColor = 'text-emerald-400';
      description = 'Outgoing bubble text passes contrast ratio for small text on dark backgrounds.';
    } else if (ratio >= 4.5) {
      level = 'AA';
      badgeClasses = 'bg-brand-500/20 text-brand-400 border-brand-500/30';
      scoreText = `${Math.round(Math.min(98, 78 + (ratio - 4.5) * 8))}% Strong`;
      scoreColor = 'text-brand-400';
      description = 'Outgoing bubble text passes WCAG AA readability for standard body text.';
    } else if (ratio >= 3.0) {
      level = 'AA Large';
      badgeClasses = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      scoreText = `${Math.round(55 + (ratio - 3.0) * 14)}% Moderate`;
      scoreColor = 'text-amber-300';
      description = 'Contrast is marginal for small chat messages. Consider brightening text or darkening the bubble.';
    } else {
      level = 'Fail';
      badgeClasses = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      scoreText = `${Math.max(15, Math.round(ratio * 18))}% Low`;
      scoreColor = 'text-rose-400';
      description = 'Outgoing bubble text is hard to read against its background. Auto-fix recommended.';
    }

    return {
      ratio,
      formattedRatio,
      level,
      badgeClasses,
      scoreText,
      scoreColor,
      description,
      effectiveBubbleBg,
    };
  }, [colors.chat_outBubble, colors.chat_messageTextOut, colors.chat_wallpaper, settings.wallpaperDim]);

  const handleAutoFixContrast = () => {
    const bg = wcagAudit.effectiveBubbleBg;
    const whiteRatio = getContrastRatio(bg, '#ffffff');
    const darkSlateRatio = getContrastRatio(bg, '#0f172a');
    const blackRatio = getContrastRatio(bg, '#000000');

    // Mathematically max(whiteRatio, blackRatio) >= 4.58:1 for any sRGB background
    let bestText = '#ffffff';
    if (darkSlateRatio >= whiteRatio && darkSlateRatio >= 4.5) {
      bestText = '#0f172a';
    } else if (blackRatio > whiteRatio) {
      bestText = '#000000';
    }

    onColorChange('chat_messageTextOut', bestText);
  };

  const containerClasses =
    variant === 'panel'
      ? `w-full h-full bg-surface-panel/80 backdrop-blur-xl p-4 pb-6 flex flex-col gap-5 overflow-y-auto select-none transition-colors duration-300 ${className}`
      : `w-80 border-r border-surface-border bg-surface-panel/75 backdrop-blur-xl p-4 pb-6 flex-col gap-5 overflow-y-auto shrink-0 hidden lg:flex select-none transition-colors duration-300 ${className}`;

  return (
    <aside
      className={containerClasses}
      data-purpose="telegram-tokens-rail"
    >
      {/* Telegram UI Color Tokens Section (Moved from Right Rail) */}
      <section aria-labelledby="left-token-groups-heading" className="space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate"
            id="left-token-groups-heading"
          >
            Telegram UI Colors
          </h2>
          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap shrink-0">
            {configuredTokenCount} active
          </span>
        </div>

        {/* Quick Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by name or token..."
            aria-label="Filter UI colors by name or token"
            className="w-full bg-surface-card border border-surface-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500/60 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-4 rounded-xl border border-surface-border bg-surface-card/50 text-center space-y-2">
            <p className="text-xs text-slate-400">No quick colors match &ldquo;{searchQuery}&rdquo;.</p>
            <div className="flex items-center justify-center gap-3 text-[11px]">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer"
              >
                Clear filter
              </button>
              <button
                type="button"
                onClick={onOpenDeepInspect}
                className="text-brand-400 hover:text-brand-300 font-medium cursor-pointer"
              >
                Search all in Inspect →
              </button>
            </div>
          </div>
        ) : (
          filteredGroups.map(group => {
            const isExpanded = normalizedQuery ? true : !!expandedGroups[group.id];
            const containsSelected = group.tokens.some(t => t.key === activeFocusedKey);
            const dotColor = toCssColor(colors[group.dotColorKey] || group.dotFallback);

            return (
              <div
                key={group.id}
                className={`rounded-xl border bg-surface-card overflow-hidden transition ${
                  containsSelected
                    ? 'border-brand-500/50 ring-1 ring-brand-500/20'
                    : 'border-surface-border'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                  className={`w-full p-3 flex items-center justify-between text-xs transition cursor-pointer ${
                    containsSelected
                      ? 'font-semibold text-white bg-brand-500/5'
                      : 'font-medium text-slate-200 hover:bg-surface-cardHover'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="truncate">{group.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-slate-400 shrink-0">
                      {group.tokens.length}
                    </span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp
                      className={`w-3.5 h-3.5 shrink-0 ${containsSelected ? 'text-brand-400' : 'text-slate-400'}`}
                    />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-surface-border/60 pt-2.5 text-xs">
                    {group.tokens.map(token => {
                      const rawValue = colors[token.key] || token.defaultFallback;
                      const baseHex = getBaseRgbHex(rawValue);
                      const alphaPercent = extractAlphaPercent(rawValue);
                      const isFocused = activeFocusedKey === token.key;

                      if (isFocused) {
                        return (
                          <div
                            key={token.key}
                            ref={activeTokenRef}
                            className="p-2.5 rounded-lg bg-surface-panel border border-brand-500/40 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <span
                                  className="text-xs font-semibold text-brand-400 block leading-snug"
                                  title={token.description}
                                >
                                  {token.description}
                                </span>
                                <span
                                  className="font-mono text-[10px] text-slate-400 block truncate mt-0.5"
                                  title={token.key}
                                >
                                  {token.key}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={e => handleCopyKey(e, token.key)}
                                title={`Copy token name (${token.key})`}
                                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition shrink-0 cursor-pointer"
                              >
                                {copiedKey === token.key ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {/* Color Picker Swatch + Hex Input */}
                            <div className="flex items-center gap-2">
                              <label
                                className="relative w-8 h-8 sm:w-7 sm:h-7 rounded-md border border-white/20 shadow-inner cursor-pointer shrink-0 overflow-hidden"
                                style={{ backgroundColor: toCssColor(rawValue) }}
                                title={`Pick color for ${token.description}`}
                              >
                                <input
                                  type="color"
                                  value={baseHex}
                                  onChange={e => {
                                    const nextHex =
                                      alphaPercent < 100
                                        ? setHexAlpha(e.target.value, alphaPercent)
                                        : e.target.value;
                                    onColorChange(token.key, nextHex);
                                  }}
                                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                />
                              </label>
                              <input
                                type="text"
                                value={rawValue}
                                onChange={e => onColorChange(token.key, e.target.value)}
                                aria-label={`Hex color for ${token.description}`}
                                className="flex-1 min-w-0 bg-surface-base font-mono text-[11px] px-2 py-1.5 rounded-md border border-surface-border text-slate-200 uppercase focus:outline-none focus:border-brand-500"
                              />
                            </div>

                            {/* Alpha Opacity Slider */}
                            <div className="space-y-1 pt-0.5">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>
                                  {token.supportsAlpha ? 'Bubble Opacity' : 'Opacity'}
                                </span>
                                <span className="font-mono text-slate-200">{alphaPercent}%</span>
                              </div>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                value={alphaPercent}
                                onChange={e => {
                                  const updated = setHexAlpha(rawValue, Number(e.target.value));
                                  onColorChange(token.key, updated);
                                }}
                                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={token.key}
                          onClick={() => onSelectVariable(token.key)}
                          className="flex items-center justify-between gap-2.5 py-2 sm:py-1.5 px-2 -mx-1.5 rounded-lg hover:bg-surface-cardHover cursor-pointer transition group"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-xs font-medium text-slate-200 group-hover:text-white truncate leading-snug"
                              title={token.description}
                            >
                              {token.description}
                            </div>
                            <div
                              className="font-mono text-[10px] text-slate-400 truncate mt-0.5"
                              title={token.key}
                            >
                              {token.key}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div
                              className="w-5 h-5 rounded-md border border-white/20 shadow-inner"
                              style={{ backgroundColor: toCssColor(rawValue) }}
                            />
                            <span className="font-mono text-[10px] text-slate-400 group-hover:text-slate-300 uppercase">
                              {rawValue}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        <button
          type="button"
          onClick={onOpenDeepInspect}
          className="w-full py-2 rounded-lg border border-surface-border bg-surface-card/40 hover:bg-surface-card text-[11px] font-medium text-brand-400 hover:text-brand-300 transition cursor-pointer"
        >
          Browse all Telegram tokens in Inspect →
        </button>
      </section>

      {/* WCAG Contrast Auditor Card */}
      <div
        className="p-3.5 rounded-xl border border-surface-border bg-surface-card relative shrink-0"
        data-purpose="contrast-badge"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Accessibility</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border font-mono ${wcagAudit.badgeClasses}`}
          >
            WCAG {wcagAudit.level} {wcagAudit.formattedRatio}:1
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{wcagAudit.description}</p>

        {wcagAudit.ratio < 4.5 && (
          <button
            type="button"
            onClick={handleAutoFixContrast}
            className="mt-2.5 w-full py-1.5 px-2.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/35 text-brand-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Auto-Fix Text Contrast</span>
          </button>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-surface-border">
          <span>Readability score</span>
          <span className={`font-mono font-semibold ${wcagAudit.scoreColor}`}>
            {wcagAudit.scoreText}
          </span>
        </div>
      </div>

      {/* Quick Wallpaper Filter Controls */}
      <div className="p-3.5 rounded-xl border border-surface-border bg-surface-card flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Wallpaper Filter</span>
          <span className="text-[11px] text-brand-400 font-mono">dim: {settings.wallpaperDim}%</span>
        </div>

        {/* Dim slider (0-100%) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Dim</span>
            <span className="font-mono text-slate-300">{settings.wallpaperDim}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.wallpaperDim}
            onChange={e => onSettingsChange({ wallpaperDim: Number(e.target.value) })}
            className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
        </div>

        {/* Blur slider (0-20px) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Blur</span>
            <span className="font-mono text-slate-300">{settings.wallpaperBlur}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            value={settings.wallpaperBlur}
            onChange={e => onSettingsChange({ wallpaperBlur: Number(e.target.value) })}
            className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
        </div>
      </div>
    </aside>
  );
};
