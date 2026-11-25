import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Crop,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Sliders,
  Smartphone,
  Sun,
  Contrast,
  Droplets,
  Loader2,
  Move,
  Eye,
} from 'lucide-react';

export type AspectPresetId = '9:16' | '9:19.5' | '3:4' | '1:1' | '16:9' | 'original' | 'free';

export interface ImageCropResult {
  file: File;
  dataUrl: string;
  autoGenerateTheme: boolean;
}

interface ImageCropModalProps {
  isOpen: boolean;
  sourceUrl: string | null;
  fileName: string;
  defaultAutoGenerateTheme?: boolean;
  isEditingExisting?: boolean;
  onCancel: () => void;
  onConfirm: (result: ImageCropResult) => Promise<void> | void;
}

interface AspectPreset {
  id: AspectPresetId;
  label: string;
  sublabel?: string;
  ratio: number | null; // null = dynamic (original or free)
}

const ASPECT_PRESETS: AspectPreset[] = [
  { id: '9:16', label: '9:16', sublabel: 'Phone', ratio: 9 / 16 },
  { id: '9:19.5', label: '9:19.5', sublabel: 'Tall', ratio: 9 / 19.5 },
  { id: '3:4', label: '3:4', sublabel: 'Portrait', ratio: 3 / 4 },
  { id: '1:1', label: '1:1', sublabel: 'Square', ratio: 1 },
  { id: '16:9', label: '16:9', sublabel: 'Wide', ratio: 16 / 9 },
  { id: 'original', label: 'Original', ratio: null },
  { id: 'free', label: 'Free', ratio: null },
];

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

