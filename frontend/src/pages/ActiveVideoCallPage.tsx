import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGetCallSession, useUpdateCallStatus, useAddICECandidate } from '../hooks/useQueries';
import { CallStatus } from '../backend';
import { useErrorToast } from '../hooks/useErrorToast';
import { PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera, Loader2 } from 'lucide-react';

interface ActiveVideoCallPageProps {
  sessionId: string;
  partnerName: string;
  onEnded: () => void;
}

export default function ActiveVideoCallPage({ sessionId, partnerName, onEnded }: ActiveVideoCallPageProps) {
  const { showError } = useErrorToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // PiP drag state
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 });
  const pipDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (e) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
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
        showError('Failed to access camera/microphone');
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

  const handleCameraToggle = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isCameraOff;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleSwitchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: newFacing },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerRef.current) {
        const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newVideoTrack);
      }

      localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      localStreamRef.current = newStream;
      setFacingMode(newFacing);
    } catch {
      showError('Failed to switch camera');
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

  // PiP drag handlers
  const handlePipMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    pipDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pipPos.x,
      startPosY: pipPos.y,
    };
    const handleMouseMove = (me: MouseEvent) => {
      if (!pipDragRef.current) return;
      const dx = me.clientX - pipDragRef.current.startX;
      const dy = me.clientY - pipDragRef.current.startY;
      setPipPos({
        x: Math.max(0, pipDragRef.current.startPosX + dx),
        y: Math.max(0, pipDragRef.current.startPosY + dy),
      });
    };
    const handleMouseUp = () => {
      pipDragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [pipPos]);

  const handlePipTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    pipDragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: pipPos.x,
      startPosY: pipPos.y,
    };
    const handleTouchMove = (te: TouchEvent) => {
      if (!pipDragRef.current) return;
      const t = te.touches[0];
      const dx = t.clientX - pipDragRef.current.startX;
      const dy = t.clientY - pipDragRef.current.startY;
      setPipPos({
        x: Math.max(0, pipDragRef.current.startPosX + dx),
        y: Math.max(0, pipDragRef.current.startPosY + dy),
      });
    };
    const handleTouchEnd = () => {
      pipDragRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  }, [pipPos]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Partner name + duration overlay */}
        <div className="absolute top-4 left-0 right-0 flex flex-col items-center pointer-events-none">
          <p className="font-serif text-white text-lg font-semibold drop-shadow">{partnerName}</p>
          <p className="text-white/70 text-sm font-mono">{formatDuration(duration)}</p>
        </div>

        {/* PiP local video */}
        <div
          className="absolute w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg cursor-grab active:cursor-grabbing"
          style={{ right: `${pipPos.x}px`, top: `${pipPos.y}px` }}
          onMouseDown={handlePipMouseDown}
          onTouchStart={handlePipTouchStart}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 flex items-center justify-around px-6 py-4 sm:py-6 bg-black/80">
        <button
          onClick={handleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
          }`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={handleCameraToggle}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isCameraOff ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
          }`}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <button
          onClick={handleEnd}
          disabled={isEnding}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {isEnding ? <Loader2 size={22} className="animate-spin" /> : <PhoneOff size={22} />}
        </button>

        <button
          onClick={handleSwitchCamera}
          className="w-12 h-12 rounded-full bg-white/10 text-white/70 flex items-center justify-center"
        >
          <SwitchCamera size={20} />
        </button>
      </div>
    </div>
  );
}
