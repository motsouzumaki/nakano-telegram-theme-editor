import { useState, useRef, useCallback, useEffect } from 'react';
import type { ThemeColors, ThemeSettings } from '../types/theme';

export interface ThemeHistoryEntry {
  colors: ThemeColors;
  settings: ThemeSettings;
  activePresetName: string;
}

interface UseThemeHistoryProps {
  initialState: ThemeHistoryEntry;
  maxHistory?: number;
}

export function useThemeHistory({
  initialState,
  maxHistory = 60,
}: UseThemeHistoryProps) {
  const [present, setPresent] = useState<ThemeHistoryEntry>(initialState);
  const [past, setPast] = useState<ThemeHistoryEntry[]>([]);
  const [future, setFuture] = useState<ThemeHistoryEntry[]>([]);

  // Ref to track present synchronously for debouncing and callbacks
  const presentRef = useRef<ThemeHistoryEntry>(initialState);
  presentRef.current = present;

  // Track active editing session (for continuous slider dragging)
  const isSessionActiveRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push new state with smart debouncing for slider dragging
  const setRecordState = useCallback(
    (updater: (prev: ThemeHistoryEntry) => ThemeHistoryEntry, immediateNewEntry = false) => {
      const current = presentRef.current;
      const next = updater(current);
      presentRef.current = next; // Synchronously update ref immediately to prevent stale state overwrites

      if (!isSessionActiveRef.current || immediateNewEntry) {
        // Begin a new edit session: save the pre-edit snapshot
        setPast(prevPast => [...prevPast.slice(-(maxHistory - 1)), current]);
        setFuture([]); // Clear redo stack on new action
        isSessionActiveRef.current = true;
      }

      setPresent(next);

      // Debounce ending the session (e.g. 450ms after user releases mouse or stops typing)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        isSessionActiveRef.current = false;
      }, 450);
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      isSessionActiveRef.current = false;
    }

    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFuture(prevFuture => [presentRef.current, ...prevFuture]);
      presentRef.current = previous;
      setPresent(previous);
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      isSessionActiveRef.current = false;
    }

    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast(prevPast => [...prevPast.slice(-(maxHistory - 1)), presentRef.current]);
      presentRef.current = next;
      setPresent(next);
      return newFuture;
    });
  }, [maxHistory]);

  const resetHistory = useCallback((newEntry: ThemeHistoryEntry) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      isSessionActiveRef.current = false;
    }
    setPast([]);
    setFuture([]);
    presentRef.current = newEntry;
    setPresent(newEntry);
  }, []);

  // Global Keyboard shortcuts: Ctrl+Z / Cmd+Z for Undo, Ctrl+Y / Cmd+Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      // If user is editing a standard text input (except color hex), let browser handle text editing
      if (isInput) {
        const inputType = (document.activeElement as HTMLInputElement)?.type;
        if (inputType === 'text' || inputType === 'search') {
          // If typing in text box, don't intercept unless it's not handled
          return;
        }
      }

      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    state: present,
    setState: setRecordState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetHistory,
    historyDepth: past.length,
  };
}