function clampPanToBounds(
  pan: { x: number; y: number },
  cropW: number,
  cropH: number,
  imgW: number,
  imgH: number,
  effectiveScale: number,
  rad: number
): { x: number; y: number } {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const absCos = Math.abs(cos);
  const absSin = Math.abs(sin);

  const maxPU = Math.max(0, (imgW * effectiveScale - (cropW * absCos + cropH * absSin)) / 2);
  const maxPV = Math.max(0, (imgH * effectiveScale - (cropW * absSin + cropH * absCos)) / 2);

  const pU = pan.x * cos + pan.y * sin;
  const pV = -pan.x * sin + pan.y * cos;

  const clampedPU = Math.max(-maxPU, Math.min(maxPU, pU));
  const clampedPV = Math.max(-maxPV, Math.min(maxPV, pV));

  return {
    x: clampedPU * cos - clampedPV * sin,
    y: clampedPU * sin + clampedPV * cos,
  };
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  sourceUrl,
  fileName,
  defaultAutoGenerateTheme = true,
  isEditingExisting = false,
  onCancel,
  onConfirm,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 520,
    height: 480,
  });

  // Transform states
  const [aspectPreset, setAspectPreset] = useState<AspectPresetId>(
    isEditingExisting ? 'original' : '9:16'
  );
  const [freeCropSize, setFreeCropSize] = useState<{ width: number; height: number }>({
    width: 240,
    height: 400,
  });
  const [quarterTurns, setQuarterTurns] = useState<number>(0);
  const [straighten, setStraighten] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tone adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [showToneControls, setShowToneControls] = useState<boolean>(false);

  // Preview & Import options
  const [showTelegramGuide, setShowTelegramGuide] = useState<boolean>(false);
  const [autoGenerateTheme, setAutoGenerateTheme] = useState<boolean>(defaultAutoGenerateTheme);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Interactive pointer drag states
  const [isDraggingPan, setIsDraggingPan] = useState<boolean>(false);
  const [isResizingCrop, setIsResizingCrop] = useState<boolean>(false);
  const [isAnimatingTransform, setIsAnimatingTransform] = useState<boolean>(false);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panDragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const resizeDragStartRef = useRef<{
    handle: ResizeHandle;
    pointerX: number;
    pointerY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const triggerSmoothTransform = useCallback(() => {
    setIsAnimatingTransform(true);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setIsAnimatingTransform(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // Reset state whenever a new image is opened
  useEffect(() => {
    if (!isOpen || !sourceUrl) return;

    setImgSize(null);
    setLoadError(null);
    loadedImageRef.current = null;
    setAspectPreset(isEditingExisting ? 'original' : '9:16');
    setQuarterTurns(0);
    setStraighten(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setShowToneControls(false);
    setAutoGenerateTheme(defaultAutoGenerateTheme);
    setIsApplying(false);

    let cancelled = false;
    const img = new Image();
    if (!sourceUrl.startsWith('blob:') && !sourceUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        setLoadError('Image has invalid dimensions.');
        return;
      }
      loadedImageRef.current = img;
      setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) {
        setLoadError('Could not load this image file. Please try another photo.');
      }
    };
    img.src = sourceUrl;

    return () => {
      cancelled = true;
    };
  }, [isOpen, sourceUrl, defaultAutoGenerateTheme, isEditingExisting]);

  // Observe stage container size
  useEffect(() => {
    if (!isOpen) return;
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  // Compute available crop area inside stage (tighter margins on mobile screens)
  const stagePadX = stageSize.width < 460 ? 20 : 44;
  const stagePadY = stageSize.height < 380 ? 44 : 58; // Extra room for bottom floating toolbar
  const availW = Math.max(120, stageSize.width - stagePadX * 2);
  const availH = Math.max(120, stageSize.height - stagePadY * 2);

  // Determine crop box pixel dimensions on stage
  const cropBox = useMemo(() => {
    if (aspectPreset === 'free') {
      return {
        width: Math.max(96, Math.min(availW, freeCropSize.width)),
        height: Math.max(96, Math.min(availH, freeCropSize.height)),
      };
    }

    let ratio = 9 / 16;
    if (aspectPreset === 'original') {
      if (imgSize) {
        const isOddTurns = Math.abs(quarterTurns) % 2 === 1;
        ratio = isOddTurns ? imgSize.height / imgSize.width : imgSize.width / imgSize.height;
      }
    } else {
      const found = ASPECT_PRESETS.find(p => p.id === aspectPreset);
      if (found?.ratio) ratio = found.ratio;
    }

    if (availW / availH > ratio) {
      const h = availH;
      const w = Math.max(64, h * ratio);
      return { width: w, height: h };
    }
    const w = availW;
    const h = Math.max(64, w / ratio);
    return { width: w, height: h };
  }, [aspectPreset, availW, availH, freeCropSize, imgSize, quarterTurns]);

  // Total rotation angle in degrees & radians
  const totalDeg = quarterTurns * 90 + straighten;
  const rad = (totalDeg * Math.PI) / 180;

  // Minimum cover scale so the rotated image always completely covers the crop box
  const minScale = useMemo(() => {
    if (!imgSize) return 1;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));
    const scaleX = (cropBox.width * absCos + cropBox.height * absSin) / imgSize.width;
    const scaleY = (cropBox.width * absSin + cropBox.height * absCos) / imgSize.height;
    return Math.max(scaleX, scaleY);
  }, [imgSize, cropBox.width, cropBox.height, rad]);

  const effectiveScale = minScale * zoom;

  // Clamped pan coordinates in preview space
  const clampedPan = useMemo(() => {
    if (!imgSize) return { x: 0, y: 0 };
    return clampPanToBounds(
      pan,
      cropBox.width,
      cropBox.height,
      imgSize.width,
      imgSize.height,
      effectiveScale,
      rad
    );
  }, [pan, cropBox.width, cropBox.height, imgSize, effectiveScale, rad]);

  // Output pixel dimensions (capped at 1920px longest side for crisp HD Telegram wallpapers)
  const outputDimensions = useMemo(() => {
    if (!imgSize || effectiveScale <= 0) return { width: 1080, height: 1920 };
    const naturalCropW = cropBox.width / effectiveScale;
    const naturalCropH = cropBox.height / effectiveScale;
    const maxOutDim = 1920;
    const scaleFactor = Math.min(1, maxOutDim / Math.max(naturalCropW, naturalCropH));
    return {
      width: Math.max(64, Math.round(naturalCropW * scaleFactor)),
      height: Math.max(64, Math.round(naturalCropH * scaleFactor)),
    };
  }, [imgSize, cropBox.width, cropBox.height, effectiveScale]);

  const hasToneChanges = brightness !== 100 || contrast !== 100 || saturation !== 100;
  const cssFilter = hasToneChanges
    ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    : undefined;

  const isModified =
    quarterTurns !== 0 ||
    straighten !== 0 ||
    flipH ||
    flipV ||
    zoom !== 1 ||
    Math.abs(clampedPan.x) > 0.5 ||
    Math.abs(clampedPan.y) > 0.5 ||
    hasToneChanges ||
    aspectPreset !== (isEditingExisting ? 'original' : '9:16');

  // Switch aspect preset (syncing freeCropSize when entering 'free')
  const handleSelectAspect = (nextPreset: AspectPresetId) => {
    if (nextPreset === 'free' && aspectPreset !== 'free') {
      setFreeCropSize({
        width: Math.round(cropBox.width),
        height: Math.round(cropBox.height),
      });
    }
    triggerSmoothTransform();
    setAspectPreset(nextPreset);
  };

  const handleRotate90 = useCallback(
    (delta: 1 | -1) => {
      triggerSmoothTransform();
      setQuarterTurns(prev => prev + delta);
    },
    [triggerSmoothTransform]
  );

  const handleFlipH = () => {
    triggerSmoothTransform();
    setFlipH(prev => !prev);
  };

  const handleFlipV = () => {
    triggerSmoothTransform();
    setFlipV(prev => !prev);
  };

  const handleResetAll = () => {
    triggerSmoothTransform();
    setAspectPreset(isEditingExisting ? 'original' : '9:16');
    setQuarterTurns(0);
    setStraighten(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // Non-passive wheel zoom listener on stage
  useEffect(() => {
    if (!isOpen) return;
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const deltaFactor = 1 - e.deltaY * 0.0014;
      setZoom(prev => {
        const next = Math.max(1, Math.min(4, Number((prev * deltaFactor).toFixed(3))));
        return next;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; startZoom: number } | null>(null);

  // Pan & touch pinch-to-zoom pointer handlers
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgSize || isResizingCrop) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartRef.current = { dist: Math.max(1, dist), startZoom: zoom };
      setIsDraggingPan(false);
      panDragStartRef.current = null;
      return;
    }

    setIsDraggingPan(true);
    setIsAnimatingTransform(false);
    panDragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startPanX: clampedPan.x,
      startPanY: clampedPan.y,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizingCrop && resizeDragStartRef.current) {
      const { handle, pointerX, pointerY, startW, startH } = resizeDragStartRef.current;
      const dx = e.clientX - pointerX;
      const dy = e.clientY - pointerY;

      let nextW = startW;
      let nextH = startH;

      if (handle.includes('e')) nextW = startW + dx * 2;
      if (handle.includes('w')) nextW = startW - dx * 2;
      if (handle.includes('s')) nextH = startH + dy * 2;
      if (handle.includes('n')) nextH = startH - dy * 2;

      setFreeCropSize({
        width: Math.max(96, Math.min(availW, Math.round(nextW))),
        height: Math.max(96, Math.min(availH, Math.round(nextH))),
      });
      return;
    }

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = dist / pinchStartRef.current.dist;
      const nextZoom = Math.max(1, Math.min(4, Number((pinchStartRef.current.startZoom * ratio).toFixed(3))));
      setZoom(nextZoom);
      return;
    }

    if (!isDraggingPan || !panDragStartRef.current || !imgSize) return;
    const dx = e.clientX - panDragStartRef.current.pointerX;
    const dy = e.clientY - panDragStartRef.current.pointerY;

    const candidate = {
      x: panDragStartRef.current.startPanX + dx,
      y: panDragStartRef.current.startPanY + dy,
    };
    setPan(
      clampPanToBounds(
        candidate,
        cropBox.width,
        cropBox.height,
        imgSize.width,
        imgSize.height,
        effectiveScale,
        rad
      )
    );
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (activePointersRef.current.size === 1) {
      const [remaining] = Array.from(activePointersRef.current.values());
      setIsDraggingPan(true);
      panDragStartRef.current = {
        pointerX: remaining.x,
        pointerY: remaining.y,
        startPanX: clampedPan.x,
        startPanY: clampedPan.y,
      };
      return;
    }
    setIsDraggingPan(false);
    setIsResizingCrop(false);
    panDragStartRef.current = null;
    resizeDragStartRef.current = null;
  };

  const handleResizePointerDown = (
    handle: ResizeHandle,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    stageRef.current?.setPointerCapture(e.pointerId);
    setIsResizingCrop(true);
    setIsAnimatingTransform(false);
    resizeDragStartRef.current = {
      handle,
      pointerX: e.clientX,
      pointerY: e.clientY,
      startW: cropBox.width,
      startH: cropBox.height,
    };
  };

  // Bake cropped, rotated, flipped, tone-adjusted image to Canvas -> File + Data URL
  const handleConfirm = useCallback(async () => {
    const img = loadedImageRef.current;
    if (!img || !imgSize || isApplying) return;

    setIsApplying(true);
    try {
      const outW = outputDimensions.width;
      const outH = outputDimensions.height;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Solid dark base behind image (guarantees clean JPEG encoding with zero artifacts)
      ctx.fillStyle = '#0b0c10';
      ctx.fillRect(0, 0, outW, outH);

      if (cssFilter) {
        ctx.filter = cssFilter;
      }

      const scaleToOutput = outW / cropBox.width;
      ctx.save();
      ctx.translate(
        outW / 2 + clampedPan.x * scaleToOutput,
        outH / 2 + clampedPan.y * scaleToOutput
      );
      ctx.rotate(rad);
      ctx.scale(
        effectiveScale * scaleToOutput * (flipH ? -1 : 1),
        effectiveScale * scaleToOutput * (flipV ? -1 : 1)
      );
      ctx.drawImage(img, -imgSize.width / 2, -imgSize.height / 2, imgSize.width, imgSize.height);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => {
            if (b) resolve(b);
            else reject(new Error('Failed to encode cropped wallpaper image'));
          },
          'image/jpeg',
          0.92
        );
      });

      const baseName = (fileName || 'wallpaper').replace(/\.[^/.]+$/, '');
      const processedFile = new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      await onConfirm({
        file: processedFile,
        dataUrl,
        autoGenerateTheme,
      });
    } catch (err) {
      console.error('Failed to process cropped image', err);
      setLoadError('Failed to process image. Please try again.');
      setIsApplying(false);
    }
  }, [
    imgSize,
    isApplying,
    outputDimensions.width,
    outputDimensions.height,
    cssFilter,
    cropBox.width,
    clampedPan.x,
    clampedPan.y,
    rad,
    effectiveScale,
    flipH,
    flipV,
    fileName,
    autoGenerateTheme,
    onConfirm,
  ]);

  // Keyboard shortcuts while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isApplying) onCancel();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (!isInput && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRotate90(e.shiftKey ? -1 : 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isApplying, onCancel, handleRotate90]);

  if (!isOpen || !sourceUrl) return null;

  const normalizedAngleDisplay = (((Math.round((quarterTurns * 90 + straighten) * 10) / 10) % 360) + 360) % 360;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-modal-title"
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className="relative w-full max-w-5xl h-[100dvh] sm:h-[min(90dvh,760px)] bg-surface-panel/95 backdrop-blur-xl border-0 sm:border border-surface-border rounded-none sm:rounded-2xl flex flex-col overflow-hidden text-[#EDEDEF]"
        style={{
          boxShadow:
            '0 25px 75px rgba(0,0,0,0.92), 0 0 60px var(--color-brand-glow), inset 0 1px 0 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-surface-border flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 bg-surface-panel/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/30 flex items-center justify-center shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="image-crop-modal-title"
                className="font-semibold text-sm sm:text-base text-white leading-tight truncate"
              >
                {isEditingExisting ? 'Crop & Adjust Wallpaper' : 'Prepare Wallpaper Image'}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10.5px] sm:text-[11px] text-slate-400 mt-0.5">
                <span className="truncate max-w-[120px] sm:max-w-[280px]">{fileName}</span>
                {imgSize && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-brand-300 shrink-0">
                      {outputDimensions.width} × {outputDimensions.height} px
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isModified && (
              <button
                type="button"
                onClick={handleResetAll}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-surface-card hover:bg-surface-cardHover border border-surface-border flex items-center gap-1.5 transition cursor-pointer"
                title="Reset crop, rotation, zoom, and tone adjustments"
              >
                <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              disabled={isApplying}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-50"
              aria-label="Close image editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Workspace: Crop Stage + Controls Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Interactive Crop Stage */}
          <div
            ref={stageRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            className={`relative flex-1 min-w-0 min-h-[260px] bg-[#07080c] overflow-hidden select-none touch-none ${
              isDraggingPan ? 'cursor-grabbing' : imgSize ? 'cursor-grab' : 'cursor-default'
            }`}
          >
            {/* Subtle dot grid behind image */}
            <div
              className="absolute inset-0 studio-canvas-grid opacity-30 pointer-events-none"
              aria-hidden="true"
            />

            {loadError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-sm text-rose-300 font-medium">{loadError}</p>
                <button
                  type="button"
                  onClick={onCancel}
                  className="mt-3 studio-btn-secondary px-4 py-1.5 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : !imgSize ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                <span className="text-xs">Loading image preview...</span>
              </div>
            ) : (
              <>
                {/* Transformed Source Image */}
                <img
                  src={sourceUrl}
                  alt="Wallpaper crop preview"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: imgSize.width,
                    height: imgSize.height,
                    marginLeft: -imgSize.width / 2,
                    marginTop: -imgSize.height / 2,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transformOrigin: 'center center',
                    transform: `translate3d(${clampedPan.x}px, ${clampedPan.y}px, 0) rotate(${totalDeg}deg) scale(${
                      effectiveScale * (flipH ? -1 : 1)
                    }, ${effectiveScale * (flipV ? -1 : 1)})`,
                    filter: cssFilter,
                    transition: isAnimatingTransform ? 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
                    pointerEvents: 'none',
                    willChange: 'transform',
                  }}
                />

                {/* Centered Crop Frame + Dimmed Exterior Scrim */}
                <div
                  className="absolute left-1/2 top-1/2 pointer-events-none"
                  style={{
                    width: cropBox.width,
                    height: cropBox.height,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 9999px rgba(5, 7, 12, 0.74)',
                    border: '1.5px solid rgba(255, 255, 255, 0.85)',
                    borderRadius: aspectPreset === '9:16' || aspectPreset === '9:19.5' ? '14px' : '4px',
                    transition:
                      isAnimatingTransform && !isResizingCrop
                        ? 'width 180ms ease, height 180ms ease'
                        : 'none',
                  }}
                >
                  {/* Rule-of-thirds grid lines */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-150 ${
                      isDraggingPan || isResizingCrop ? 'opacity-70' : 'opacity-28'
                    }`}
                  >
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/60" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/60" />
                  </div>

                  {/* Optional Telegram UI Composition Guide */}
                  {showTelegramGuide && (
                    <div className="absolute inset-0 flex flex-col justify-between p-2.5 overflow-hidden rounded-[inherit]">
                      {/* Mock Action Bar */}
                      <div className="h-7 rounded-lg bg-black/45 backdrop-blur-xs border border-white/15 px-2 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-white/25 shrink-0" />
                        <div className="space-y-0.5 flex-1">
                          <div className="h-1.5 w-14 rounded-full bg-white/50" />
                          <div className="h-1 w-9 rounded-full bg-white/25" />
                        </div>
                      </div>

                      {/* Mock Chat Bubbles */}
                      <div className="space-y-1.5 my-auto py-2">
                        <div className="w-[62%] rounded-xl rounded-bl-xs bg-black/45 backdrop-blur-xs border border-white/15 px-2.5 py-2 space-y-1">
                          <div className="h-1.5 w-4/5 rounded-full bg-white/45" />
                          <div className="h-1.5 w-3/5 rounded-full bg-white/25" />
                        </div>
                        <div className="w-[58%] ml-auto rounded-xl rounded-br-xs bg-brand-500/45 backdrop-blur-xs border border-brand-300/35 px-2.5 py-2 space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-white/65" />
                          <div className="h-1.5 w-2/3 rounded-full bg-white/40" />
                        </div>
                      </div>

                      {/* Mock Input Bar */}
                      <div className="h-7 rounded-full bg-black/45 backdrop-blur-xs border border-white/15 px-2.5 flex items-center justify-between">
                        <div className="h-1.5 w-16 rounded-full bg-white/30" />
                        <div className="w-3.5 h-3.5 rounded-full bg-brand-400/60" />
                      </div>
                    </div>
                  )}

                  {/* Crisp Corner Brackets (interactive in Free mode) */}
                  {(
                    [
                      {
                        id: 'nw' as ResizeHandle,
                        pos: '-top-[2px] -left-[2px]',
                        border: 'border-t-[3px] border-l-[3px] rounded-tl-sm',
                        cursor: 'cursor-nwse-resize',
                      },
                      {
                        id: 'ne' as ResizeHandle,
                        pos: '-top-[2px] -right-[2px]',
                        border: 'border-t-[3px] border-r-[3px] rounded-tr-sm',
                        cursor: 'cursor-nesw-resize',
                      },
                      {
                        id: 'sw' as ResizeHandle,
                        pos: '-bottom-[2px] -left-[2px]',
                        border: 'border-b-[3px] border-l-[3px] rounded-bl-sm',
                        cursor: 'cursor-nesw-resize',
                      },
                      {
                        id: 'se' as ResizeHandle,
                        pos: '-bottom-[2px] -right-[2px]',
                        border: 'border-b-[3px] border-r-[3px] rounded-br-sm',
                        cursor: 'cursor-nwse-resize',
                      },
                    ] as const
                  ).map(corner => (
                    <div
                      key={corner.id}
                      onPointerDown={
                        aspectPreset === 'free'
                          ? e => handleResizePointerDown(corner.id, e)
                          : undefined
                      }
                      className={`absolute w-5 h-5 border-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] ${corner.pos} ${corner.border} ${
                        aspectPreset === 'free'
                          ? `pointer-events-auto ${corner.cursor} border-brand-400`
                          : 'pointer-events-none'
                      }`}
                    />
                  ))}

                  {/* Interactive Edge Handles in Free Crop Mode */}
                  {aspectPreset === 'free' && (
                    <>
                      <div
                        onPointerDown={e => handleResizePointerDown('n', e)}
                        className="pointer-events-auto absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-3 cursor-ns-resize flex items-center justify-center"
                      >
                        <div className="w-7 h-1 rounded-full bg-brand-400 shadow" />
                      </div>
                      <div
                        onPointerDown={e => handleResizePointerDown('s', e)}
                        className="pointer-events-auto absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-3 cursor-ns-resize flex items-center justify-center"
                      >
                        <div className="w-7 h-1 rounded-full bg-brand-400 shadow" />
                      </div>
                      <div
                        onPointerDown={e => handleResizePointerDown('w', e)}
                        className="pointer-events-auto absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-10 cursor-ew-resize flex items-center justify-center"
                      >
                        <div className="h-7 w-1 rounded-full bg-brand-400 shadow" />
                      </div>
                      <div
                        onPointerDown={e => handleResizePointerDown('e', e)}
                        className="pointer-events-auto absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-10 cursor-ew-resize flex items-center justify-center"
                      >
                        <div className="h-7 w-1 rounded-full bg-brand-400 shadow" />
                      </div>
                    </>
                  )}
                </div>

                {/* Top-left angle/ratio HUD badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md border border-white/12 text-[10.5px] font-mono text-slate-200">
                    {aspectPreset === 'free'
                      ? 'FREE CROP'
                      : aspectPreset === 'original'
                      ? 'ORIGINAL'
                      : aspectPreset}
                  </span>
                  {(quarterTurns !== 0 || straighten !== 0) && (
                    <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md border border-brand-500/35 text-[10.5px] font-mono text-brand-300">
                      {normalizedAngleDisplay}°
                    </span>
                  )}
                </div>

                {/* Bottom Floating Quick Toolbar */}
                <div
                  onPointerDown={e => e.stopPropagation()}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-xl bg-surface-panel/90 backdrop-blur-md border border-white/12 shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(1, Number((z - 0.15).toFixed(2))))}
                    disabled={zoom <= 1}
                    title="Zoom out"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-35"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerSmoothTransform();
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    title="Reset zoom & pan"
                    className="px-2 py-0.5 rounded-md font-mono text-[11px] text-slate-200 hover:bg-white/10 transition cursor-pointer min-w-[46px] text-center"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(4, Number((z + 0.15).toFixed(2))))}
                    disabled={zoom >= 4}
                    title="Zoom in"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-35"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-white/12 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => handleRotate90(-1)}
                    title="Rotate 90° left (Shift+R)"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate90(1)}
                    title="Rotate 90° right (R)"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-white/12 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => setShowTelegramGuide(prev => !prev)}
                    title="Toggle Telegram chat UI overlay guide"
                    className={`px-2 py-1 rounded-lg text-[10.5px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer ${
                      showTelegramGuide
                        ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Smartphone className="w-3 h-3 shrink-0" />
                    <span className="hidden sm:inline">UI Guide</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Controls Sidebar (Bottom Scrollable Sheet on Mobile) */}
          <div className="w-full md:w-76 lg:w-80 max-h-[38dvh] md:max-h-none border-t md:border-t-0 md:border-l border-surface-border bg-surface-panel/90 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 shrink-0">
            {/* Aspect Ratio Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Crop Aspect Ratio
                </span>
                {aspectPreset === 'free' && (
                  <span className="text-[10px] text-brand-300">Drag edges/corners</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ASPECT_PRESETS.map(preset => {
                  const active = aspectPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectAspect(preset.id)}
                      className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer ${
                        active
                          ? 'bg-brand-500/18 border-brand-500/50 text-white font-semibold'
                          : 'bg-surface-base/80 border-surface-border text-slate-400 hover:text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <span className="text-[11px] block leading-tight">{preset.label}</span>
                      {preset.sublabel && (
                        <span
                          className={`text-[9px] block leading-tight mt-0.5 ${
                            active ? 'text-brand-300' : 'text-slate-500'
                          }`}
                        >
                          {preset.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rotation & Flip Controls */}
            <div className="space-y-3 pt-3 border-t border-surface-border/70">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Rotate &amp; Flip
              </span>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRotate90(-1)}
                  className="py-2 rounded-lg bg-surface-base border border-surface-border hover:border-white/25 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                  title="Rotate 90° Counter-Clockwise"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[10px]">-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate90(1)}
                  className="py-2 rounded-lg bg-surface-base border border-surface-border hover:border-white/25 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[10px]">+90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleFlipH}
                  className={`py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    flipH
                      ? 'bg-brand-500/18 border-brand-500/50 text-white'
                      : 'bg-surface-base border-surface-border hover:border-white/25 text-slate-300 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal2 className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[10px]">Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={handleFlipV}
                  className={`py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    flipV
                      ? 'bg-brand-500/18 border-brand-500/50 text-white'
                      : 'bg-surface-base border-surface-border hover:border-white/25 text-slate-300 hover:text-white'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical2 className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-[10px]">Flip V</span>
                </button>
              </div>

              {/* Straighten / Fine Tilt Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Straighten / Tilt</span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerSmoothTransform();
                      setStraighten(0);
                    }}
                    className="font-mono text-brand-400 hover:underline cursor-pointer"
                    title="Click to reset tilt to 0°"
                  >
                    {straighten > 0 ? `+${straighten}°` : `${straighten}°`}
                  </button>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={0.5}
                  value={straighten}
                  onChange={e => setStraighten(Number(e.target.value))}
                  aria-label="Fine rotation angle"
                  className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Zoom</span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerSmoothTransform();
                      setZoom(1);
                    }}
                    className="font-mono text-brand-400 hover:underline cursor-pointer"
                    title="Click to reset zoom to 100%"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.01}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  aria-label="Zoom level"
                  className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            </div>

            {/* Optional Tone & Color Adjustments */}
            <div className="pt-3 border-t border-surface-border/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowToneControls(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-brand-400" />
                  <span>Tone Adjustments</span>
                  {hasToneChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowToneControls(prev => !prev)}
                  className="text-[10.5px] text-brand-400 hover:underline cursor-pointer"
                >
                  {showToneControls ? 'Hide' : 'Adjust'}
                </button>
              </div>

              {showToneControls && (
                <div className="space-y-2.5 p-2.5 rounded-xl bg-surface-base/75 border border-surface-border animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-400" />
                        Brightness
                      </span>
                      <span className="font-mono text-slate-300">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={brightness}
                      onChange={e => setBrightness(Number(e.target.value))}
                      className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Contrast className="w-3 h-3 text-sky-400" />
                        Contrast
                      </span>
                      <span className="font-mono text-slate-300">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={contrast}
                      onChange={e => setContrast(Number(e.target.value))}
                      className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-emerald-400" />
                        Saturation
                      </span>
                      <span className="font-mono text-slate-300">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={saturation}
                      onChange={e => setSaturation(Number(e.target.value))}
                      className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  {hasToneChanges && (
                    <button
                      type="button"
                      onClick={() => {
                        setBrightness(100);
                        setContrast(100);
                        setSaturation(100);
                      }}
                      className="text-[10.5px] text-brand-400 hover:underline cursor-pointer"
                    >
                      Reset tone adjustments
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Confirmation Behavior Options */}
            <div className="pt-3 border-t border-surface-border/70 space-y-2.5">
              <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-surface-card/70 border border-surface-border">
                <div className="min-w-0">
                  <span className="text-[11.5px] font-medium text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Auto-generate theme</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">
                    Extract palette from cropped area &amp; restyle Telegram colors
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoGenerateTheme}
                  onClick={() => setAutoGenerateTheme(prev => !prev)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    autoGenerateTheme ? 'bg-brand-500' : 'bg-surface-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      autoGenerateTheme ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-surface-base/60 border border-surface-border/80">
                <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>Chat bubbles guide</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTelegramGuide}
                  onClick={() => setShowTelegramGuide(prev => !prev)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    showTelegramGuide ? 'bg-brand-500' : 'bg-surface-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      showTelegramGuide ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 pb-safe border-t border-surface-border bg-surface-base/90 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            <Move className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Drag image to reposition • Scroll to zoom • Press R to rotate</span>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto md:ml-auto">
            <button
              type="button"
              onClick={onCancel}
              disabled={isApplying}
              className="px-3.5 py-2.5 sm:py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!imgSize || isApplying || Boolean(loadError)}
              className="studio-btn-primary flex-1 md:flex-initial px-4 sm:px-4.5 py-2.5 sm:py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {autoGenerateTheme ? 'Apply & Generate Theme' : 'Apply Wallpaper'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
