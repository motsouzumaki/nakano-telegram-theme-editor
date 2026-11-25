export type GeneratorEngine =
  | 'classic-telegram'
  | 'amoled-contrast'
  | 'cyberpunk'
  | 'ios-glass'
  | 'developer-dark'
  | 'monet';

export type VariableCategory =
  | 'bubbles'
  | 'actionbar'
  | 'input'
  | 'chatlist'
  | 'wallpaper'
  | 'dialogs';

export interface TelegramVariableMeta {
  key: string;
  label: string;
  category: VariableCategory;
  description: string;
  defaultHex: string;
}

export type StudioView = 'chat' | 'chatlist' | 'profile';

export interface PreviewToggles {
  reactions: boolean;
  channelMute: boolean;
  search: boolean;
  voiceBar: boolean;
  miniPlayer: boolean;
  emojiHints: boolean;
  optionsMenu: boolean;
  contextMenu: boolean;
  playerModal: boolean;
}

export type InspectorView = 'chat' | 'chatlist' | 'dialogs' | 'all';

export interface InspectorArea {
  id: string;
  view: 'chat' | 'chatlist' | 'dialogs';
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  keys: string[];
}

export type ThemeColors = Record<string, string>;

export interface ThemeSettings {
  themeName: string;
  cornerRadius: number; // 0 to 24px
  bubbleTails: boolean;
  wallpaperType: 'color' | 'gradient' | 'pattern' | 'image';
  wallpaperGradient: {
    angle: number;
    color1: string;
    color2: string;
  };
  wallpaperImage?: string; // base64 or object URL
  wallpaperBlob?: Blob; // raw binary blob for export
  tgxWallpaperLink?: string; // optional Telegram cloud wallpaper link (t.me/bg/...) or slug for Telegram X .tgx-theme export
  wallpaperBlur: number; // 0 to 20px
  wallpaperDim: number; // 0 to 80%
  patternOpacity: number; // 0 to 100%
  inBubbleOpacity?: number; // 0 to 100%
  outBubbleOpacity?: number; // 0 to 100%
}

export interface ThemePreset {
  id: string;
  name: string;
  category: 'Material 3' | 'Official' | 'AMOLED' | 'Aesthetic' | 'Vibrant';
  description: string;
  isDark: boolean;
  colors: ThemeColors;
  settings: Partial<ThemeSettings>;
}

export interface ChatMessage {
  id: string;
  sender: 'in' | 'out';
  text: string;
  time: string;
  isRead?: boolean;
  replyTo?: {
    name: string;
    text: string;
  };
  hasMedia?: boolean;
  mediaType?: 'voice' | 'link';
  mediaMeta?: {
    duration?: string;
    domain?: string;
    title?: string;
  };
  reactions?: { emoji: string; count: number }[];
}
