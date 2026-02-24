import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonCallCard() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/60 border border-rose-100 mb-2">
      <Skeleton className="w-10 h-10 rounded-full bg-rose-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-32 bg-rose-100" />
        <Skeleton className="h-3 w-24 bg-rose-50" />
      </div>
      <Skeleton className="h-4 w-16 bg-rose-50" />
    </div>
  );
}
