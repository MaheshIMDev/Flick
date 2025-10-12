'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, MonitorUp, Repeat, Maximize, Minimize } from 'lucide-react';

interface VideoCallOverlayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  isIncomingCall: boolean;
  isOutgoingCall: boolean;
  callType: 'audio' | 'video';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  remoteScreenSharing: boolean;
  friendName?: string;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  callStartTime: number | null;
  connectionState: 'connected' | 'reconnecting' | 'failed';
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type PipSize = 'small' | 'medium' | 'large';

export function VideoCallOverlay({
  localStream,
  remoteStream,
  isCallActive,
  isIncomingCall,
  isOutgoingCall,
  callType,
  isMuted,
  isVideoOff,
  isScreenSharing,
  remoteScreenSharing,
  friendName,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  callStartTime,
  connectionState,
}: VideoCallOverlayProps) {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [corner, setCorner] = useState<Corner>('top-right');
  const [pipSize, setPipSize] = useState<PipSize>('medium');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startX: 0, startY: 0 });
  const [callDuration, setCallDuration] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [showPipControls, setShowPipControls] = useState(false);

  useEffect(() => {
    if (isCallActive && callStartTime) {
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCallDuration(0);
    }
  }, [isCallActive, callStartTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const anyoneSharing = isScreenSharing || remoteScreenSharing;
  let showLocalInMain = anyoneSharing ? isScreenSharing : isSwapped;

  const mainStream = showLocalInMain ? localStream : remoteStream;
  const pipStream = showLocalInMain ? remoteStream : localStream;
  const isMirrorMain = showLocalInMain && !isScreenSharing;
  const isMirrorPip = !showLocalInMain && !remoteScreenSharing;

  useEffect(() => {
    if (mainVideoRef.current && mainStream) {
      mainVideoRef.current.srcObject = mainStream;
      mainVideoRef.current.muted = mainStream === localStream;
      mainVideoRef.current.play().catch(e => console.log('Main play error:', e));
    }
  }, [mainStream, localStream]);

  useEffect(() => {
    if (pipVideoRef.current && pipStream) {
      pipVideoRef.current.srcObject = pipStream;
      pipVideoRef.current.muted = pipStream === localStream;
      pipVideoRef.current.play().catch(e => console.log('PiP play error:', e));
    }
  }, [pipStream, localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.play().catch(e => console.log('Remote audio play error:', e));
    }
  }, [remoteStream]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({ x: e.clientX, y: e.clientY, startX: rect.left, startY: rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const newX = dragStart.startX + deltaX;
    const newY = dragStart.startY + deltaY;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const midX = containerWidth / 2;
    const midY = containerHeight / 2;
    const isLeft = newX < midX;
    const isTop = newY < midY;
    if (isTop && isLeft) setCorner('top-left');
    else if (isTop && !isLeft) setCorner('top-right');
    else if (!isTop && isLeft) setCorner('bottom-left');
    else setCorner('bottom-right');
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({ x: touch.clientX, y: touch.clientY, startX: rect.left, startY: rect.top });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    const newX = dragStart.startX + deltaX;
    const newY = dragStart.startY + deltaY;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const midX = containerWidth / 2;
    const midY = containerHeight / 2;
    const isLeft = newX < midX;
    const isTop = newY < midY;
    if (isTop && isLeft) setCorner('top-left');
    else if (isTop && !isLeft) setCorner('top-right');
    else if (!isTop && isLeft) setCorner('bottom-left');
    else setCorner('bottom-right');
  };

  const handleTouchEnd = () => setIsDragging(false);

  const getPosition = () => {
    switch (corner) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-24 left-4 sm:bottom-28 md:bottom-32';
      case 'bottom-right': return 'bottom-24 right-4 sm:bottom-28 md:bottom-32';
    }
  };

  const getPipDimensions = () => {
    switch (pipSize) {
      case 'small': return 'w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-40';
      case 'medium': return 'w-28 h-36 sm:w-36 sm:h-48 md:w-44 md:h-56';
      case 'large': return 'w-36 h-48 sm:w-48 sm:h-64 md:w-56 md:h-72';
    }
  };

  const toggleSwap = () => setIsSwapped(!isSwapped);

  const cyclePipSize = () => {
    setPipSize(current => current === 'small' ? 'medium' : current === 'medium' ? 'large' : 'small');
  };

  if (!isIncomingCall && !isOutgoingCall && !isCallActive) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ✅ Main Video with PADDING */}
      {callType === 'video' && mainStream && (
        <div className="relative w-full h-full flex items-center justify-center bg-black p-2 sm:p-3 md:p-4">
          <video
            ref={mainVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full rounded-lg ${anyoneSharing ? 'object-contain' : 'object-cover'
              } ${isMirrorMain ? 'scale-x-[-1]' : ''}`}
          />

          {anyoneSharing && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2 z-30">
              <MonitorUp className="w-4 h-4" />
              <span className="text-sm">{isScreenSharing ? 'You are sharing your screen' : `${friendName} is sharing screen`}</span>
            </div>
          )}

          {!anyoneSharing && (isCallActive || isOutgoingCall) && (
            <button onClick={toggleSwap} className="absolute top-20 right-4 sm:top-24 sm:right-6 md:top-28 md:right-8 w-10 h-10 sm:w-12 sm:h-12 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 z-30 border border-white/20" title="Switch camera view">
              <Repeat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          )}
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ✅ PiP Video - NO SWAP BUTTON */}
      {callType === 'video' && pipStream && !isVideoOff && (
        <div
          className={`absolute ${getPosition()} ${getPipDimensions()} bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 ${anyoneSharing ? 'border-blue-500' : 'border-white/30 hover:border-teal-500'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} transition-all duration-200 z-10 group`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseEnter={() => setShowPipControls(true)}
          onMouseLeave={() => setShowPipControls(false)}
          title="Drag to move"
        >
          <video ref={pipVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${isMirrorPip ? 'scale-x-[-1]' : ''}`} />

          <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded font-medium backdrop-blur-sm">
            {showLocalInMain ? friendName?.split(' ')[0] || 'Them' : 'You'}
          </div>

          {/* PiP Video Controls - ONLY SIZE BUTTON */}
          {(showPipControls || isDragging) && (
            <div className="absolute bottom-1 right-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cyclePipSize();
                }}
                className="bg-black/70 hover:bg-black/90 text-white p-1 rounded backdrop-blur-sm transition-all"
                title={`Size: ${pipSize}`}
              >
                {pipSize === 'small' ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
              </button>
            </div>
          )}

        </div>
      )}

      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 sm:p-4 md:p-6 pointer-events-none z-20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base sm:text-lg md:text-xl font-semibold text-white truncate max-w-[200px] sm:max-w-xs">{friendName || 'Unknown'}</p>
            {isIncomingCall && <p className="text-xs sm:text-sm text-gray-300">Incoming {callType} call...</p>}
            {isOutgoingCall && <p className="text-xs sm:text-sm text-gray-300">Calling...</p>}
            {connectionState === 'reconnecting' && <p className="text-xs sm:text-sm text-yellow-400 animate-pulse">Reconnecting...</p>}
            {connectionState === 'failed' && <p className="text-xs sm:text-sm text-red-400">Connection failed</p>}
          </div>
          {isCallActive && callStartTime && (
            <div className="bg-black/60 px-2.5 py-1 sm:px-4 sm:py-2 rounded-full backdrop-blur-sm">
              <p className="text-white font-mono text-xs sm:text-sm md:text-lg">{formatDuration(callDuration)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 sm:p-6 md:p-8 z-20">
        <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4">
          {isIncomingCall && (
            <>
              <button onClick={onReject} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95" title="Reject"><PhoneOff className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 text-white" /></button>
              <button onClick={onAnswer} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 animate-pulse" title="Answer"><Phone className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 text-white" /></button>
            </>
          )}

          {(isCallActive || isOutgoingCall) && (
            <>
              <button onClick={onToggleMute} className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 backdrop-blur-sm`} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />}
              </button>
              {callType === 'video' && (
                <>
                  <button onClick={onToggleVideo} className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 backdrop-blur-sm`} title={isVideoOff ? 'Turn on video' : 'Turn off video'}>
                    {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />}
                  </button>
                  <button onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare} disabled={remoteScreenSharing} className={`hidden sm:flex w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 ${isScreenSharing ? 'bg-green-500 hover:bg-green-600' : remoteScreenSharing ? 'bg-gray-500 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'} rounded-full items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 backdrop-blur-sm disabled:opacity-50 disabled:hover:scale-100`} title={remoteScreenSharing ? 'Other person is sharing' : isScreenSharing ? 'Stop sharing' : 'Share screen'}><MonitorUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" /></button>
                  {!anyoneSharing && <button onClick={toggleSwap} className="hidden lg:flex w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-white/20 hover:bg-white/30 rounded-full items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 backdrop-blur-sm" title="Switch camera view"><Repeat className="w-5 h-5 md:w-6 md:h-6 text-white" /></button>}
                </>
              )}
              <button onClick={onEnd} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95" title="End call"><PhoneOff className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" /></button>
            </>
          )}
        </div>
      </div>

      {callType === 'audio' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 px-4">
          <div className="text-center mb-24 sm:mb-32">
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-lg border-4 border-white/30 shadow-2xl">
              <span className="text-5xl sm:text-6xl md:text-8xl font-bold text-white">{friendName?.charAt(0).toUpperCase() || '?'}</span>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl text-white font-semibold mb-3 truncate max-w-xs sm:max-w-md">{friendName}</p>
            {isCallActive && callStartTime && <p className="text-lg sm:text-xl md:text-2xl text-white/90 font-mono">{formatDuration(callDuration)}</p>}
            {isIncomingCall && <p className="text-base sm:text-lg md:text-xl text-white/70 animate-pulse">Incoming audio call...</p>}
            {isOutgoingCall && <p className="text-base sm:text-lg md:text-xl text-white/70 animate-pulse">Calling...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoCallOverlay;
