import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { playOutgoingCallSound, playIncomingCallSound, stopCallSound, playEndCallSound } from '../lib/sounds';
import { useActiveCallStore } from './useActiveCall';

interface UseWebRTCProps {
  friendId: string;
  conversationId: string;
  friendName?: string;
}

export function useWebRTC({ friendId, conversationId, friendName }: UseWebRTCProps) {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isOutgoingCall, setIsOutgoingCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);

  const { setActiveCall, clearActiveCall } = useActiveCallStore();

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const pendingOfferRef = useRef<{ offer: RTCSessionDescriptionInit; from: string } | null>(null);
  const currentFriendIdRef = useRef<string>(friendId);
  const isCleaningUpRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => { currentFriendIdRef.current = friendId; }, [friendId]);

  useEffect(() => {
    if (isCallActive && friendId && friendName) {
      setActiveCall({
        friendId, friendName, conversationId, callType, callStartTime,
        isCallActive: true, timestamp: Date.now(),
      });
    } else if (!isCallActive) {
      clearActiveCall();
    }
  }, [isCallActive, friendId, conversationId, callType, callStartTime, friendName, setActiveCall, clearActiveCall]);

  const getUserMedia = useCallback(async (type: 'audio' | 'video') => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera/microphone not available');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: type === 'video' ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        } : false,
      });
      
      console.log('[WebRTC] Got media stream:', stream.id);
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('[WebRTC] Media error:', error);
      alert('Cannot access camera/microphone');
      throw error;
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !isCallActive) {
      console.warn('[WebRTC] Cannot share screen - no active call');
      return;
    }
    
    if (remoteScreenSharing) {
      alert('The other person is already sharing their screen. Only one person can share at a time.');
      return;
    }
    
    try {
      console.log('[WebRTC] Starting screen share');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      
      const videoTrack = screenStream.getVideoTracks()[0];
      
      if (localStreamRef.current) {
        originalVideoTrackRef.current = localStreamRef.current.getVideoTracks()[0];
      }
      
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }
      
      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      
      socket?.emit('screen_share_started', { to: currentFriendIdRef.current, conversationId });
      
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      console.log('[WebRTC] Screen sharing started');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        console.log('[WebRTC] Screen share cancelled by user');
      } else {
        console.error('[WebRTC] Screen share error:', error);
      }
    }
  }, [isCallActive, remoteScreenSharing, socket, conversationId]);

  const stopScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !screenStreamRef.current) return;
    
    try {
      console.log('[WebRTC] Stopping screen share');
      
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      
      if (originalVideoTrackRef.current && peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(originalVideoTrackRef.current);
        }
        
        if (localStreamRef.current) {
          const screenTrack = localStreamRef.current.getVideoTracks()[0];
          localStreamRef.current.removeTrack(screenTrack);
          localStreamRef.current.addTrack(originalVideoTrackRef.current);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        
        originalVideoTrackRef.current = null;
      }
      
      setIsScreenSharing(false);
      
      socket?.emit('screen_share_stopped', { to: currentFriendIdRef.current, conversationId });
      
      console.log('[WebRTC] Screen sharing stopped');
    } catch (error) {
      console.error('[WebRTC] Stop screen share error:', error);
    }
  }, [socket, conversationId]);

  const endCall = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    console.log('[WebRTC] Ending call');
    
    stopCallSound();
    playEndCallSound();
    
    if (reconnectionTimeoutRef.current) clearTimeout(reconnectionTimeoutRef.current);
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop());
      remoteStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (socket && currentFriendIdRef.current) {
      socket.emit('webrtc_end_call', { 
        to: currentFriendIdRef.current, 
        conversationId,
        callDuration: callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0
      });
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
    setIsIncomingCall(false);
    setIsOutgoingCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallStartTime(null);
    setConnectionState('connected');
    setCallerId(null);
    setIsScreenSharing(false);
    setRemoteScreenSharing(false);
    
    callStartTimeRef.current = null;
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    originalVideoTrackRef.current = null;
    
    clearActiveCall();
    
    setTimeout(() => { isCleaningUpRef.current = false; }, 500);
  }, [conversationId, socket, clearActiveCall]);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch (e) {}
      peerConnectionRef.current = null;
    }
    
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:a.relay.metered.ca:443',
          username: '85d6ac0b4c92f0fe027d573b',
          credential: 'Y2MwVg4tNpNSEBlK',
        },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setConnectionState('connected');
        stopCallSound();
      } else if (pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track:', event.track.kind);
      if (event.streams[0]) {
        console.log('[WebRTC] Setting remote stream');
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          to: callerId || currentFriendIdRef.current,
          candidate: event.candidate.toJSON(),
          conversationId,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, callerId, conversationId, endCall]);

  const startCall = useCallback(async (type: 'audio' | 'video') => {
    if (isOutgoingCall || isCallActive || isIncomingCall) return;
    
    try {
      console.log('[WebRTC] Starting call');
      setCallType(type);
      setIsOutgoingCall(true);
      playOutgoingCallSound();
      
      const stream = await getUserMedia(type);
      const pc = createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('[WebRTC] Added track:', track.kind);
      });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket?.emit('webrtc_offer', { offer, to: friendId, conversationId, callType: type });
      setIsCallActive(true);
    } catch (error) {
      console.error('[WebRTC] Start error:', error);
      stopCallSound();
      setIsOutgoingCall(false);
      endCall();
    }
  }, [friendId, conversationId, socket, getUserMedia, createPeerConnection, endCall, isOutgoingCall, isCallActive, isIncomingCall]);

  const answerCall = useCallback(async () => {
    try {
      console.log('[WebRTC] Answering');
      stopCallSound();
      
      if (!pendingOfferRef.current) return;
      
      const { offer, from } = pendingOfferRef.current;
      pendingOfferRef.current = null;
      
      const stream = await getUserMedia(callType);
      const pc = createPeerConnection();
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('[WebRTC] Added track:', track.kind);
      });
      
      await pc.setRemoteDescription(offer);
      
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket?.emit('webrtc_answer', { answer, to: from, conversationId });
      socket?.emit('webrtc_answer_call', { to: from, conversationId });
      
      setIsIncomingCall(false);
      setIsCallActive(true);
    } catch (error) {
      console.error('[WebRTC] Answer error:', error);
      stopCallSound();
      endCall();
    }
  }, [callType, conversationId, socket, getUserMedia, createPeerConnection, endCall]);

  const rejectCall = useCallback(() => {
    stopCallSound();
    socket?.emit('webrtc_reject_call', { to: callerId, conversationId });
    setIsIncomingCall(false);
    setCallerId(null);
    pendingOfferRef.current = null;
  }, [callerId, conversationId, socket]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { 
        track.enabled = !track.enabled; 
        setIsMuted(!track.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) { 
        track.enabled = !track.enabled; 
        setIsVideoOff(!track.enabled);
      }
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleIncoming = (data: { from: string; callType: 'audio' | 'video' }) => {
      console.log('[WebRTC] Incoming call');
      playIncomingCallSound();
      setIsIncomingCall(true);
      setCallerId(data.from);
      setCallType(data.callType);
    };

    const handleConnected = (data: { with: string; callStartTime: number }) => {
      console.log('[WebRTC] Connected');
      setCallStartTime(data.callStartTime);
      callStartTimeRef.current = data.callStartTime;
      setIsOutgoingCall(false);
      stopCallSound();
    };

    const handleOffer = (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('[WebRTC] Offer received');
      pendingOfferRef.current = data;
    };

    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
      console.log('[WebRTC] Answer received');
      if (peerConnectionRef.current?.signalingState === 'have-local-offer') {
        await peerConnectionRef.current.setRemoteDescription(data.answer);
        
        for (const candidate of pendingCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      }
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current?.remoteDescription) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('[WebRTC] ICE error:', e);
        }
      } else {
        pendingCandidatesRef.current.push(new RTCIceCandidate(data.candidate));
      }
    };

    const handleScreenShareStarted = () => {
      console.log('[WebRTC] Remote started screen sharing');
      setRemoteScreenSharing(true);
    };

    const handleScreenShareStopped = () => {
      console.log('[WebRTC] Remote stopped screen sharing');
      setRemoteScreenSharing(false);
    };

    socket.on('webrtc_incoming_call', handleIncoming);
    socket.on('call:connected', handleConnected);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('webrtc_call_rejected', endCall);
    socket.on('webrtc_call_ended', endCall);
    socket.on('screen_share_started', handleScreenShareStarted);
    socket.on('screen_share_stopped', handleScreenShareStopped);

    return () => {
      socket.off('webrtc_incoming_call', handleIncoming);
      socket.off('call:connected', handleConnected);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('webrtc_call_rejected', endCall);
      socket.off('webrtc_call_ended', endCall);
      socket.off('screen_share_started', handleScreenShareStarted);
      socket.off('screen_share_stopped', handleScreenShareStopped);
    };
  }, [socket, conversationId, endCall]);

  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    isCallActive,
    isIncomingCall,
    isOutgoingCall,
    callType,
    isMuted,
    isVideoOff,
    callStartTime,
    connectionState,
    isScreenSharing,
    remoteScreenSharing,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}

export default useWebRTC;
