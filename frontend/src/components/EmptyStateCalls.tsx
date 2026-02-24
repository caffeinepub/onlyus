import React from 'react';

export default function EmptyStateCalls() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <img
        src="/assets/generated/empty-calls.dim_400x300.png"
        alt="No calls yet"
        className="w-48 h-36 object-contain mb-6 opacity-90"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <p className="font-serif text-xl text-rose-dark font-semibold mb-2">
        No calls yet 💕
      </p>
      <p className="text-rose-pink text-sm">
        Start a voice or video call with your partner
      </p>
    </div>
  );
}
