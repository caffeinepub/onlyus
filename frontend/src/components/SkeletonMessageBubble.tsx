import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonMessageBubbleProps {
  side: 'left' | 'right';
}

export default function SkeletonMessageBubble({ side }: SkeletonMessageBubbleProps) {
  const isRight = side === 'right';
  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'} mb-3 px-4`}>
      <div className={`flex flex-col gap-1 ${isRight ? 'items-end' : 'items-start'}`}>
        <Skeleton
          className={`h-10 rounded-2xl bg-rose-100 ${isRight ? 'w-40' : 'w-52'}`}
        />
        <Skeleton className="h-3 w-16 bg-rose-50" />
      </div>
    </div>
  );
}
