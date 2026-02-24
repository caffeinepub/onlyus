import { useState, useEffect, useRef, useCallback } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import {
  useGetActiveCallSession,
  useSetAnswer,
  useUpdateCallStatus,
  useAddICECandidate,
} from '../hooks/useQueries';
import { CallStatus, CallType } from '../backend';
import { PhoneOff, Video, VideoOff, Heart } from 'lucide-react';

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface VideoIncomingCallOverlayProps {
  onCallActive: (
    sessionId: string,
    pc: RTCPeerConnection,
    stream: MediaStream,
    callType: 'video',
  ) => void;
}

export default function VideoIncomingCallOverlay({ onCallActive }: VideoIncomingCallOverlayProps) {
  const { identity } = useInternetIdentity();
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const handledSessionRef = useRef<string | null>(null);

  const { data: activeSession } = useGetActiveCallSession();
  const setAnswer = useSetAnswer();
  const updateStatus = useUpdateCallStatus();
  const addICE = useAddICECandidate();

  const myPrincipal = identity?.getPrincipal().toString();

  // Show overlay when there's an incoming VIDEO call for this user
  useEffect(() => {
    if (
      activeSession &&
      activeSession.status === CallStatus.calling &&
      activeSession.callType === CallType.video &&
      activeSession.receiverId.toString() === myPrincipal &&
      handledSessionRef.current !== activeSession.id
    ) {
      setVisible(true);
      setPermissionDenied(false);
    } else if (!activeSession || activeSession.status !== CallStatus.calling) {
      if (!accepting && !declining) {
        setVisible(false);
      }
    }
  }, [activeSession, myPrincipal, accepting, declining]);

  const handleAccept = useCallback(async () => {
    if (!activeSession || !activeSession.offerSDP) return;
    setAccepting(true);
    setPermissionDenied(false);
    handledSessionRef.current = activeSession.id;

    try {
      // 1. Request camera + mic permissions
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        setPermissionDenied(true);
        setAccepting(false);
        handledSessionRef.current = null;
        return;
      }

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(STUN_SERVERS);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 3. Collect ICE candidates
      const sentCandidates = new Set<string>();
      pc.onicecandidate = async (event) => {
        if (event.candidate && activeSession.id) {
          const candidateStr = JSON.stringify(event.candidate.toJSON());
          if (!sentCandidates.has(candidateStr)) {
            sentCandidates.add(candidateStr);
            try {
              await addICE.mutateAsync({
                sessionId: activeSession.id,
                candidate: candidateStr,
                isCallerCandidate: false,
              });
            } catch (e) {
              console.error('Failed to add ICE candidate:', e);
            }
          }
        }
      };

      // 4. Set remote description (offer)
      const offer = JSON.parse(activeSession.offerSDP);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // 5. Create answer (includes video tracks)
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Store answer SDP
      await setAnswer.mutateAsync({
        sessionId: activeSession.id,
        sdp: JSON.stringify(answer),
      });

      // 7. Update status to active
      await updateStatus.mutateAsync({
        sessionId: activeSession.id,
        status: CallStatus.active,
      });

      setVisible(false);
      setAccepting(false);
      onCallActive(activeSession.id, pc, stream, 'video');
    } catch (err) {
      console.error('Failed to accept video call:', err);
      setAccepting(false);
      handledSessionRef.current = null;
    }
  }, [activeSession, setAnswer, updateStatus, addICE, onCallActive]);

  const handleDecline = useCallback(async () => {
    if (!activeSession) return;
    setDeclining(true);
    handledSessionRef.current = activeSession.id;

    try {
      await updateStatus.mutateAsync({
        sessionId: activeSession.id,
        status: CallStatus.declined,
      });
    } catch (err) {
      console.error('Failed to decline video call:', err);
    } finally {
      setVisible(false);
      setDeclining(false);
    }
  }, [activeSession, updateStatus]);

  if (!visible || !activeSession) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-md animate-in fade-in duration-300">
      {/* Decorative hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <Heart
            key={i}
            className="absolute text-rose-pink/10 animate-pulse"
            fill="currentColor"
            style={{
              width: `${20 + i * 10}px`,
              height: `${20 + i * 10}px`,
              top: `${8 + i * 18}%`,
              right: `${5 + i * 12}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-6 px-8 text-center">
        {/* Incoming video call label */}
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-rose-pink/80 animate-pulse" />
          <p className="text-rose-pink/80 text-sm font-semibold tracking-widest uppercase animate-pulse">
            Incoming Video Call
          </p>
        </div>

        {/* Pulsing avatar */}
        <div className="relative">
          <div className="absolute inset-[-12px] rounded-full bg-rose-pink/20 animate-ping" />
          <div className="absolute inset-[-6px] rounded-full bg-rose-pink/15 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-rose-pink to-warm-accent flex items-center justify-center shadow-romantic">
            <span className="text-white font-serif text-4xl font-bold">
              {activeSession.callerUsername.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Caller name */}
        <div>
          <h2 className="font-serif text-3xl font-bold text-white">
            {activeSession.callerUsername}
          </h2>
          <p className="text-rose-pink/70 mt-1 text-sm">wants to video call you…</p>
        </div>

        {/* Permission denied message */}
        {permissionDenied && (
          <div className="bg-rose-pink/10 border border-rose-pink/30 rounded-xl px-4 py-3 max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <VideoOff className="w-4 h-4 text-rose-pink shrink-0" />
              <p className="text-rose-pink text-sm font-semibold">Camera Access Denied</p>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">
              Please allow camera and microphone access in your browser settings to accept video calls.
            </p>
          </div>
        )}

        {/* Accept / Decline buttons */}
        <div className="flex items-center gap-12 mt-4">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleDecline}
              disabled={accepting || declining}
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center shadow-romantic transition-all duration-200 active:scale-95 disabled:opacity-60"
              aria-label="Decline video call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-white/60 text-xs">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-romantic transition-all duration-200 active:scale-95 disabled:opacity-60"
              aria-label="Accept video call"
            >
              {accepting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Video className="w-7 h-7" />
              )}
            </button>
            <span className="text-white/60 text-xs">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
