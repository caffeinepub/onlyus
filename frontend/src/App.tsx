import React, { useState, useCallback } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import LandingPage from './pages/LandingPage';
import RegistrationPage from './pages/RegistrationPage';
import PairingPage from './pages/PairingPage';
import ChatPage from './pages/ChatPage';
import CameraPage from './pages/CameraPage';
import GalleryPage from './pages/GalleryPage';
import CallsPage from './pages/CallsPage';
import OutgoingCallPage from './pages/OutgoingCallPage';
import ActiveCallPage from './pages/ActiveCallPage';
import VideoOutgoingCallPage from './pages/VideoOutgoingCallPage';
import ActiveVideoCallPage from './pages/ActiveVideoCallPage';
import IncomingCallOverlay from './components/IncomingCallOverlay';
import VideoIncomingCallOverlay from './components/VideoIncomingCallOverlay';
import BottomTabNavigator from './components/BottomTabNavigator';
import SplashScreen from './components/SplashScreen';
import ErrorToast from './components/ErrorToast';
import { useErrorToastProvider } from './hooks/useErrorToast';
import { useGetCallerUserProfile } from './hooks/useQueries';

type Tab = 'chat' | 'camera' | 'gallery' | 'calls';
type CallState =
  | 'idle'
  | 'outgoing-voice'
  | 'outgoing-video'
  | 'active-voice'
  | 'active-video';

interface CallInfo {
  sessionId: string;
  partnerId: string;
  partnerName: string;
}

function AppContent() {
  const { identity, isInitializing, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();

  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [pageKey, setPageKey] = useState(0);

  const { state: errorState, hideError } = useErrorToastProvider();

  // Show splash while auth is initializing
  const showSplash = isInitializing;

  // Determine which screen to show — userProfile can be null (no profile) or undefined (loading)
  const profileReady = isAuthenticated && !profileLoading && profileFetched;
  const showProfileSetup = profileReady && (userProfile === null || userProfile === undefined);
  const showPairing = profileReady && !!userProfile && !userProfile.paired;
  const showMain = profileReady && !!userProfile && userProfile.paired;

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setPageKey((k) => k + 1);
  }, []);

  const handleStartVoiceCall = useCallback((partnerId: string, partnerName: string, sessionId: string) => {
    setCallInfo({ sessionId, partnerId, partnerName });
    setCallState('outgoing-voice');
  }, []);

  const handleStartVideoCall = useCallback((partnerId: string, partnerName: string, sessionId: string) => {
    setCallInfo({ sessionId, partnerId, partnerName });
    setCallState('outgoing-video');
  }, []);

  const handleCallConnected = useCallback((sessionId: string) => {
    setCallInfo((prev) => prev ? { ...prev, sessionId } : null);
    setCallState((prev) =>
      prev === 'outgoing-voice' ? 'active-voice' : 'active-video'
    );
  }, []);

  const handleCallEnded = useCallback(() => {
    setCallState('idle');
    setCallInfo(null);
    setActiveTab('calls');
    setPageKey((k) => k + 1);
  }, []);

  // These are called by IncomingCallOverlay / VideoIncomingCallOverlay via onCallActive
  const handleIncomingVoiceActive = useCallback(
    (_sessionId: string, _pc: RTCPeerConnection, _stream: MediaStream) => {
      setCallInfo((prev) => prev ? prev : { sessionId: _sessionId, partnerId: '', partnerName: '' });
      setCallState('active-voice');
    },
    []
  );

  const handleIncomingVideoActive = useCallback(
    (_sessionId: string, _pc: RTCPeerConnection, _stream: MediaStream, _callType: 'video') => {
      setCallInfo((prev) => prev ? prev : { sessionId: _sessionId, partnerId: '', partnerName: '' });
      setCallState('active-video');
    },
    []
  );

  const isPaired = !!userProfile && userProfile.paired;

  return (
    <>
      <SplashScreen show={showSplash} />

      {errorState.visible && (
        <ErrorToast message={errorState.message} onClose={hideError} />
      )}

      {!showSplash && (
        <div className="page-enter page-enter-active" key={isAuthenticated ? 'auth' : 'unauth'}>
          {!isAuthenticated && <LandingPage />}

          {showProfileSetup && (
            <RegistrationPage
              onRegistered={() => {
                queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
                queryClient.invalidateQueries({ queryKey: ['myProfile'] });
              }}
            />
          )}

          {showPairing && (
            <PairingPage />
          )}

          {showMain && (
            <>
              {/* Incoming call overlays — always mounted when idle */}
              {callState === 'idle' && (
                <>
                  <IncomingCallOverlay onCallActive={handleIncomingVoiceActive} />
                  <VideoIncomingCallOverlay onCallActive={handleIncomingVideoActive} />
                </>
              )}

              {/* Call screens */}
              {callState === 'outgoing-voice' && callInfo && (
                <OutgoingCallPage
                  partnerId={callInfo.partnerId}
                  partnerName={callInfo.partnerName}
                  sessionId={callInfo.sessionId}
                  onConnected={handleCallConnected}
                  onCancelled={handleCallEnded}
                />
              )}

              {callState === 'outgoing-video' && callInfo && (
                <VideoOutgoingCallPage
                  partnerId={callInfo.partnerId}
                  partnerName={callInfo.partnerName}
                  sessionId={callInfo.sessionId}
                  onConnected={handleCallConnected}
                  onCancelled={handleCallEnded}
                />
              )}

              {callState === 'active-voice' && callInfo && (
                <ActiveCallPage
                  sessionId={callInfo.sessionId}
                  partnerName={callInfo.partnerName}
                  onEnded={handleCallEnded}
                />
              )}

              {callState === 'active-video' && callInfo && (
                <ActiveVideoCallPage
                  sessionId={callInfo.sessionId}
                  partnerName={callInfo.partnerName}
                  onEnded={handleCallEnded}
                />
              )}

              {/* Main tab UI */}
              {callState === 'idle' && (
                <div className="flex flex-col h-screen bg-blush-white overflow-hidden">
                  {/* Header */}
                  <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-rose-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/generated/onlyus-logo.dim_256x256.png"
                        alt="OnlyUs"
                        className="w-7 h-7 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="font-serif text-lg font-bold text-rose-dark">OnlyUs</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {userProfile && (
                        <span className="text-xs text-rose-pink font-medium">
                          Hi, {userProfile.username} 💕
                        </span>
                      )}
                      <button
                        onClick={async () => {
                          await clear();
                          queryClient.clear();
                        }}
                        className="text-xs text-rose-pink/50 hover:text-rose-dark transition-colors underline"
                      >
                        Sign out
                      </button>
                    </div>
                  </header>

                  {/* Tab content */}
                  <main className="flex-1 overflow-hidden relative">
                    <div
                      key={`${activeTab}-${pageKey}`}
                      className="page-enter page-enter-active h-full"
                    >
                      {activeTab === 'chat' && <ChatPage />}
                      {activeTab === 'camera' && <CameraPage isPaired={isPaired} />}
                      {activeTab === 'gallery' && <GalleryPage isPaired={isPaired} />}
                      {activeTab === 'calls' && (
                        <CallsPage
                          onStartVoiceCall={handleStartVoiceCall}
                          onStartVideoCall={handleStartVideoCall}
                        />
                      )}
                    </div>
                  </main>

                  {/* Bottom tab bar */}
                  <BottomTabNavigator activeTab={activeTab} onTabChange={handleTabChange} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function App() {
  return <AppContent />;
}
