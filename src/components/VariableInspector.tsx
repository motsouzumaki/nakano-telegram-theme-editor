import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  List,
  Sliders,
  Layout,
  Pin,
  CheckCheck,
  Mic,
  FileText,
  Send,
  Image as ImageIcon,
  Folder,
  Bell,
  Archive,
  PlusCircle,
  CheckSquare,
  Sparkles,
  User,
  Search,
  X,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Zap,
  CornerUpRight,
} from 'lucide-react';
import type { ThemeColors, ThemeSettings, StudioView } from '../types/theme';
import { TELEGRAM_VARIABLES } from '../data/telegramVariables';
import {
  INSPECTOR_AREAS,
  getAreasForView,
  findAreaForVariable,
  isKeyInSimulatorPreview,
  CHAT_SIMULATOR_KEYS,
  CHATLIST_SIMULATOR_KEYS,
} from '../data/inspectorAreas';
import { ColorPicker } from './ColorPicker';
import {
  extractAlphaPercent,
  setHexAlpha,
  ensureContrast,
  getLuminance,
  blend,
  getThemeDarkBase,
  resolveBadgeTextColor,
  getContrastRatio,
  adjustBrightness,
} from '../utils/colorUtils';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  MessageSquare,
  List,
  Sliders,
  Layout,
  Pin,
  CheckCheck,
  Mic,
  FileText,
  Send,
  Image: ImageIcon,
  Folder,
  Bell,
  Archive,
  PlusCircle,
  CheckSquare,
  Sparkles,
  User,
  CornerUpRight,
};

interface VariableInspectorProps {
  colors: ThemeColors;
  settings: ThemeSettings;
  currentView?: StudioView;
  onViewChange?: (view: StudioView) => void;
  onColorChange: (key: string, hex: string) => void;
  selectedVariableKey?: string;
  selectTrigger?: number;
  onSelectVariable: (key: string) => void;
}

