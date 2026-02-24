import React, { useEffect, useRef, useState } from 'react';
import { useGetCallSession, useUpdateCallStatus, useSetOffer, useAddICECandidate } from '../hooks/useQueries';
import { CallStatus } from '../backend';
import { useErrorToast } from '../hooks/useErrorToast';
import { PhoneOff, Loader2, VideoOff } from 'lucide-react';

interface VideoOutgoingCallPageProps {
  partnerId: string;
  partnerName: string;
  sessionId: string;
  onConnected: (sessionId: string) => void;
  onCancelled: () => void;
}

export default function VideoOutgoingCallPage({
  partnerId,
  partnerName,
  sessionId,
  onConnected,
  onCancelled,
}: VideoOutgoingCallPageProps) {
  const { showError } = useErrorToast();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const connectedRef = useRef(false);

  const { data: session } = useGetCallSession(sessionId);
  const updateStatus = useUpdateCallStatus();
  const setOffer = useSetOffer();
  const addICE = useAddICECandidate();

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

        pc.onicecandidate = async (e) => {
          if (e.candidate) {
            try {
              await addICE.mutateAsync({
                sessionId,
                candidate: JSON.stringify(e.candidate),
                isCallerCandidate: true,
              });
            } catch {}
          }
        };

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if ((state === 'failed' || state === 'disconnected') && !connectedRef.current) {
            showError('Call failed to connect');
            setTimeout(onCancelled, 1500);
          } else if (state === 'failed' || state === 'disconnected') {
            showError('Call ended unexpectedly');
            setTimeout(onCancelled, 1500);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await setOffer.mutateAsync({ sessionId, sdp: JSON.stringify(offer) });
      } catch (err: any) {
        if (!cancelled) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setPermissionDenied(true);
          } else {
            showError('Call failed to connect — please try again');
            setTimeout(onCancelled, 1500);
          }
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [sessionId]);

  // Watch for answer
  useEffect(() => {
    if (!session || connectedRef.current) return;

    if (session.status === CallStatus.declined) {
      showError('Call was declined');
      onCancelled();
      return;
    }

    if (session.answerSDP && peerRef.current && peerRef.current.signalingState !== 'stable') {
      const applyAnswer = async () => {
        try {
          const answer = JSON.parse(session.answerSDP!);
          await peerRef.current!.setRemoteDescription(new RTCSessionDescription(answer));

          for (const candidateStr of session.receiverICE) {
            try {
              const candidate = JSON.parse(candidateStr);
              await peerRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          }

          if (session.status === CallStatus.active) {
            connectedRef.current = true;
            await updateStatus.mutateAsync({ sessionId, status: CallStatus.active });
            onConnected(sessionId);
          }
        } catch {
          showError('Call failed to connect');
          setTimeout(onCancelled, 1500);
        }
      };
      applyAnswer();
    }
  }, [session]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await updateStatus.mutateAsync({ sessionId, status: CallStatus.ended });
    } catch {}
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    onCancelled();
  };

  if (permissionDenied) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-rose-dark px-6 text-center">
        <VideoOff size={48} className="text-white/50 mb-4" />
        <h2 className="font-serif text-2xl text-white font-bold mb-2">Camera Access Denied</h2>
        <p className="text-white/60 text-sm mb-8">
          Please allow camera and microphone access in your browser settings to make video calls.
        </p>
        <button
          onClick={onCancelled}
          className="px-6 py-3 rounded-full bg-white/20 text-white font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Local video preview */}
      <div className="flex-1 relative">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <p className="text-white/70 text-sm">Calling</p>
            <h2 className="font-serif text-3xl text-white font-bold">{partnerName}</h2>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/60"
                  style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <div className="shrink-0 flex justify-center py-6 bg-black">
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {isCancelling ? <Loader2 size={24} className="animate-spin" /> : <PhoneOff size={24} />}
        </button>
      </div>
    </div>
  );
}
