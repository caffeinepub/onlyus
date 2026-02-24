import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface PhotoModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  uploaderName?: string;
  timestamp?: string;
}

export default function PhotoModal({
  imageUrl,
  isOpen,
  onClose,
  uploaderName,
  timestamp,
}: PhotoModalProps) {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const clampTranslate = useCallback(
    (tx: number, ty: number, currentScale: number) => {
      const maxX = Math.max(0, (currentScale - 1) * 150);
      const maxY = Math.max(0, (currentScale - 1) * 150);
      return {
        x: Math.min(maxX, Math.max(-maxX, tx)),
        y: Math.min(maxY, Math.max(-maxY, ty)),
      };
    },
    []
  );

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenterRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx: translateX,
        ty: translateY,
      };
      setIsDragging(true);
    }
  }, [translateX, translateY]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist / lastTouchDistRef.current;
        lastTouchDistRef.current = dist;

        setScale((prev) => {
          const next = Math.min(5, Math.max(1, prev * delta));
          return next;
        });
      } else if (e.touches.length === 1 && dragStartRef.current && scale > 1) {
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;
        const clamped = clampTranslate(
          dragStartRef.current.tx + dx,
          dragStartRef.current.ty + dy,
          scale
        );
        setTranslateX(clamped.x);
        setTranslateY(clamped.y);
      }
    },
    [scale, clampTranslate]
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchDistRef.current = null;
    lastTouchCenterRef.current = null;
    dragStartRef.current = null;
    setIsDragging(false);
    // Snap back if scale < 1
    setScale((prev) => {
      if (prev < 1) {
        setTranslateX(0);
        setTranslateY(0);
        return 1;
      }
      return prev;
    });
  }, []);

  // Mouse wheel zoom for desktop
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => {
        const next = Math.min(5, Math.max(1, prev * delta));
        if (next === 1) {
          setTranslateX(0);
          setTranslateY(0);
        }
        return next;
      });
    },
    []
  );

  const handleZoomIn = () => setScale((p) => Math.min(5, p + 0.5));
  const handleZoomOut = () => {
    setScale((p) => {
      const next = Math.max(1, p - 0.5);
      if (next === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return next;
    });
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-rose-dark/90 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Zoom controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Image container */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={imageUrl}
          alt="Full screen view"
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            touchAction: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Meta info */}
      {(uploaderName || timestamp) && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-rose-dark/60 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/80 text-xs flex gap-2">
            {uploaderName && <span className="font-medium">{uploaderName}</span>}
            {uploaderName && timestamp && <span>·</span>}
            {timestamp && <span>{timestamp}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
