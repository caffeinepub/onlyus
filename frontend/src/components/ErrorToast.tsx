import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  onClose: () => void;
}

export default function ErrorToast({ message, onClose }: ErrorToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-4 left-1/2 z-[100] max-w-sm w-[calc(100%-2rem)]"
      style={{
        transform: `translateX(-50%) translateY(${visible ? '0' : '-120%'})`,
        transition: 'transform 300ms ease-in-out',
      }}
    >
      <div className="flex items-start gap-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl px-4 py-3 shadow-romantic">
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="shrink-0 text-rose-500 hover:text-rose-700 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
