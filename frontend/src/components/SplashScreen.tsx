import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  show: boolean;
}

export default function SplashScreen({ show }: SplashScreenProps) {
  const [visible, setVisible] = useState(show);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (show) {
      setVisible(true);
      requestAnimationFrame(() => {
        setTimeout(() => setOpacity(1), 10);
      });
    } else {
      setOpacity(0);
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blush-white"
      style={{
        opacity,
        transition: 'opacity 400ms ease-in-out',
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center shadow-romantic"
          style={{ background: 'oklch(0.92 0.04 10)' }}
        >
          <img
            src="/assets/generated/onlyus-logo.dim_256x256.png"
            alt="OnlyUs Logo"
            className="w-24 h-24 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="text-5xl" style={{ display: 'none' }}>💕</span>
        </div>
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-rose-dark tracking-wide">
            OnlyUs
          </h1>
          <p className="text-rose-pink mt-2 text-sm font-light tracking-widest uppercase">
            Just the two of you
          </p>
        </div>
        <div className="flex gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-rose-pink"
              style={{
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
