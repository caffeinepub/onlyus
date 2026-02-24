import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonGridCell() {
  return (
    <div className="aspect-square w-full overflow-hidden rounded-sm">
      <Skeleton className="w-full h-full bg-rose-100" />
    </div>
  );
}
