import React from 'react';

export default function EmptyStateChat() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <img
        src="/assets/generated/empty-chat.dim_400x300.png"
        alt="No messages yet"
        className="w-48 h-36 object-contain mb-6 opacity-90"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <p className="font-serif text-xl text-rose-dark font-semibold mb-2">
        Say hello to your person 💕
      </p>
      <p className="text-rose-pink text-sm">
        Your conversation starts here
      </p>
    </div>
  );
}