export const VariableInspector: React.FC<VariableInspectorProps> = ({
  colors,
  currentView = 'chat',
  onViewChange,
  onColorChange,
  selectedVariableKey,
  selectTrigger,
  onSelectVariable,
}) => {
  const resolveScope = (view: StudioView): 'chat' | 'chatlist' | 'dialogs' =>
    view === 'profile' ? 'dialogs' : view;

  // Active scope strictly tied to current view: 'chat' | 'chatlist' | 'dialogs'
  const [activeScope, setActiveScope] = useState<'chat' | 'chatlist' | 'dialogs'>(() => resolveScope(currentView));
  // Area filter within active scope: 'all' or specific areaId
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  // Filter mode: 'all' (all editable for view) | 'onscreen' (only rendered on simulator) | 'modified' (only customized)
  const [filterMode, setFilterMode] = useState<'all' | 'onscreen' | 'modified'>('all');
  // Accordion state for areas: areaId -> boolean (default all expanded)
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    INSPECTOR_AREAS.forEach(area => {
      initial[area.id] = true;
    });
    return initial;
  });

  // Copied feedback key
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Ref to automatically scroll to inspect variable
  const inspectedCardRef = useRef<HTMLDivElement | null>(null);

  // Synchronize activeScope whenever currentView changes externally (from Navbar or PhoneSimulator)
  useEffect(() => {
    setActiveScope(resolveScope(currentView));
    setSelectedAreaFilter('all');
  }, [currentView]);

  // Variable lookup map for fast retrieval
  const variableMap = useMemo(() => {
    const map = new Map<string, (typeof TELEGRAM_VARIABLES)[0]>();
    TELEGRAM_VARIABLES.forEach(v => map.set(v.key, v));
    return map;
  }, []);

  // When selectedVariableKey changes (from simulator inspection), auto-switch scope and expand area
  useEffect(() => {
    if (selectedVariableKey) {
      const area = findAreaForVariable(selectedVariableKey, currentView === 'profile' ? 'chat' : currentView);
      if (area) {
        // If current scope does not match the variable's scope, switch to it
        if (activeScope !== area.view) {
          setActiveScope(area.view);
          if (area.view === 'chat' || area.view === 'chatlist') {
            onViewChange?.(area.view);
          }
        }

        // Reset area filter if it was hiding this area
        if (selectedAreaFilter !== 'all' && selectedAreaFilter !== area.id) {
          setSelectedAreaFilter('all');
        }

        // Expand the area containing this variable
        setExpandedAreas(prev => ({
          ...prev,
          [area.id]: true,
        }));

        // If search query is active and doesn't match the selected variable, clear it
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const targetVar = variableMap.get(selectedVariableKey);
          if (
            targetVar &&
            !targetVar.key.toLowerCase().includes(q) &&
            !targetVar.label.toLowerCase().includes(q) &&
            !targetVar.description.toLowerCase().includes(q)
          ) {
            setSearchQuery('');
          }
        }
      }

      // Smooth scroll to the inspected card
      setTimeout(() => {
        if (inspectedCardRef.current) {
          inspectedCardRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 120);
    }
  }, [selectedVariableKey, selectTrigger]);

  // Handle switching view scope from the inspector switcher
  const handleScopeChange = (newScope: 'chat' | 'chatlist' | 'dialogs') => {
    setActiveScope(newScope);
    setSelectedAreaFilter('all');
    setFilterMode('all');
    if (newScope === 'chat' || newScope === 'chatlist') {
      onViewChange?.(newScope);
    }
  };

  // Handle copy variable key
  const handleCopyKey = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1800);
  };

  // Toggle single area accordion
  const toggleAreaAccordion = (areaId: string) => {
    setExpandedAreas(prev => ({
      ...prev,
      [areaId]: !prev[areaId],
    }));
  };

  // Toggle all areas
  const areAllExpanded = useMemo(() => {
    const areas = getAreasForView(activeScope);
    return areas.every(a => expandedAreas[a.id]);
  }, [activeScope, expandedAreas]);

  const toggleAllAreas = () => {
    const areas = getAreasForView(activeScope);
    const nextState = !areAllExpanded;
    setExpandedAreas(prev => {
      const updated = { ...prev };
      areas.forEach(a => {
        updated[a.id] = nextState;
      });
      return updated;
    });
  };

  // Count variables strictly for each view
  const scopeCounts = useMemo(() => {
    const chatKeys = new Set<string>();
    const listKeys = new Set<string>();
    const dialogKeys = new Set<string>();

    INSPECTOR_AREAS.forEach(area => {
      if (area.view === 'chat') area.keys.forEach(k => chatKeys.add(k));
      if (area.view === 'chatlist') area.keys.forEach(k => listKeys.add(k));
      if (area.view === 'dialogs') area.keys.forEach(k => dialogKeys.add(k));
    });

    return {
      chat: chatKeys.size,
      chatlist: listKeys.size,
      dialogs: dialogKeys.size,
    };
  }, []);

  // Filtered areas for the current active scope
  const currentAreas = useMemo(() => {
    const areas = getAreasForView(activeScope);
    if (selectedAreaFilter === 'all') return areas;
    return areas.filter(a => a.id === selectedAreaFilter);
  }, [activeScope, selectedAreaFilter]);

  const getEffectiveDefaultHex = (key: string, defaultHex: string) => {
    if (key === 'chat_recordedVoiceBackground') {
      return colors.actionBarDefault || defaultHex;
    }
    return defaultHex;
  };

  // Is variable modified from default
  const isModified = (key: string, defaultHex: string) => {
    if (!colors[key]) return false;
    return colors[key].toLowerCase() !== getEffectiveDefaultHex(key, defaultHex).toLowerCase();
  };

  // Calculate counts for current scope
  const { currentScopeTotal, currentScopeOnScreenCount, currentScopeModifiedCount } = useMemo(() => {
    const scopeKeys = new Set<string>();
    getAreasForView(activeScope).forEach(a => a.keys.forEach(k => scopeKeys.add(k)));

    let onScreen = 0;
    let modified = 0;

    scopeKeys.forEach(k => {
      const meta = variableMap.get(k);
      if (meta && isModified(meta.key, meta.defaultHex)) {
        modified++;
      }
      if (activeScope === 'chat' && CHAT_SIMULATOR_KEYS.has(k)) {
        onScreen++;
      }
      if (activeScope === 'chatlist' && CHATLIST_SIMULATOR_KEYS.has(k)) {
        onScreen++;
      }
    });

    return {
      currentScopeTotal: scopeKeys.size,
      currentScopeOnScreenCount: onScreen,
      currentScopeModifiedCount: modified,
    };
  }, [activeScope, colors, variableMap]);

  return (
    <div className="space-y-4 animate-fade-in text-[#EDEDEF]">
      {/* ================= 1. VIEW SWITCHER (STRICT SEPARATION) ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-xs font-semibold text-white">
              {activeScope === 'chat'
                ? 'Chat View Variables'
                : activeScope === 'chatlist'
                ? 'Chat List Variables'
                : 'Dialogs & System Variables'}
            </span>
          </div>
          <span className="text-[10px] text-[#8A8F98] font-mono">
            {currentScopeTotal} editable in view
          </span>
        </div>

        {/* Primary View Switcher: Chat View vs Chat List (Synchronized with Phone Simulator) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-base rounded-xl border border-surface-border shadow-sm">
          <button
            onClick={() => handleScopeChange('chat')}
            className={`flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              activeScope === 'chat'
                ? 'bg-brand-500 font-semibold'
                : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04]'
            }`}
            style={
              activeScope === 'chat'
                ? {
                    color: 'var(--color-brand-on-primary)',
                    boxShadow: '0 2px 10px var(--color-brand-glow)',
                  }
                : undefined
            }
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Chat View</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                activeScope === 'chat' ? 'bg-black/25' : 'bg-white/[0.06] text-[#8A8F98]'
              }`}
            >
              {scopeCounts.chat}
            </span>
          </button>

          <button
            onClick={() => handleScopeChange('chatlist')}
            className={`flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              activeScope === 'chatlist'
                ? 'bg-brand-500 font-semibold'
                : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.04]'
            }`}
            style={
              activeScope === 'chatlist'
                ? {
                    color: 'var(--color-brand-on-primary)',
                    boxShadow: '0 2px 10px var(--color-brand-glow)',
                  }
                : undefined
            }
          >
            <List className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Chat List</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                activeScope === 'chatlist' ? 'bg-black/25' : 'bg-white/[0.06] text-[#8A8F98]'
              }`}
            >
              {scopeCounts.chatlist}
            </span>
          </button>
        </div>

        {/* Optional Secondary Tab for Shared Dialogs & Popups */}
        <div className="flex items-center justify-between px-1 text-[11px]">
          <span className="text-[#8A8F98] text-[10px]">
            {activeScope === 'chat'
              ? 'Showing only variables editable in chat conversation'
              : activeScope === 'chatlist'
              ? 'Showing only variables editable in home chat list'
              : 'Showing shared dialog alerts, toggles & avatars'}
          </span>
          <button
            onClick={() => handleScopeChange(activeScope === 'dialogs' ? (currentView === 'profile' ? 'chat' : currentView) : 'dialogs')}
            className={`text-[10px] flex items-center gap-1 transition ${
              activeScope === 'dialogs'
                ? 'text-brand-400 font-semibold underline underline-offset-2'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>{activeScope === 'dialogs' ? 'Back to View' : 'Dialogs & Popups'}</span>
          </button>
        </div>
      </div>

      {/* ================= 2. SEARCH & EDITABLE SCOPE FILTERS ================= */}
      <div className="space-y-2">
        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8A8F98]" />
            <input
              type="text"
              placeholder={`Search ${activeScope === 'chat' ? 'Chat View' : activeScope === 'chatlist' ? 'Chat List' : 'Dialog'} keys, labels, or areas...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="linear-input w-full pl-8 pr-7 py-1.5 text-xs placeholder:text-[#8A8F98]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#8A8F98] hover:text-white p-0.5 rounded transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Expand/Collapse All Button */}
          {!searchQuery && (
            <button
              onClick={toggleAllAreas}
              title={areAllExpanded ? 'Collapse All Areas' : 'Expand All Areas'}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[#8A8F98] hover:text-[#EDEDEF] border border-white/[0.06] transition"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* "What is Editable" Filter Controls: All | On-Screen | Modified */}
        <div className="flex items-center gap-1 p-1 bg-surface-base rounded-lg border border-surface-border text-[11px]">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-1 px-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-surface-card text-white shadow-xs'
                : 'text-[#8A8F98] hover:text-[#EDEDEF]'
            }`}
          >
            <span>
              All<span className="hidden sm:inline"> Editable</span>
            </span>
            <span className="text-[9px] font-mono opacity-80">({currentScopeTotal})</span>
          </button>

          {(activeScope === 'chat' || activeScope === 'chatlist') && (
            <button
              onClick={() => setFilterMode('onscreen')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-1 px-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
                filterMode === 'onscreen'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-[#8A8F98] hover:text-[#EDEDEF]'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-300 flex-shrink-0" />
              <span>On Screen</span>
              <span className="text-[9px] font-mono opacity-80">({currentScopeOnScreenCount})</span>
            </button>
          )}

          <button
            onClick={() => setFilterMode('modified')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-1 px-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
              filterMode === 'modified'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-[#8A8F98] hover:text-[#EDEDEF]'
            }`}
          >
            <Filter className="w-3 h-3 flex-shrink-0" />
            <span>Modified</span>
            <span className="text-[9px] font-mono opacity-80">({currentScopeModifiedCount})</span>
          </button>
        </div>

        {/* ================= 3. AREA FILTER CHIPS (ONLY FOR CURRENT VIEW) ================= */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              onClick={() => setSelectedAreaFilter('all')}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all text-[11px] ${
                selectedAreaFilter === 'all'
                  ? 'bg-brand-500 text-white font-medium shadow-sm'
                  : 'bg-surface-card/70 text-[#8A8F98] hover:text-[#EDEDEF] border border-surface-border'
              }`}
            >
              All Areas ({getAreasForView(activeScope).length})
            </button>
            {getAreasForView(activeScope).map(area => {
              const Icon = ICON_MAP[area.icon] || Layout;
              const isSelected = selectedAreaFilter === area.id;

              return (
                <button
                  key={area.id}
                  onClick={() => setSelectedAreaFilter(area.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap transition-all text-[11px] ${
                    isSelected
                      ? 'bg-brand-500 text-white font-medium shadow-sm'
                      : 'bg-surface-card/70 text-[#8A8F98] hover:text-[#EDEDEF] border border-surface-border'
                  }`}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span>{area.shortLabel}</span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded-full ${
                      isSelected ? 'bg-black/25 text-white' : 'bg-white/[0.06] text-[#8A8F98]'
                    }`}
                  >
                    {area.keys.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 4. CATEGORIZED AREA ACCORDIONS ================= */}
      <div className="space-y-3">
        {currentAreas.map(area => {
          const AreaIcon = ICON_MAP[area.icon] || Layout;
          const isExpanded = !!expandedAreas[area.id];

          // Collect variables for this area strictly based on filter mode
          const areaVariables = area.keys
            .map(key => variableMap.get(key))
            .filter((v): v is (typeof TELEGRAM_VARIABLES)[0] => {
              if (!v) return false;

              // Filter by onscreen if active
              if (filterMode === 'onscreen' && (activeScope === 'chat' || activeScope === 'chatlist')) {
                if (!isKeyInSimulatorPreview(v.key, activeScope)) {
                  return false;
                }
              }

              // Filter by modified if active
              if (filterMode === 'modified' && !isModified(v.key, v.defaultHex)) {
                return false;
              }

              // Filter by search query if active
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matches =
                  v.key.toLowerCase().includes(q) ||
                  v.label.toLowerCase().includes(q) ||
                  v.description.toLowerCase().includes(q) ||
                  area.label.toLowerCase().includes(q) ||
                  area.shortLabel.toLowerCase().includes(q);
                return matches;
              }

              return true;
            });

          // Skip rendering area if no variables match filter
          if (areaVariables.length === 0) {
            return null;
          }

          // Mini palette colors for this area
          const areaSwatches = area.keys.slice(0, 6).map(k => colors[k] || '#2AABEE');

          return (
            <div
              key={area.id}
              className="rounded-xl border border-surface-border bg-surface-card/75 backdrop-blur-sm overflow-hidden transition-all shadow-sm"
            >
              {/* Area Accordion Header */}
              <div
                onClick={() => toggleAreaAccordion(area.id)}
                className="flex items-center justify-between gap-2 p-3 cursor-pointer select-none bg-white/[0.02] hover:bg-surface-cardHover/60 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-surface-base/70 border border-surface-border flex items-center justify-center flex-shrink-0 text-[#8A8F98]">
                    <AreaIcon className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-[#EDEDEF] truncate">
                        {area.label}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-[#8A8F98] shrink-0">
                        {areaVariables.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8A8F98] truncate">
                      {area.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Mini Palette Swatches Preview */}
                  <div className="hidden sm:flex items-center -space-x-1">
                    {areaSwatches.map((hex, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>

                  <button className="text-[#8A8F98] p-1 rounded-md hover:text-white transition">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Area Variables List (Expanded) */}
              {isExpanded && (
                <div className="p-3 pt-2 space-y-2.5 border-t border-white/[0.04] bg-black/20">
                  {/* Quick Action Helpers for Specific Areas */}
                  {(area.id === 'chat_header' || area.id === 'chatlist_header') && (
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A8F98] font-medium">Quick Selection Bar Styles:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const header = colors.actionBarDefault || '#1c242d';
                            const accent = colors.chats_unreadCounter || colors.actionBarTabActiveText || colors.chat_messagePanelSend || '#e76a8f';
                            const isDark = getLuminance(header) < 0.55;
                            const targetIcon = isDark
                              ? ensureContrast(accent, header, '#ffffff', accent, 3.5)
                              : (getContrastRatio(header, accent) >= 2.8 ? accent : adjustBrightness(accent, -28));
                            onColorChange('actionBarActionModeDefault', header);
                            onColorChange('actionBarActionModeDefaultTop', header);
                            onColorChange('actionBarActionModeDefaultIcon', targetIcon);
                          }}
                          className="px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 text-[10px] font-medium transition"
                          title="Make selection bar match header with theme-accent icons"
                        >
                          Adaptive Accent Icons
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const header = colors.actionBarDefault || '#1c242d';
                            const accent = colors.chats_unreadCounter || colors.actionBarTabActiveText || colors.chat_messagePanelSend || '#e76a8f';
                            const isDark = getLuminance(header) < 0.55;
                            const targetIcon = isDark
                              ? ensureContrast(accent, header, '#ffffff', accent, 3.5)
                              : (getContrastRatio(header, accent) >= 2.8 ? accent : adjustBrightness(accent, -28));
                            onColorChange('actionBarActionModeDefault', header);
                            onColorChange('actionBarActionModeDefaultTop', header);
                            onColorChange('actionBarActionModeDefaultIcon', targetIcon);
                          }}
                          className="px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-white transition flex-shrink-0"
                        >
                          Match Header
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onColorChange('actionBarActionModeDefault', '#10141a');
                            onColorChange('actionBarActionModeDefaultTop', '#10141a');
                            const iconColor = colors.chats_unreadCounter || '#c044f5';
                            onColorChange('actionBarActionModeDefaultIcon', iconColor);
                          }}
                          className="px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-white transition flex-shrink-0"
                        >
                          Dark Obsidian
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const accent = colors.chats_unreadCounter || colors.actionBarTabActiveText || colors.chat_messagePanelSend || '#4ea4f5';
                            onColorChange('actionBarActionModeDefault', '#ffffff');
                            onColorChange('actionBarActionModeDefaultTop', '#ffffff');
                            const iconColor = getContrastRatio('#ffffff', accent) >= 2.8 ? accent : adjustBrightness(accent, -28);
                            onColorChange('actionBarActionModeDefaultIcon', iconColor);
                          }}
                          className="px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-white transition flex-shrink-0"
                        >
                          Clean White
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const header = colors.actionBarDefault || '#1c242d';
                            const isDark = getLuminance(header) < 0.55;
                            const searchTextColor = isDark ? (colors.actionBarDefaultTitle || '#ffffff') : (colors.actionBarDefaultTitle || '#111827');
                            onColorChange('actionBarDefaultSearch', searchTextColor);
                            onColorChange('actionBarDefaultSearchPlaceholder', isDark ? blend(searchTextColor, header, 0.45) : '#7f93a5');
                          }}
                          className="px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-white transition flex-shrink-0"
                          title="Ensure search text and placeholder contrast properly against header"
                        >
                          Adaptive Search Text
                        </button>
                      </div>
                    </div>
                  )}

                  {(area.id === 'chat_checkmarks' || area.id === 'chatlist_delivery') && (
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A8F98] font-medium">Quick Checkmark Palette:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const accent = colors.chats_unreadCounter || colors.actionBarTabActiveText || colors.chat_messagePanelSend || '#e76a8f';
                            onColorChange('chat_outSentCheckRead', accent);
                            onColorChange('chats_sentReadCheck', accent);
                          }}
                          className="px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 text-[10px] font-medium transition"
                          title="Match all checkmarks to theme accent"
                        >
                          Match Accent
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
                        {[
                          { name: 'Rose / Pink', hex: '#e76a8f' },
                          { name: 'Sky Blue', hex: '#38bdf8' },
                          { name: 'Lavender', hex: '#c084fc' },
                          { name: 'Mint Green', hex: '#10b981' },
                          { name: 'Coral', hex: '#fb923c' },
                          { name: 'Clean White', hex: '#ffffff' },
                        ].map(p => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              onColorChange('chat_outSentCheckRead', p.hex);
                              onColorChange('chats_sentReadCheck', p.hex);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-white transition flex-shrink-0"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.hex }} />
                            <span>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {area.id === 'chatlist_folders' && (
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A8F98] font-medium">Folder Tabs Pill Styles:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const accent = colors.chats_unreadCounter || colors.actionBarTabActiveText || '#a855f7';
                            const header = colors.actionBarDefault || '#1c242d';
                            const isDarkHeader = getLuminance(header) < 0.55;
                            const themeDark = getThemeDarkBase(colors);
                            const headerTitle = colors.actionBarDefaultTitle || (isDarkHeader ? '#ffffff' : themeDark);

                            const activeBadgeBg = accent;
                            const unactiveBadgeBg = isDarkHeader ? blend(accent, '#ffffff', 0.25) : blend(accent, header, 0.14);

                            const activeBadgeText = isDarkHeader ? header : resolveBadgeTextColor(activeBadgeBg, undefined, themeDark, false);
                            const unactiveBadgeText = isDarkHeader ? header : resolveBadgeTextColor(unactiveBadgeBg, undefined, themeDark, false);

                            onColorChange('actionBarTabActiveText', accent);
                            onColorChange('actionBarTabLine', accent);
                            onColorChange('actionBarTabUnactiveText', isDarkHeader ? blend(headerTitle, accent, 0.2) : blend(themeDark, header, 0.45));
                            onColorChange('chats_tabUnreadActiveBackground', activeBadgeBg);
                            onColorChange('chats_tabUnreadActiveText', activeBadgeText);
                            onColorChange('chats_tabUnreadUnactiveBackground', unactiveBadgeBg);
                            onColorChange('chats_tabUnreadUnactiveText', unactiveBadgeText);
                            onColorChange('chats_unreadCounterText', activeBadgeText);
                            onColorChange('chat_goDownButtonCounter', activeBadgeText);
                            onColorChange('chat_goToEndButtonCounterText', activeBadgeText);
                          }}
                          className="px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 text-[10px] font-medium transition"
                          title="Adapt folder tabs active text, pill indicator, and unread badges to theme accent"
                        >
                          Adapt to Accent
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const accent = colors.actionBarTabActiveText || colors.chats_unreadCounter || '#a855f7';
                            onColorChange('actionBarTabLine', setHexAlpha(accent, 22));
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 whitespace-nowrap"
                        >
                          Tinted Pill
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const accent = colors.actionBarTabActiveText || colors.chats_unreadCounter || '#a855f7';
                            onColorChange('actionBarTabLine', accent);
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 whitespace-nowrap"
                        >
                          Solid Accent
                        </button>
                        <button
                          type="button"
                          onClick={() => onColorChange('actionBarTabLine', '#33ffffff')}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 whitespace-nowrap"
                        >
                          White Tint
                        </button>
                        <button
                          type="button"
                          onClick={() => onColorChange('actionBarTabLine', '#ffffff')}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 whitespace-nowrap"
                        >
                          Solid White
                        </button>
                        <button
                          type="button"
                          onClick={() => onColorChange('actionBarTabLine', '#00000000')}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 whitespace-nowrap"
                        >
                          None
                        </button>
                      </div>
                    </div>
                  )}

                  {area.id === 'chat_forwarded' && (
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#8A8F98] font-medium">Forwarded Palette:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const darkAccent = colors.chats_unreadCounter || colors.actionBarTabActiveText || colors.chat_inReplyNameText || colors.chat_outSentCheckRead || '#e76a8f';
                            onColorChange('avatar_nameInMessageGreen', darkAccent);
                          }}
                          className="px-2 py-0.5 rounded bg-brand-500/15 text-brand-300 hover:bg-brand-500/25 text-[10px] font-medium transition"
                          title="Adapt all forward arrow, date, and author colors to dark/theme colors"
                        >
                          Match Accent
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
                        {[
                          { name: 'Rose / Pink', hex: '#e76a8f' },
                          { name: 'Dark Wine', hex: '#881337' },
                          { name: 'Lavender', hex: '#c084fc' },
                          { name: 'Sky Blue', hex: '#38bdf8' },
                          { name: 'Warm Peach', hex: '#fb923c' },
                          { name: 'Clean White', hex: '#ffffff' },
                        ].map(p => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => onColorChange('avatar_nameInMessageGreen', p.hex)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[#8A8F98] hover:text-white transition flex-shrink-0"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.hex }} />
                            <span>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {areaVariables.map(v => {
                    const isSelected = selectedVariableKey === v.key;
                    let currentHex = colors[v.key] || v.defaultHex;
                    const headerBg = colors.actionBarDefault || '#1c242d';
                    const isDarkHeader = getLuminance(headerBg) < 0.55;
                    const themeDark = getThemeDarkBase(colors);
                    const accent = colors.chats_unreadCounter || colors.actionBarTabActiveText || colors.chat_messagePanelSend || '#4ea4f5';

                    if (v.key === 'chats_tabUnreadActiveText') {
                      const activeBadgeBg = colors.chats_tabUnreadActiveBackground || accent;
                      currentHex = resolveBadgeTextColor(activeBadgeBg, colors.chats_tabUnreadActiveText, themeDark, isDarkHeader);
                    } else if (v.key === 'chats_tabUnreadUnactiveText') {
                      const unactiveBadgeBg = colors.chats_tabUnreadUnactiveBackground || (isDarkHeader ? blend(accent, '#ffffff', 0.25) : blend(accent, headerBg, 0.14));
                      currentHex = resolveBadgeTextColor(unactiveBadgeBg, colors.chats_tabUnreadUnactiveText, themeDark, isDarkHeader);
                    } else if (v.key === 'chats_unreadCounterText') {
                      const unreadBg = colors.chats_unreadCounter || accent;
                      currentHex = resolveBadgeTextColor(unreadBg, colors.chats_unreadCounterText, themeDark, isDarkHeader);
                    } else if (v.key === 'chat_goDownButtonCounter' || v.key === 'chat_goToEndButtonCounterText') {
                      const goDownBg = colors.chat_goDownButtonCounterBackground || colors.chat_goToEndButtonCounter || accent;
                      currentHex = resolveBadgeTextColor(goDownBg, colors[v.key], themeDark, isDarkHeader);
                    } else if (v.key === 'actionBarDefaultIcon') {
                      if (!isDarkHeader) {
                        if (!colors.actionBarDefaultIcon || colors.actionBarDefaultIcon === '#212529' || colors.actionBarDefaultIcon === '#1c1c1e' || colors.actionBarDefaultIcon === '#111827' || colors.actionBarDefaultIcon === '#000000' || colors.actionBarDefaultIcon === '#7f93a5' || getLuminance(colors.actionBarDefaultIcon) > 0.8) {
                          currentHex = getContrastRatio(headerBg, accent) >= 2.8 ? accent : adjustBrightness(accent, -28);
                        }
                      }
                    } else if (v.key === 'actionBarActionModeDefaultIcon') {
                      const amBg = colors.actionBarActionModeDefault || headerBg;
                      const isAmLight = getLuminance(amBg) > 0.58;
                      if (isAmLight) {
                        if (!colors.actionBarActionModeDefaultIcon || colors.actionBarActionModeDefaultIcon === '#1c1c1e' || colors.actionBarActionModeDefaultIcon === '#212529' || colors.actionBarActionModeDefaultIcon === '#111827' || colors.actionBarActionModeDefaultIcon === '#000000' || getLuminance(colors.actionBarActionModeDefaultIcon) > 0.8) {
                          currentHex = getContrastRatio(amBg, accent) >= 2.8 ? accent : adjustBrightness(accent, -28);
                        }
                      }
                    } else if (v.key === 'actionBarDefaultSubmenuItemIcon') {
                      const subBg = colors.actionBarDefaultSubmenuBackground || (isDarkHeader ? headerBg : '#ffffff');
                      if (!colors.actionBarDefaultSubmenuItemIcon || colors.actionBarDefaultSubmenuItemIcon === '#7f93a5' || colors.actionBarDefaultSubmenuItemIcon === '#52606d' || colors.actionBarDefaultSubmenuItemIcon === '#708291' || colors.actionBarDefaultSubmenuItemIcon === '#8a8a8a' || colors.actionBarDefaultSubmenuItemIcon === '#212529' || colors.actionBarDefaultSubmenuItemIcon === '#1c1c1e' || colors.actionBarDefaultSubmenuItemIcon === '#111827') {
                        currentHex = getContrastRatio(subBg, accent) >= 2.8 ? accent : adjustBrightness(accent, -28);
                      }
                    } else if (v.key === 'actionBarDefaultSubmenuBackground') {
                      if (!isDarkHeader && (!colors.actionBarDefaultSubmenuBackground || colors.actionBarDefaultSubmenuBackground === '#1c242d' || colors.actionBarDefaultSubmenuBackground === '#17212b')) {
                        currentHex = '#ffffff';
                      }
                    } else if (v.key === 'actionBarDefaultSearch') {
                      if (isDarkHeader && (!colors.actionBarDefaultSearch || colors.actionBarDefaultSearch === '#000000' || getContrastRatio(headerBg, colors.actionBarDefaultSearch) < 2.8)) {
                        currentHex = colors.actionBarDefaultTitle || '#ffffff';
                      }
                    } else if (v.key === 'actionBarDefaultSearchPlaceholder') {
                      if (!colors.actionBarDefaultSearchPlaceholder) {
                        currentHex = isDarkHeader
                          ? blend(colors.actionBarDefaultSearch || '#ffffff', headerBg, 0.45)
                          : (colors.actionBarDefaultSubtitle || blend(colors.actionBarDefaultSearch || '#111827', headerBg, 0.5) || '#7f93a5');
                      }
                    } else if (v.key === 'chat_recordedVoiceBackground') {
                      if (!colors.chat_recordedVoiceBackground) {
                        currentHex = headerBg;
                      }
                    }
                    const currentAlpha = extractAlphaPercent(currentHex);
                    const effectiveDefaultHex = getEffectiveDefaultHex(v.key, v.defaultHex);
                    const modified = isModified(v.key, v.defaultHex);
                    const isOnScreen =
                      (activeScope === 'chat' || activeScope === 'chatlist') &&
                      isKeyInSimulatorPreview(v.key, activeScope);

                    return (
                      <div
                        key={v.key}
                        ref={isSelected ? inspectedCardRef : null}
                        onClick={() => onSelectVariable(v.key)}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-brand-500/12 border-brand-500/60 ring-1 ring-brand-500/50'
                            : 'bg-surface-base/40 border-surface-border hover:border-white/[0.16]'
                        }`}
                        style={
                          isSelected
                            ? { boxShadow: '0 0 18px var(--color-brand-glow)' }
                            : undefined
                        }
                      >
                        {/* Top: Label, Badges, Copy Key, Reset */}
                        <div className="space-y-1.5 mb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap flex-1">
                              <span className="font-semibold text-xs text-[#EDEDEF] leading-snug">
                                {v.label}
                              </span>

                              {isSelected && (
                                <span
                                  className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-brand-500"
                                  style={{ color: 'var(--color-brand-on-primary)' }}
                                >
                                  Selected
                                </span>
                              )}

                              {isOnScreen && (
                                <span
                                  title="This element is actively rendered and visible on the phone simulator"
                                  className="flex items-center gap-0.5 text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30"
                                >
                                  <Zap className="w-2.5 h-2.5 text-amber-300" />
                                  <span>On Screen</span>
                                </span>
                              )}

                              {modified && (
                                <span
                                  title="Customized color (differs from Telegram default)"
                                  className="w-1.5 h-1.5 rounded-full bg-brand-400"
                                  style={{ boxShadow: '0 0 6px var(--color-brand-400)' }}
                                />
                              )}
                            </div>

                            {/* Reset to Default Button */}
                            {modified && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onColorChange(v.key, effectiveDefaultHex);
                                }}
                                title={`Reset to default (${effectiveDefaultHex})`}
                                className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8F98] hover:text-white border border-white/[0.06] transition shrink-0 cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* Copyable Token Key Pill (never overflows narrow screens) */}
                          <div className="flex items-center min-w-0">
                            <button
                              type="button"
                              onClick={e => handleCopyKey(e, v.key)}
                              title="Copy variable key"
                              className="inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8F98] hover:text-[#EDEDEF] text-[10px] font-mono border border-white/[0.06] transition cursor-pointer"
                            >
                              {copiedKey === v.key ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{v.key}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-[#8A8F98] mb-2.5 leading-relaxed">
                          {v.description}
                        </p>

                        {/* Color Input Controls */}
                        <div className="flex items-center gap-2 mb-2">
                          <ColorPicker
                            color={currentHex}
                            onChange={newHex => onColorChange(v.key, newHex)}
                            showAlpha={true}
                            label={v.label}
                          />
                          <input
                            type="text"
                            value={currentHex}
                            onChange={e => onColorChange(v.key, e.target.value)}
                            className="linear-input flex-1 px-2.5 py-1 text-xs font-mono uppercase"
                          />
                        </div>

                        {/* Opacity Slider */}
                        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                          <span className="text-[10px] text-[#8A8F98] w-14">Opacity:</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentAlpha}
                            onChange={e => {
                              const updated = setHexAlpha(currentHex, Number(e.target.value));
                              onColorChange(v.key, updated);
                            }}
                            className="flex-1 h-1 accent-brand-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-[#8A8F98] w-8 text-right">
                            {currentAlpha}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {currentAreas.every(area => {
          const count = area.keys
            .map(k => variableMap.get(k))
            .filter(v => {
              if (!v) return false;
              if (filterMode === 'onscreen' && (activeScope === 'chat' || activeScope === 'chatlist')) {
                if (!isKeyInSimulatorPreview(v.key, activeScope)) return false;
              }
              if (filterMode === 'modified' && !isModified(v.key, v.defaultHex)) return false;
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                  v.key.toLowerCase().includes(q) ||
                  v.label.toLowerCase().includes(q) ||
                  v.description.toLowerCase().includes(q) ||
                  area.label.toLowerCase().includes(q)
                );
              }
              return true;
            }).length;
          return count === 0;
        }) && (
          <div className="text-center py-10 px-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <Search className="w-6 h-6 mx-auto mb-2 text-[#8A8F98] opacity-50" />
            <p className="text-xs text-[#EDEDEF] font-medium mb-1">No variables found</p>
            <p className="text-[11px] text-[#8A8F98] mb-3">
              {filterMode === 'onscreen'
                ? `No on-screen variables match your current filter in ${activeScope === 'chat' ? 'Chat View' : 'Chat List'}.`
                : filterMode === 'modified'
                ? 'No modified variables found in this view.'
                : 'No variables match your search query.'}
            </p>
            {(searchQuery || filterMode !== 'all' || selectedAreaFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                  setSelectedAreaFilter('all');
                }}
                className="text-xs text-brand-400 hover:text-white underline underline-offset-2 transition"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
