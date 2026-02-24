import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { CallStatus, CallType } from '../backend';
import type { Message, MediaItem, CallSession, CallHistory, UserProfile } from '../backend';
import { ExternalBlob } from '../backend';
import { showError } from './useErrorToast';

export { CallType };

// ── Profile hooks ──────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetMyProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMyProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPartnerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ['partnerProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPartnerProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsPaired() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ['isPaired'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isPaired();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserCount() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ['userCount'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUserCount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRegisterUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.registerUser(username);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userCount'] });
    },
    onError: () => {
      showError('Registration failed — please try again');
    },
  });
}

export function usePairWithCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.pairWithCode(code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isPaired'] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['partnerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
    onError: () => {
      showError('Pairing failed — please check the code and try again');
    },
  });
}

export function useGenerateCoupleCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.generateCoupleCode();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ── Message hooks ──────────────────────────────────────────────────────────

export function useGetMessages(offset?: number, limit?: number) {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ['messages', offset ?? 0, limit ?? 20],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const offsetBig = offset !== undefined ? BigInt(offset) : null;
      const limitBig = limit !== undefined ? BigInt(limit) : BigInt(20);
      return actor.getMessages(offsetBig, limitBig);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendMessage(text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => {
      showError('Failed to send message — please try again');
    },
  });
}

export function useMarkMessagesRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.markMessagesRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// ── Gallery hooks ──────────────────────────────────────────────────────────

export function useGetGalleryMedia(isPaired?: boolean, offset?: number, limit?: number) {
  const { actor, isFetching } = useActor();
  return useQuery<MediaItem[]>({
    queryKey: ['galleryMedia', offset ?? 0, limit ?? 12],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const offsetBig = offset !== undefined ? BigInt(offset) : null;
      const limitBig = limit !== undefined ? BigInt(limit) : BigInt(12);
      return actor.getGalleryMedia(offsetBig, limitBig);
    },
    enabled: !!actor && !isFetching && (isPaired !== false),
  });
}

export function useUploadMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ blob, mimeType }: { blob: ExternalBlob; mimeType: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadMedia(blob, mimeType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryMedia'] });
    },
    onError: () => {
      showError('Upload failed — please try again');
    },
  });
}

export function useDeleteMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMedia(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleryMedia'] });
    },
    onError: () => {
      showError('Failed to delete photo — please try again');
    },
  });
}

// ── Call hooks ─────────────────────────────────────────────────────────────

export function useCreateCallSession() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ receiverId, callType }: { receiverId: string; callType: CallType }) => {
      if (!actor) throw new Error('Actor not available');
      const { Principal } = await import('@dfinity/principal');
      const result = await actor.createCallSession(Principal.fromText(receiverId), callType);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result.ok;
    },
    onError: () => {
      showError('Call failed to connect — please try again');
    },
  });
}

export function useUpdateCallStatus() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: CallStatus }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.updateCallStatus(sessionId, status);
      if (result.__kind__ === 'err') throw new Error(result.err);
    },
    onError: () => {
      showError('Failed to update call status');
    },
  });
}

export function useSetOffer() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ sessionId, sdp }: { sessionId: string; sdp: string }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.setOffer(sessionId, sdp);
      if (result.__kind__ === 'err') throw new Error(result.err);
    },
  });
}

export function useSetAnswer() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ sessionId, sdp }: { sessionId: string; sdp: string }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.setAnswer(sessionId, sdp);
      if (result.__kind__ === 'err') throw new Error(result.err);
    },
  });
}

export function useAddICECandidate() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      sessionId,
      candidate,
      isCallerCandidate,
    }: {
      sessionId: string;
      candidate: string;
      isCallerCandidate: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.addICECandidate(sessionId, candidate, isCallerCandidate);
      if (result.__kind__ === 'err') throw new Error(result.err);
    },
  });
}

export function useGetCallSession(sessionId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<CallSession | null>({
    queryKey: ['callSession', sessionId],
    queryFn: async () => {
      if (!actor || !sessionId) return null;
      return actor.getCallSession(sessionId);
    },
    enabled: !!actor && !isFetching && !!sessionId,
    refetchInterval: 2000,
  });
}

export function useGetActiveCallSession() {
  const { actor, isFetching } = useActor();
  return useQuery<CallSession | null>({
    queryKey: ['activeCallSession'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getActiveCallSession();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
  });
}

export function useGetCallHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<CallHistory[]>({
    queryKey: ['callHistory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCallHistory();
    },
    enabled: !!actor && !isFetching,
  });
}
