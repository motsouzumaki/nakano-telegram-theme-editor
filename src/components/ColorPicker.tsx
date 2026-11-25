import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, Copy, Check, ChevronDown, X } from 'lucide-react';
import {
  hexToHsv,
  hsvToHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToHex,
  toCssColor,
  extractAlphaPercent,
  setHexAlpha,
  getBaseRgbHex
} from '../utils/colorUtils';

export interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
  showAlpha?: boolean;
  label?: string;
  className?: string;
  inline?: boolean;
  compact?: boolean;
  popoverAlign?: 'left' | 'right';
}

const QUICK_SWATCHES = [
  '#2481cc', // Telegram Classic
  '#17212b', // Telegram Slate
  '#0e1621', // Telegram Deep
  '#000000', // AMOLED
  '#2AABEE', // Linear Indigo
  '#38bdf8', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Ruby
  '#ec4899', // Hot Pink
  '#8b5cf6', // Violet
  '#ffffff', // Pure White
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  showAlpha = true,
  label,
  className = '',
  inline = false,
  compact = false,
  popoverAlign = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [format, setFormat] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [copied, setCopied] = useState(false);
  const [hexInputText, setHexInputText] = useState(color || '#2AABEE');

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Internal HSV representation for 2D canvas and sliders
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number; a: number }>(() =>
    hexToHsv(color || '#2AABEE')
  );

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const satValRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSatVal = useRef(false);

  // Sync internal HSV when incoming color prop changes
  useEffect(() => {
    const parsed = hexToHsv(color || '#2AABEE');
    setHsv(parsed);
    setHexInputText(color);
  }, [color]);

  // Click outside to close (desktop popover mode only; mobile modal closes via backdrop / Done)
  useEffect(() => {
    if (inline || !isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (isMobileViewport) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, inline, isMobileViewport]);

  const updateColorFromHsv = useCallback(
    (newHsv: { h: number; s: number; v: number; a: number }) => {
      setHsv(newHsv);
      const alphaPercent = Math.round(newHsv.a * 100);
      const hexBase = hsvToHex(newHsv.h, newHsv.s, newHsv.v, 1);
      const finalHex = showAlpha && alphaPercent < 100
        ? setHexAlpha(hexBase, alphaPercent)
        : hexBase;
      setHexInputText(finalHex);
      onChange(finalHex);
    },
    [onChange, showAlpha]
  );

  // 2D Saturation / Value interactive dragging
  const handleSatValPointer = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);

      updateColorFromHsv({ ...hsv, s, v });
    },
    [hsv, updateColorFromHsv]
  );

  const handlePointerDownSatVal = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingSatVal.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleSatValPointer(e);
  };

  const handlePointerMoveSatVal = (e: React.PointerEvent) => {
    if (isDraggingSatVal.current) {
      handleSatValPointer(e);
    }
  };

  const handlePointerUpSatVal = (e: React.PointerEvent) => {
    isDraggingSatVal.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Hue change
  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = Number(e.target.value);
    updateColorFromHsv({ ...hsv, h });
  };

  // Alpha change
  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = Number(e.target.value) / 100;
    updateColorFromHsv({ ...hsv, a });
  };

  // Eyedropper API
  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          const newHsv = hexToHsv(result.sRGBHex);
          updateColorFromHsv({ ...newHsv, a: hsv.a });
        }
      } catch {
        // User cancelled eye dropper
      }
    }
  };

  // Direct hex input change
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInputText(val);
    const clean = val.trim();
    if (/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(clean)) {
      const formatted = clean.startsWith('#') ? clean : `#${clean}`;
      onChange(formatted);
      setHsv(hexToHsv(formatted));
    }
  };

  // Copy color
  const handleCopy = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Current RGB and HSL calculations
  const currentRgb = hexToRgb(color || '#2AABEE');
  const currentHsl = rgbToHsl(currentRgb.r, currentRgb.g, currentRgb.b);
  const alphaPercent = extractAlphaPercent(color || '#2AABEE');
  const baseRgbHex = getBaseRgbHex(color || '#2AABEE');

  const pickerContent = (
    <div
      className={`${
        !inline && isMobileViewport ? 'w-full' : 'w-68'
      } bg-surface-panel/95 backdrop-blur-xl border border-surface-border rounded-2xl p-3.5 space-y-3 text-[#EDEDEF] text-xs`}
      style={{
        boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px var(--color-brand-glow)',
      }}
    >
      {/* Mobile Modal Header */}
      {!inline && isMobileViewport && (
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-surface-border">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-5 h-5 rounded-md border border-white/25 shrink-0"
              style={{ backgroundColor: toCssColor(color || '#2AABEE') }}
            />
            <span className="font-semibold text-xs text-white truncate">
              {label || 'Pick Color'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500/15 border border-brand-500/35 text-brand-300 text-[11px] font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      )}

      {/* 2D Saturation / Value Color Area */}
      <div
        ref={satValRef}
        onPointerDown={handlePointerDownSatVal}
        onPointerMove={handlePointerMoveSatVal}
        onPointerUp={handlePointerUpSatVal}
        className="relative w-full h-40 sm:h-34 rounded-xl cursor-crosshair overflow-hidden touch-none select-none border border-white/[0.08] shadow-inner"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
        }}
      >
        {/* Horizontal White Gradient (Saturation) */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        {/* Vertical Black Gradient (Value / Brightness) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none" />

        {/* Picker Pin */}
        <div
          className="absolute w-4.5 h-4.5 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-[0_2px_4px_rgba(0,0,0,0.6)] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none ring-1 ring-black/40"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: baseRgbHex,
          }}
        />
      </div>

      {/* Sliders: Hue & Alpha */}
      <div className="space-y-2.5">
        {/* Hue Spectrum Slider */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="360"
            value={hsv.h}
            onChange={handleHueChange}
            className="w-full h-4 sm:h-3 rounded-full appearance-none cursor-pointer border border-white/10"
            style={{
              background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
          />
        </div>

        {/* Alpha Opacity Slider (Checkered Background) */}
        {showAlpha && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 h-4 sm:h-3 rounded-full overflow-hidden border border-white/10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(circle, #2a2a30 1px, transparent 1px)',
                  backgroundSize: '6px 6px',
                  backgroundColor: '#16161a',
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={alphaPercent}
                onChange={handleAlphaChange}
                className="relative z-10 w-full h-full appearance-none bg-transparent cursor-pointer"
                style={{
                  backgroundImage: `linear-gradient(to right, transparent, ${baseRgbHex})`,
                }}
              />
            </div>
            <span className="font-mono text-[10px] text-[#8A8F98] w-8 text-right font-medium">
              {alphaPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Eyedropper, Format Switcher & Value Input */}
      <div className="space-y-2 pt-1 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          {/* Eyedropper Button */}
          {typeof window !== 'undefined' && 'EyeDropper' in window && (
            <button
              onClick={handleEyeDropper}
              title="Pick color from screen"
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8F98] hover:text-[#EDEDEF] border border-white/[0.06] transition"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Format Switcher */}
          <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-border text-[10px]">
            <button
              onClick={() => setFormat('hex')}
              className={`px-1.5 py-0.5 rounded font-mono font-medium transition ${
                format === 'hex' ? 'bg-brand-500 text-white shadow-xs' : 'text-[#8A8F98] hover:text-[#EDEDEF]'
              }`}
            >
              HEX
            </button>
            <button
              onClick={() => setFormat('rgb')}
              className={`px-1.5 py-0.5 rounded font-mono font-medium transition ${
                format === 'rgb' ? 'bg-brand-500 text-white shadow-xs' : 'text-[#8A8F98] hover:text-[#EDEDEF]'
              }`}
            >
              RGB
            </button>
            <button
              onClick={() => setFormat('hsl')}
              className={`px-1.5 py-0.5 rounded font-mono font-medium transition ${
                format === 'hsl' ? 'bg-brand-500 text-white shadow-xs' : 'text-[#8A8F98] hover:text-[#EDEDEF]'
              }`}
            >
              HSL
            </button>
          </div>

          <button
            onClick={handleCopy}
            title="Copy color"
            className="ml-auto p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8F98] hover:text-[#EDEDEF] border border-white/[0.06] transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Dynamic Inputs depending on format */}
        {format === 'hex' && (
          <input
            type="text"
            value={hexInputText}
            onChange={handleHexInputChange}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-base border border-surface-border font-mono text-xs uppercase text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
            placeholder="#RRGGBB or #AARRGGBB"
          />
        )}

        {format === 'rgb' && (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8A8F98] font-mono">R</span>
              <input
                type="number"
                min="0"
                max="255"
                value={currentRgb.r}
                onChange={e => {
                  const r = Math.max(0, Math.min(255, Number(e.target.value)));
                  const hex = rgbToHex(r, currentRgb.g, currentRgb.b, currentRgb.a);
                  onChange(hex);
                  setHsv(hexToHsv(hex));
                }}
                className="px-1.5 py-1 rounded bg-[#050506] border border-white/10 font-mono text-[11px] text-center text-white focus:outline-none focus:border-[#2AABEE]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8A8F98] font-mono">G</span>
              <input
                type="number"
                min="0"
                max="255"
                value={currentRgb.g}
                onChange={e => {
                  const g = Math.max(0, Math.min(255, Number(e.target.value)));
                  const hex = rgbToHex(currentRgb.r, g, currentRgb.b, currentRgb.a);
                  onChange(hex);
                  setHsv(hexToHsv(hex));
                }}
                className="px-1.5 py-1 rounded bg-[#050506] border border-white/10 font-mono text-[11px] text-center text-white focus:outline-none focus:border-[#2AABEE]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8A8F98] font-mono">B</span>
              <input
                type="number"
                min="0"
                max="255"
                value={currentRgb.b}
                onChange={e => {
                  const b = Math.max(0, Math.min(255, Number(e.target.value)));
                  const hex = rgbToHex(currentRgb.r, currentRgb.g, b, currentRgb.a);
                  onChange(hex);
                  setHsv(hexToHsv(hex));
                }}
                className="px-1.5 py-1 rounded bg-[#050506] border border-white/10 font-mono text-[11px] text-center text-white focus:outline-none focus:border-[#2AABEE]"
              />
            </div>
          </div>
        )}

        {format === 'hsl' && (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8A8F98] font-mono">H°</span>
              <input
                type="number"
                min="0"
                max="360"
                value={currentHsl.h}
                onChange={e => {
                  const h = Math.max(0, Math.min(360, Number(e.target.value)));
                  const base = hslToHex(h, currentHsl.s, currentHsl.l);
                  const hex = showAlpha && alphaPercent < 100 ? setHexAlpha(base, alphaPercent) : base;
                  onChange(hex);
                  setHsv(hexToHsv(hex));
                }}
                className="px-1.5 py-1 rounded bg-[#050506] border border-white/10 font-mono text-[11px] text-center text-white focus:outline-none focus:border-[#2AABEE]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8A8F98] font-mono">S%</span>
              <input
                type="number"
                min="0"
                max="100"
                value={currentHsl.s}
                onChange={e => {
                  const s = Math.max(0, Math.min(100, Number(e.target.value)));
                  const base = hslToHex(currentHsl.h, s, currentHsl.l);
                  const hex = showAlpha && alphaPercent < 100 ? setHexAlpha(base, alphaPercent) : base;
                  onChange(hex);
                  setHsv(hexToHsv(hex));
                }}
                className="px-1.5 py-1 rounded bg-[#050506] border border-white/10 font-mono text-[11px] text-center text-white focus:outline-none focus:border-[#2AABEE]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#8A8F98] font-mono">L%</span>
              <input
                type="number"
                min="0"
                max="100"
                value={currentHsl.l}
                onChange={e => {
                  const l = Math.max(0, Math.min(100, Number(e.target.value)));
                  const base = hslToHex(currentHsl.h, currentHsl.s, l);
                  const hex = showAlpha && alphaPercent < 100 ? setHexAlpha(base, alphaPercent) : base;
                  onChange(hex);
                  setHsv(hexToHsv(hex));
                }}
                className="px-1.5 py-1 rounded bg-[#050506] border border-white/10 font-mono text-[11px] text-center text-white focus:outline-none focus:border-[#2AABEE]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Swatches Row */}
      <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
        <div className="text-[10px] text-[#8A8F98] font-medium">Quick Swatches:</div>
        <div className="grid grid-cols-6 gap-1.5">
          {QUICK_SWATCHES.map(swatchHex => (
            <button
              key={swatchHex}
              onClick={() => {
                const finalHex = showAlpha && alphaPercent < 100
                  ? setHexAlpha(swatchHex, alphaPercent)
                  : swatchHex;
                onChange(finalHex);
                setHsv(hexToHsv(finalHex));
              }}
              className="w-full h-7 sm:h-6 rounded-md border border-white/10 hover:scale-105 transition-transform shadow-xs relative"
              style={{ backgroundColor: swatchHex }}
              title={swatchHex}
            >
              {baseRgbHex.toLowerCase() === swatchHex.toLowerCase() && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (inline) {
    return <div className={className}>{pickerContent}</div>;
  }

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Swatch Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all shadow-xs group cursor-pointer ${
          compact ? 'gap-1.5 px-1.5 py-1 rounded-lg' : 'gap-2 p-1 rounded-xl'
        }`}
        title={label || `Change color: ${color}`}
      >
        {/* Swatch with checkered transparency backing */}
        <div
          className={`relative overflow-hidden border border-white/10 shadow-inner flex-shrink-0 ${
            compact ? 'w-5 h-5 rounded-md' : 'w-8 h-8 rounded-lg'
          }`}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #2a2a30 1px, transparent 1px)',
              backgroundSize: '5px 5px',
              backgroundColor: '#16161a',
            }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: toCssColor(color || '#2AABEE') }}
          />
        </div>

        <ChevronDown
          className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[#8A8F98] group-hover:text-[#EDEDEF] transition-transform ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown (Desktop) or Centered Modal Sheet (Mobile) */}
      {isOpen &&
        (isMobileViewport
          ? createPortal(
              <div
                className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 pb-5 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={e => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                role="dialog"
                aria-modal="true"
                aria-label={label || 'Color picker'}
              >
                <div
                  className="w-full max-w-[348px]"
                  onClick={e => e.stopPropagation()}
                >
                  {pickerContent}
                </div>
              </div>,
              document.body
            )
          : (
              <div
                className={`absolute top-full mt-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  popoverAlign === 'right' ? 'right-0' : 'left-0'
                }`}
              >
                {pickerContent}
              </div>
            ))}
    </div>
  );
};
