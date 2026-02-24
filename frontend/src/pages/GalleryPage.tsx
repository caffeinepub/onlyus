import React, { useState, useEffect, useCallback } from 'react';
import { useGetGalleryMedia, useDeleteMedia } from '../hooks/useQueries';
import { MediaItem } from '../backend';
import PhotoModal from '../components/PhotoModal';
import SkeletonGridCell from '../components/SkeletonGridCell';
import EmptyStateGallery from '../components/EmptyStateGallery';
import { Loader2, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { ExternalBlob } from '../backend';
import { formatTimestamp } from '../utils/formatTimestamp';

interface GalleryPageProps {
  isPaired?: boolean;
}

const PAGE_SIZE = 12;

function getItemUrl(blob: ExternalBlob): string {
  try {
    return blob.getDirectURL();
  } catch {
    return '';
  }
}

export default function GalleryPage({ isPaired }: GalleryPageProps) {
  const [allItems, setAllItems] = useState<MediaItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Modal state — using imageUrl/isOpen pattern to match PhotoModal's props
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: mediaItems, isLoading, isFetched, isError, refetch } = useGetGalleryMedia(isPaired, 0, PAGE_SIZE);
  const { data: moreItems, isFetched: moreFetched } = useGetGalleryMedia(
    isPaired,
    offset > 0 ? offset : undefined,
    offset > 0 ? PAGE_SIZE : undefined
  );
  const deleteMedia = useDeleteMedia();

  // Initialize with first page
  useEffect(() => {
    if (isFetched && mediaItems && !initialized) {
      setAllItems(mediaItems);
      setHasMore(mediaItems.length >= PAGE_SIZE);
      setInitialized(true);
    }
  }, [isFetched, mediaItems, initialized]);

  // Append more items when offset changes
  useEffect(() => {
    if (offset > 0 && moreFetched && moreItems) {
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = moreItems.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      if (moreItems.length < PAGE_SIZE) {
        setHasMore(false);
      }
    }
  }, [moreItems, moreFetched, offset]);

  const handleLoadMore = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE);
  }, []);

  const handleView = useCallback((item: MediaItem) => {
    const url = getItemUrl(item.blob);
    if (url) {
      setSelectedUrl(url);
      setSelectedItem(item);
    }
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteMedia.mutateAsync(id);
      setAllItems((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirm(null);
      if (selectedItem?.id === id) {
        setSelectedUrl(null);
        setSelectedItem(null);
      }
    } catch {
      // error handled by mutation
    }
  };

  if (!isPaired) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="font-serif text-xl text-rose-dark mb-2">Gallery</p>
        <p className="text-rose-pink text-sm">Pair with your partner to share photos 💕</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
        <AlertCircle size={40} className="text-rose-pink" />
        <p className="font-serif text-lg text-rose-dark">Couldn't load gallery</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-pink text-white text-sm"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-blush-white">
      <div className="flex-1 overflow-y-auto p-2">
        {/* Loading skeleton */}
        {isLoading && !initialized && (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonGridCell key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && initialized && allItems.length === 0 && (
          <EmptyStateGallery />
        )}

        {/* Gallery grid */}
        {allItems.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-1">
              {allItems.map((item) => {
                const url = getItemUrl(item.blob);
                return (
                  <div
                    key={item.id}
                    className="aspect-square relative overflow-hidden rounded-sm bg-rose-50 cursor-pointer group"
                    onClick={() => handleView(item)}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt="Gallery item"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-rose-100">
                        <span className="text-rose-pink/40 text-xs">No preview</span>
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(item.id);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-6 py-2 rounded-full bg-rose-pink text-white text-sm font-medium hover:bg-rose-dark transition-colors"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
            <p className="font-serif text-lg text-rose-dark text-center mb-4">
              Delete this photo?
            </p>
            <p className="text-sm text-rose-pink/70 text-center mb-6">
              This can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-full border border-rose-200 text-rose-dark text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMedia.isPending}
                className="flex-1 py-2 rounded-full bg-rose-500 text-white text-sm flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {deleteMedia.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo modal — uses existing PhotoModal interface */}
      <PhotoModal
        imageUrl={selectedUrl}
        isOpen={!!selectedUrl}
        onClose={() => {
          setSelectedUrl(null);
          setSelectedItem(null);
        }}
        uploaderName={selectedItem?.uploaderUsername}
        timestamp={selectedItem ? formatTimestamp(selectedItem.timestampNanos.toString()) : undefined}
      />
    </div>
  );
}
