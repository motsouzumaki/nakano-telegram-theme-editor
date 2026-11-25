import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Pipette, X, Check, Maximize2 } from 'lucide-react';
import { rgbToHex } from '../utils/colorUtils';

interface WallpaperEyedropperModalProps {
  isOpen: boolean;
  imageUrl: string | undefined;
  currentSeed: string;
  onPickColor: (hex: string) => void;
  onClose: () => void;
}

interface HoveredSample {
  hex: string;
  r: number;
  g: number;
  b: number;
  relX: number;
  relY: number;
  rectW: number;
  rectH: number;
  cx: number;
  cy: number;
}

const LOUPE_SIZE = 96;
const LOUPE_GRID = 15; // odd number so exact center pixel sits in the middle

export const WallpaperEyedropperModal: React.FC<WallpaperEyedropperModalProps> = ({
  isOpen,
  imageUrl,
  currentSeed,
  onPickColor,
  onClose,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplerRef = useRef<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    natW: number;
    natH: number;
  } | null>(null);

  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [hovered, setHovered] = useState<HoveredSample | null>(null);
  const [isTouchSampling, setIsTouchSampling] = useState<boolean>(false);
  const [keepOpen, setKeepOpen] = useState<boolean>(false);
  const [recentPicks, setRecentPicks] = useState<string[]>([]);
  const touchHandledAtRef = useRef<number>(0);

  // Load full uncropped wallpaper into an offscreen high-res canvas for exact pixel sampling
  useEffect(() => {
    if (!isOpen || !imageUrl) {
      samplerRef.current = null;
      setHovered(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || img.naturalWidth === 0 || img.naturalHeight === 0) return;
      const maxDim = 1400;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      samplerRef.current = {
        canvas,
        ctx,
        natW: img.naturalWidth,
        natH: img.naturalHeight,
      };
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, imageUrl, onClose]);

  // Draw zoomed pixel grid inside the circular magnifier loupe
  useEffect(() => {
    const loupeCanvas = loupeCanvasRef.current;
    const sampler = samplerRef.current;
    if (!loupeCanvas || !sampler || !hovered) return;

    const ctx = loupeCanvas.getContext('2d');
    if (!ctx) return;

    const half = Math.floor(LOUPE_GRID / 2);
    const cellSize = LOUPE_SIZE / LOUPE_GRID;

    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.imageSmoothingEnabled = false;

    const sx = hovered.cx - half;
    const sy = hovered.cy - half;

    // Draw valid intersection of the sampling canvas into the loupe
    const srcX = Math.max(0, sx);
    const srcY = Math.max(0, sy);
    const srcRight = Math.min(sampler.canvas.width, sx + LOUPE_GRID);
    const srcBottom = Math.min(sampler.canvas.height, sy + LOUPE_GRID);
    const srcW = srcRight - srcX;
    const srcH = srcBottom - srcY;

    if (srcW > 0 && srcH > 0) {
      const dstX = (srcX - sx) * cellSize;
      const dstY = (srcY - sy) * cellSize;
      const dstW = srcW * cellSize;
      const dstH = srcH * cellSize;
      ctx.drawImage(sampler.canvas, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
    }

    // Subtle pixel grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < LOUPE_GRID; i++) {
      const pos = Math.round(i * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, LOUPE_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(LOUPE_SIZE, pos);
      ctx.stroke();
    }

    // Center reticle box highlighting exact sampled pixel
    const centerPos = half * cellSize;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(centerPos, centerPos, cellSize, cellSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(centerPos, centerPos, cellSize, cellSize);
  }, [hovered]);

  const sampleAtClientPoint = useCallback((clientX: number, clientY: number): HoveredSample | null => {
    const sampler = samplerRef.current;
    const imgEl = imgRef.current;
    if (!sampler || !imgEl) return null;

    const rect = imgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const normX = relX / rect.width;
    const normY = relY / rect.height;

    const cx = Math.max(
      0,
      Math.min(sampler.canvas.width - 1, Math.floor(normX * sampler.canvas.width))
    );
    const cy = Math.max(
      0,
      Math.min(sampler.canvas.height - 1, Math.floor(normY * sampler.canvas.height))
    );

    const pixel = sampler.ctx.getImageData(cx, cy, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const hex = rgbToHex(r, g, b);

    return {
      hex,
      r,
      g,
      b,
      relX,
      relY,
      rectW: rect.width,
      rectH: rect.height,
      cx,
      cy,
    };
  }, []);

  const commitPick = useCallback(
    (hex: string) => {
      onPickColor(hex);
      setRecentPicks(prev => {
        const filtered = prev.filter(h => h.toLowerCase() !== hex.toLowerCase());
        return [hex, ...filtered].slice(0, 8);
      });
      if (!keepOpen) {
        onClose();
      }
    },
    [keepOpen, onClose, onPickColor]
  );

  if (!isOpen || !imageUrl) return null;

  // Smart loupe offset so it never gets clipped by the image edges (and floats higher above a touch finger)
  const loupeLeft = hovered
    ? isTouchSampling
      ? Math.max(8, Math.min(hovered.rectW - LOUPE_SIZE - 8, hovered.relX - LOUPE_SIZE / 2))
      : hovered.relX > hovered.rectW - 128
      ? Math.max(8, hovered.relX - LOUPE_SIZE - 18)
      : hovered.relX + 18
    : 0;
  const loupeTop = hovered
    ? isTouchSampling
      ? hovered.relY < LOUPE_SIZE + 54
        ? Math.min(hovered.rectH - LOUPE_SIZE - 28, hovered.relY + 34)
        : hovered.relY - LOUPE_SIZE - 46
      : hovered.relY < 128
      ? Math.min(hovered.rectH - LOUPE_SIZE - 28, hovered.relY + 18)
      : hovered.relY - LOUPE_SIZE - 26
    : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pick accent color from full wallpaper"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative flex flex-col w-full sm:w-auto max-w-[96vw] sm:max-w-[94vw] max-h-[94dvh] rounded-2xl border border-surface-border bg-surface-panel/95 shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-surface-border flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-surface-base/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/35 flex items-center justify-center text-brand-400 shrink-0">
              <Pipette className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2 truncate">
                <span className="truncate">Pick Color from Wallpaper</span>
                {imgDims && (
                  <span className="text-[10px] font-mono text-slate-400 font-normal hidden sm:inline shrink-0">
                    {imgDims.w} × {imgDims.h}
                  </span>
                )}
              </h3>
              <p className="text-[10.5px] text-slate-400 hidden sm:block">
                Move across the entire uncropped wallpaper and click any pixel to apply it as your theme seed
              </p>
              <p className="text-[10px] text-slate-400 sm:hidden">
                Drag across image &amp; lift finger to pick color
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Live hovered / current seed pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-[11px]">
              <span
                className="w-4 h-4 rounded border border-white/25 shrink-0"
                style={{ backgroundColor: hovered?.hex || currentSeed }}
              />
              <span className="font-mono text-slate-200 uppercase">
                {hovered ? hovered.hex : currentSeed}
              </span>
            </div>

            {/* Keep Open Toggle */}
            <button
              type="button"
              onClick={() => setKeepOpen(prev => !prev)}
              title="Keep picker open after clicking so you can sample multiple colors"
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition cursor-pointer ${
                keepOpen
                  ? 'bg-brand-500/15 border-brand-500/45 text-brand-300'
                  : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="hidden sm:inline">{keepOpen ? 'Multi-pick: On' : 'Close on pick'}</span>
              <span className="sm:hidden">{keepOpen ? 'Multi' : '1-Pick'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card hover:bg-surface-cardHover border border-surface-border text-[11px] font-medium text-slate-200 hover:text-white transition cursor-pointer"
            >
              {keepOpen ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <X className="w-3.5 h-3.5" />}
              <span>Done</span>
            </button>
          </div>
        </div>

        {/* Full Uncropped Wallpaper Stage */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-5 bg-[#090a0d] overflow-auto">
          <div
            className="relative inline-flex items-center justify-center rounded-xl overflow-hidden border border-white/15 shadow-2xl cursor-crosshair select-none touch-none"
            onPointerDown={e => {
              if (e.pointerType === 'touch') {
                e.currentTarget.setPointerCapture(e.pointerId);
                setIsTouchSampling(true);
                const sample = sampleAtClientPoint(e.clientX, e.clientY);
                if (sample) setHovered(sample);
              }
            }}
            onPointerMove={e => {
              const sample = sampleAtClientPoint(e.clientX, e.clientY);
              if (sample) setHovered(sample);
            }}
            onPointerUp={e => {
              if (e.pointerType === 'touch') {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                setIsTouchSampling(false);
                touchHandledAtRef.current = Date.now();
                const sample = sampleAtClientPoint(e.clientX, e.clientY);
                if (sample) {
                  commitPick(sample.hex);
                }
                setHovered(null);
              }
            }}
            onPointerCancel={() => {
              setIsTouchSampling(false);
              setHovered(null);
            }}
            onPointerLeave={e => {
              if (e.pointerType !== 'touch') {
                setHovered(null);
              }
            }}
            onClick={e => {
              if (Date.now() - touchHandledAtRef.current < 450) return;
              const sample = sampleAtClientPoint(e.clientX, e.clientY);
              if (sample) {
                commitPick(sample.hex);
              }
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Full Uncropped Wallpaper for Color Picking"
              draggable={false}
              className="block max-w-[88vw] sm:max-w-[84vw] max-h-[65dvh] sm:max-h-[72vh] w-auto h-auto select-none pointer-events-none"
            />

            {/* Exact pointer crosshair dot */}
            {hovered && (
              <div
                className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.85)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: hovered.relX,
                  top: hovered.relY,
                }}
              />
            )}

            {/* Zoomed Pixel Magnifier Loupe */}
            {hovered && (
              <div
                className="absolute pointer-events-none flex flex-col items-center gap-1.5 z-20"
                style={{
                  left: loupeLeft,
                  top: Math.max(8, loupeTop),
                }}
              >
                <div
                  className="rounded-full overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.85)]"
                  style={{
                    width: LOUPE_SIZE,
                    height: LOUPE_SIZE,
                    boxShadow: `0 0 0 3px ${hovered.hex}, 0 0 0 4.5px rgba(255,255,255,0.9), 0 10px 28px rgba(0,0,0,0.85)`,
                  }}
                >
                  <canvas
                    ref={loupeCanvasRef}
                    width={LOUPE_SIZE}
                    height={LOUPE_SIZE}
                    className="block w-full h-full"
                  />
                </div>
                <div className="px-2 py-0.5 rounded-md bg-black/85 border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <span
                    className="w-2.5 h-2.5 rounded-xs border border-white/30"
                    style={{ backgroundColor: hovered.hex }}
                  />
                  <span className="font-mono text-[10px] font-semibold text-white uppercase">
                    {hovered.hex}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar: Active Seed, Recent Picks & Hint */}
        <div className="px-4 py-2.5 border-t border-surface-border bg-surface-base/80 flex flex-wrap items-center justify-between gap-3 text-[11px] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 shrink-0">Active seed:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-card border border-surface-border font-mono text-[10.5px] text-slate-200 uppercase">
              <span
                className="w-3 h-3 rounded-xs border border-white/25"
                style={{ backgroundColor: currentSeed }}
              />
              {currentSeed}
            </span>

            {recentPicks.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-surface-border">
                <span className="text-[10px] text-slate-500">Picked:</span>
                {recentPicks.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    title={`Re-apply ${hex.toUpperCase()}`}
                    onClick={() => onPickColor(hex)}
                    className={`w-4 h-4 rounded border transition hover:scale-110 cursor-pointer ${
                      currentSeed.toLowerCase() === hex.toLowerCase()
                        ? 'border-white ring-1 ring-brand-400'
                        : 'border-white/25'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
            <Maximize2 className="w-3 h-3 text-slate-500" />
            <span>Full uncropped image · Press Esc to close</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
