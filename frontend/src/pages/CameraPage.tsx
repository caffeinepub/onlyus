import React, { useState, useCallback } from 'react';
import { useCamera } from '../camera/useCamera';
import { useUploadMedia } from '../hooks/useQueries';
import { ExternalBlob } from '../backend';
import { compressImage, formatFileSize } from '../utils/compressImage';
import { useErrorToast } from '../hooks/useErrorToast';
import {
  Camera,
  RotateCcw,
  Save,
  X,
  Loader2,
  AlertCircle,
  SwitchCamera,
} from 'lucide-react';

interface CameraPageProps {
  isPaired?: boolean;
}

export default function CameraPage({ isPaired }: CameraPageProps) {
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [capturedBytes, setCapturedBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const { showError } = useErrorToast();

  const {
    isActive,
    isSupported,
    error: cameraError,
    isLoading: cameraLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: 'environment' });

  const uploadMedia = useUploadMedia();

  const handleCapture = useCallback(async () => {
    const file = await capturePhoto();
    if (!file) return;

    setIsCompressing(true);
    try {
      const { compressed, originalSize, compressedSize } = await compressImage(file);
      setCompressionInfo({ original: originalSize, compressed: compressedSize });

      // Ensure we have a plain ArrayBuffer (not SharedArrayBuffer) by copying via slice
      const plainBuffer: ArrayBuffer = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength
      ) as ArrayBuffer;
      const safeBytes = new Uint8Array(plainBuffer) as Uint8Array<ArrayBuffer>;

      const previewBlob = new Blob([plainBuffer], { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(previewBlob);
      setCapturedPreviewUrl(previewUrl);
      setCapturedBytes(safeBytes);
    } catch {
      showError('Failed to process photo — please try again');
    } finally {
      setIsCompressing(false);
    }
  }, [capturePhoto, showError]);

  const handleRetake = useCallback(() => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedPreviewUrl(null);
    setCapturedBytes(null);
    setCompressionInfo(null);
    setUploadError(null);
  }, [capturedPreviewUrl]);

  const handleSave = useCallback(async () => {
    if (!capturedBytes) return;
    setUploadError(null);

    try {
      const blob = ExternalBlob.fromBytes(capturedBytes);
      await uploadMedia.mutateAsync({ blob, mimeType: 'image/jpeg' });

      // Clear preview after successful upload
      if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
      setCapturedBytes(null);
      setCompressionInfo(null);
    } catch {
      setUploadError('Upload failed — please try again');
      showError('Upload failed — please try again');
    }
  }, [capturedBytes, capturedPreviewUrl, uploadMedia, showError]);

  if (!isPaired) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <Camera size={48} className="text-rose-pink/40 mb-4" />
        <p className="font-serif text-xl text-rose-dark mb-2">Camera</p>
        <p className="text-rose-pink text-sm">Pair with your partner to share photos 💕</p>
      </div>
    );
  }

  if (isSupported === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <AlertCircle size={48} className="text-rose-pink/40 mb-4" />
        <p className="font-serif text-xl text-rose-dark mb-2">Camera not supported</p>
        <p className="text-rose-pink text-sm">Your browser doesn't support camera access</p>
      </div>
    );
  }

  // Preview screen
  if (capturedPreviewUrl) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex-1 relative overflow-hidden">
          <img
            src={capturedPreviewUrl}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Compression info */}
        {compressionInfo && (
          <div className="bg-black/80 px-4 py-2 text-center">
            <p className="text-white/70 text-xs">
              Original: {formatFileSize(compressionInfo.original)} → Compressed: {formatFileSize(compressionInfo.compressed)}
            </p>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="bg-rose-900/80 px-4 py-2 text-center">
            <p className="text-white text-xs">{uploadError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="shrink-0 flex items-center justify-around px-8 py-6 bg-black">
          <button
            onClick={handleRetake}
            disabled={uploadMedia.isPending}
            className="flex flex-col items-center gap-1 text-white/80 disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center">
              <RotateCcw size={20} />
            </div>
            <span className="text-xs">Retake</span>
          </button>

          <button
            onClick={handleSave}
            disabled={uploadMedia.isPending}
            className="flex flex-col items-center gap-1 text-white disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full bg-rose-pink flex items-center justify-center">
              {uploadMedia.isPending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Save size={24} />
              )}
            </div>
            <span className="text-xs">{uploadMedia.isPending ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Camera viewfinder
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '200px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera error overlay */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
            <AlertCircle size={40} className="text-rose-pink mb-3" />
            <p className="text-white text-sm mb-4">{cameraError.message}</p>
            <button
              onClick={() => startCamera()}
              className="px-4 py-2 rounded-full bg-rose-pink text-white text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {cameraLoading && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 size={32} className="animate-spin text-rose-pink" />
          </div>
        )}

        {/* Not started */}
        {!isActive && !cameraLoading && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <button
              onClick={() => startCamera()}
              className="px-6 py-3 rounded-full bg-rose-pink text-white font-medium"
            >
              Start Camera
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-around px-8 py-6 bg-black">
        {/* Switch camera */}
        <button
          onClick={() => switchCamera()}
          disabled={!isActive || cameraLoading}
          className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white/70 disabled:opacity-30"
        >
          <SwitchCamera size={18} />
        </button>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={!isActive || cameraLoading || isCompressing}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isCompressing ? (
            <Loader2 size={24} className="animate-spin text-white" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white" />
          )}
        </button>

        {/* Stop camera */}
        <button
          onClick={() => stopCamera()}
          disabled={!isActive || cameraLoading}
          className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white/70 disabled:opacity-30"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
