import React from 'react';
import { useGetCallHistory, useGetPartnerProfile, useCreateCallSession } from '../hooks/useQueries';
import { CallHistory } from '../backend';
import { Variant_missed_ended_declined, CallType } from '../backend';
import { Phone, Video, PhoneCall, PhoneOff, PhoneMissed, Loader2 } from 'lucide-react';
import SkeletonCallCard from '../components/SkeletonCallCard';
import EmptyStateCalls from '../components/EmptyStateCalls';
import { formatTimestamp } from '../utils/formatTimestamp';

interface CallsPageProps {
  onStartVoiceCall: (partnerId: string, partnerName: string, sessionId: string) => void;
  onStartVideoCall: (partnerId: string, partnerName: string, sessionId: string) => void;
}

export default function CallsPage({ onStartVoiceCall, onStartVideoCall }: CallsPageProps) {
  const { data: callHistory, isLoading, isFetched } = useGetCallHistory();
  const { data: partnerProfile } = useGetPartnerProfile();
  const createSession = useCreateCallSession();

  const handleVoiceCall = async () => {
    if (!partnerProfile) return;
    try {
      const session = await createSession.mutateAsync({
        receiverId: partnerProfile.principal.toString(),
        callType: CallType.voice,
      });
      onStartVoiceCall(
        partnerProfile.principal.toString(),
        partnerProfile.username,
        session.id
      );
    } catch {
      // error handled by mutation
    }
  };

  const handleVideoCall = async () => {
    if (!partnerProfile) return;
    try {
      const session = await createSession.mutateAsync({
        receiverId: partnerProfile.principal.toString(),
        callType: CallType.video,
      });
      onStartVideoCall(
        partnerProfile.principal.toString(),
        partnerProfile.username,
        session.id
      );
    } catch {
      // error handled by mutation
    }
  };

  const getStatusIcon = (status: Variant_missed_ended_declined) => {
    switch (status) {
      case Variant_missed_ended_declined.ended:
        return <PhoneCall size={16} className="text-green-500" />;
      case Variant_missed_ended_declined.declined:
        return <PhoneOff size={16} className="text-red-400" />;
      case Variant_missed_ended_declined.missed:
        return <PhoneMissed size={16} className="text-amber-400" />;
    }
  };

  const getStatusLabel = (status: Variant_missed_ended_declined) => {
    switch (status) {
      case Variant_missed_ended_declined.ended: return 'Ended';
      case Variant_missed_ended_declined.declined: return 'Declined';
      case Variant_missed_ended_declined.missed: return 'Missed';
    }
  };

  const formatDuration = (seconds: bigint) => {
    const s = Number(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  };

  return (
    <div className="flex flex-col h-full bg-blush-white">
      {/* Call buttons */}
      <div className="shrink-0 px-4 py-4 bg-white/80 backdrop-blur-sm border-b border-rose-100">
        <p className="text-center text-sm text-rose-pink mb-3 font-medium">
          {partnerProfile ? `Call ${partnerProfile.username} 💕` : 'Pair with your partner to call'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleVoiceCall}
            disabled={!partnerProfile || createSession.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-pink text-white font-medium text-sm disabled:opacity-50 hover:bg-rose-dark transition-colors active:scale-95"
          >
            {createSession.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Phone size={16} />
            )}
            Voice Call
          </button>
          <button
            onClick={handleVideoCall}
            disabled={!partnerProfile || createSession.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-warm-accent text-white font-medium text-sm disabled:opacity-50 hover:opacity-90 transition-all active:scale-95"
          >
            {createSession.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Video size={16} />
            )}
            Video Call
          </button>
        </div>
      </div>

      {/* Call history */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h3 className="font-serif text-base text-rose-dark font-semibold mb-3">Call History</h3>

        {/* Loading skeletons */}
        {isLoading && !isFetched && (
          <div>
            <SkeletonCallCard />
            <SkeletonCallCard />
            <SkeletonCallCard />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && isFetched && (!callHistory || callHistory.length === 0) && (
          <EmptyStateCalls />
        )}

        {/* History list */}
        {callHistory && callHistory.length > 0 && (
          <div className="flex flex-col gap-2">
            {[...callHistory].reverse().map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/70 border border-rose-100"
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                  {record.callType === CallType.video ? (
                    <Video size={18} className="text-warm-accent" />
                  ) : (
                    <Phone size={18} className="text-rose-pink" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-rose-dark truncate">
                    {record.callerUsername} → {record.receiverUsername}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {getStatusIcon(record.status)}
                    <span className="text-xs text-rose-pink/70">
                      {record.callType === CallType.video ? 'Video' : 'Voice'} · {getStatusLabel(record.status)}
                      {record.status === Variant_missed_ended_declined.ended && ` · ${formatDuration(record.durationSeconds)}`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-rose-pink/50 shrink-0">
                  {formatTimestamp(record.timestamp.toString())}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
