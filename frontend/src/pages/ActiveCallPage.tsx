import React, { useEffect, useRef, useState } from 'react';
import { useGetCallSession, useUpdateCallStatus, useAddICECandidate } from '../hooks/useQueries';
import { CallStatus } from '../backend';
import { useErrorToast } from '../hooks/useErrorToast';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface ActiveCallPageProps {
  sessionId: string;
  partnerName: string;
  onEnded: () => void;
}

export default function ActiveCallPage({ sessionId, partnerName, onEnded }: ActiveCallPageProps) {
  const { showError } = useErrorToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);

  const { data: session } = useGetCallSession(sessionId);
  const updateStatus = useUpdateCallStatus();
  const addICE = useAddICECandidate();

  // Duration timer
  useEffect(() => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Setup peer connection
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = e.streams[0];
          }
        };

        pc.onicecandidate = async (e) => {
          if (e.candidate) {
            try {
              await addICE.mutateAsync({
                sessionId,
                candidate: JSON.stringify(e.candidate),
                isCallerCandidate: false,
              });
            } catch {}
          }
        };

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if ((state === 'failed' || state === 'disconnected') && !endedRef.current) {
            showError('Call ended unexpectedly');
            endedRef.current = true;
            setTimeout(onEnded, 1500);
          }
        };
      } catch (err) {
        showError('Failed to access microphone');
        setTimeout(onEnded, 1500);
      }
    };

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();
    };
  }, [sessionId]);

  // Watch for partner ending call
  useEffect(() => {
    if (!session || endedRef.current) return;
    if (session.status === CallStatus.ended || session.status === CallStatus.declined) {
      endedRef.current = true;
      onEnded();
    }
  }, [session]);

  const handleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleSpeaker = async () => {
    if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const speaker = devices.find((d) => d.kind === 'audiooutput');
        if (speaker) {
          await (remoteAudioRef.current as any).setSinkId(
            isSpeakerOn ? 'default' : speaker.deviceId
          );
          setIsSpeakerOn(!isSpeakerOn);
        }
      } catch {}
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);
    endedRef.current = true;
    try {
      await updateStatus.mutateAsync({ sessionId, status: CallStatus.ended });
    } catch {}
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
    onEnded();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-rose-dark p-4 sm:p-6">
      <audio ref={remoteAudioRef} autoPlay />

      <div className="flex flex-col items-center gap-6 text-center w-full max-w-xs">
        <div className="w-24 h-24 rounded-full bg-rose-pink/30 flex items-center justify-center">
          <span className="text-5xl">💕</span>
        </div>
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-bold">{partnerName}</h2>
          <p className="text-white/60 text-lg mt-1 font-mono">{formatDuration(duration)}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={handleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={handleEnd}
            disabled={isEnding}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isEnding ? <Loader2 size={24} className="animate-spin" /> : <PhoneOff size={24} />}
          </button>

          <button
            onClick={handleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isSpeakerOn ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}
