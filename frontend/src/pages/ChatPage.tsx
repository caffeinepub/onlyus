import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetMessages, useSendMessage, useMarkMessagesRead } from '../hooks/useQueries';
import { Message } from '../backend';
import { formatTimestamp } from '../utils/formatTimestamp';
import { Send, Loader2, ChevronUp } from 'lucide-react';
import SkeletonMessageBubble from '../components/SkeletonMessageBubble';
import EmptyStateChat from '../components/EmptyStateChat';

const PAGE_SIZE = 20;

export default function ChatPage() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const [inputText, setInputText] = useState('');
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, isFetched } = useGetMessages(0, PAGE_SIZE);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();

  // Initialize with first page
  useEffect(() => {
    if (isFetched && messages && !initialized) {
      setAllMessages(messages);
      setHasMore(messages.length >= PAGE_SIZE);
      setInitialized(true);
    }
  }, [isFetched, messages, initialized]);

  // Poll for new messages — update last page
  useEffect(() => {
    if (isFetched && messages && initialized) {
      setAllMessages((prev) => {
        // Merge: keep older messages, replace the last PAGE_SIZE with fresh data
        if (prev.length <= PAGE_SIZE) {
          return messages;
        }
        return [...prev.slice(0, prev.length - PAGE_SIZE), ...messages];
      });
    }
  }, [messages, isFetched, initialized]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (initialized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length, initialized]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (initialized && allMessages.length > 0) {
      markRead.mutate();
    }
  }, [initialized]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendMessage.mutateAsync(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;
    if (container.scrollTop === 0) {
      setLoadingMore(true);
      const newOffset = offset + PAGE_SIZE;
      // We need to fetch older messages — use actor directly via a one-off query
      // Since useGetMessages is a hook, we'll use the queryClient approach
      try {
        // Import actor from useActor
        const { useActor } = await import('../hooks/useActor');
        // We can't call hooks here, so we'll use a workaround via fetch
        // Instead, we'll track offset and trigger a re-query
        setOffset(newOffset);
      } catch {
        // ignore
      } finally {
        setLoadingMore(false);
      }
    }
  }, [loadingMore, hasMore, offset]);

  // Separate query for pagination (load more)
  const { data: olderMessages, isFetched: olderFetched } = useGetMessages(
    offset > 0 ? offset : undefined,
    offset > 0 ? PAGE_SIZE : undefined
  );

  useEffect(() => {
    if (offset > 0 && olderFetched && olderMessages) {
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;

      setAllMessages((prev) => {
        const combined = [...olderMessages, ...prev];
        return combined;
      });

      if (olderMessages.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Restore scroll position
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });

      setLoadingMore(false);
    }
  }, [olderMessages, olderFetched, offset]);

  return (
    <div className="flex flex-col h-full bg-blush-white">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-4"
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 size={18} className="animate-spin text-rose-pink" />
          </div>
        )}
        {!hasMore && allMessages.length > 0 && (
          <div className="text-center py-2 text-xs text-rose-pink/60">
            No more messages
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && !initialized && (
          <div className="flex flex-col gap-2 py-2">
            <SkeletonMessageBubble side="left" />
            <SkeletonMessageBubble side="right" />
            <SkeletonMessageBubble side="left" />
            <SkeletonMessageBubble side="right" />
            <SkeletonMessageBubble side="left" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && initialized && allMessages.length === 0 && (
          <EmptyStateChat />
        )}

        {/* Messages */}
        {allMessages.map((msg, idx) => {
          const isMe = msg.senderPrincipal.toString() === myPrincipal;
          return (
            <div
              key={idx}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 px-4`}
            >
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-sm`}>
                {!isMe && (
                  <span className="text-xs text-rose-pink mb-1 font-medium">
                    {msg.senderUsername}
                  </span>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm break-words ${
                    isMe
                      ? 'bg-rose-pink text-white rounded-br-sm'
                      : 'bg-white text-rose-dark border border-rose-100 rounded-bl-sm'
                  }`}
                >
                  {msg.messageText}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-rose-pink/50">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                  {isMe && (
                    <span className="text-[10px] text-rose-pink/50">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur-sm border-t border-rose-100">
        <div className="flex items-end gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something sweet... 💕"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-sm text-rose-dark placeholder:text-rose-pink/40 focus:outline-none focus:ring-2 focus:ring-rose-pink/30 max-h-24 overflow-y-auto"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sendMessage.isPending}
            className="shrink-0 w-10 h-10 rounded-full bg-rose-pink text-white flex items-center justify-center disabled:opacity-50 transition-all hover:bg-rose-dark active:scale-95"
          >
            {sendMessage.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
