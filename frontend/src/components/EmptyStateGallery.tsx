import React from 'react';

export default function EmptyStateGallery() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <img
        src="/assets/generated/empty-gallery.dim_400x300.png"
        alt="No photos yet"
        className="w-48 h-36 object-contain mb-6 opacity-90"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <p className="font-serif text-xl text-rose-dark font-semibold mb-2">
        Your shared memories will appear here 🌸
      </p>
      <p className="text-rose-pink text-sm">
        Capture a moment together
      </p>
    </div>
  );
}
