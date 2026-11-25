import type { ThemeColors, ThemeSettings, StudioView } from '../types/theme';
import { normalizeThemeColors } from './colorUtils';

const STORAGE_KEY = 'tele_theme_saved_state_v1';

export interface SavedThemeState {
  colors: ThemeColors;
  settings: Omit<ThemeSettings, 'wallpaperBlob'>;
  activePresetName: string;
  currentView: StudioView;
  inspectMode: boolean;
  adaptiveStudioTheme?: boolean;
  savedAt: number;
}

/**
 * Converts a Blob to a compressed Data URL using canvas to ensure it fits comfortably within localStorage.
 */
export async function imageBlobToDataUrl(blob: Blob, maxDim = 1280): Promise<string> {
  // If file is already reasonably sized (<= 2.5MB), read directly as Data URL for instant response
  if (blob.size <= 2.5 * 1024 * 1024) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(blob);
    });
  }

  // For very large images (> 2.5MB), downscale via offscreen canvas so it fits in localStorage
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fallbackReader(blob, resolve);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch {
        fallbackReader(blob, resolve);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      fallbackReader(blob, resolve);
    };

    img.src = url;
  });
}

function fallbackReader(blob: Blob, resolve: (val: string) => void) {
  const reader = new FileReader();
  reader.onloadend = () => {
    resolve(typeof reader.result === 'string' ? reader.result : '');
  };
  reader.onerror = () => resolve('');
  reader.readAsDataURL(blob);
}

/**
 * Converts a Data URL back to a Blob for export bundling.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return new Blob([], { type: 'image/jpeg' });
  }
}

/**
 * Loads saved theme state from localStorage, if available.
 */
export function loadSavedThemeState(): SavedThemeState | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: SavedThemeState = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.colors) {
      parsed.colors = normalizeThemeColors(parsed.colors);
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse saved theme from localStorage', err);
  }

  return null;
}

/**
 * Saves current theme state to localStorage.
 */
export function saveThemeState(state: {
  colors: ThemeColors;
  settings: ThemeSettings;
  activePresetName: string;
  currentView: StudioView;
  inspectMode: boolean;
  adaptiveStudioTheme?: boolean;
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // Strip non-serializable blob from settings
    const { wallpaperBlob, ...serializableSettings } = state.settings;

    const payload: SavedThemeState = {
      colors: state.colors,
      settings: serializableSettings,
      activePresetName: state.activePresetName,
      currentView: state.currentView,
      inspectMode: state.inspectMode,
      adaptiveStudioTheme: state.adaptiveStudioTheme,
      savedAt: Date.now(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // If quota exceeded due to large wallpaper image, try saving without image
    try {
      const { wallpaperBlob, wallpaperImage, ...minimalSettings } = state.settings;
      const fallbackPayload: SavedThemeState = {
        colors: state.colors,
        settings: minimalSettings,
        activePresetName: state.activePresetName,
        currentView: state.currentView,
        inspectMode: state.inspectMode,
        adaptiveStudioTheme: state.adaptiveStudioTheme,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackPayload));
      console.warn('Saved settings to localStorage without wallpaper image due to quota limit');
    } catch (fallbackErr) {
      console.warn('Could not save theme state to localStorage', fallbackErr);
    }
  }
}

/**
 * Clears saved theme state from localStorage (used when user clicks Reset).
 */
export function clearSavedThemeState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear saved theme state', err);
  }
}
