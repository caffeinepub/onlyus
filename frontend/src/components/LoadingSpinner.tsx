import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 32, className = '', fullScreen = false }: LoadingSpinnerProps) {
  const spinner = (
    <Loader2
      size={size}
      className={`animate-spin text-rose-pink ${className}`}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-blush-white">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
}
