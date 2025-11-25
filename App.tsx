
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { RootState, AppDispatch } from './store';
import { setStatus, addMessage, clearMessages, updateOnlineCount } from './store';
import { AppStatus, UserSettings } from './types';
import { GlassCard } from './components/GlassCard';
import { Button } from './components/Button';
import { ChatInterface } from './components/ChatInterface';
import { io, Socket } from 'socket.io-client';

// --- WebRTC Configuration ---
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

// --- Signaling Service (Real WebRTC) ---
class WebRTCService {
  private socket: Socket;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  
  private onMessage: (text: string) => void;
  private onRemoteStream: (stream: MediaStream) => void;
  private onDisconnect: () => void;
  private onConnect: () => void;
  private onError: (msg: string) => void;

  constructor(
    localStream: MediaStream,
    onMessage: (text: string) => void,
    onRemoteStream: (stream: MediaStream) => void,
    onDisconnect: () => void,
    onConnect: () => void,
    onError: (msg: string) => void
  ) {
    this.localStream = localStream;
    this.onMessage = onMessage;
    this.onRemoteStream = onRemoteStream;
    this.onDisconnect = onDisconnect;
    this.onConnect = onConnect;
    this.onError = onError;

    // Connect to Backend
    // CRITICAL: In Netlify, set VITE_BACKEND_URL env var to your Render URL
    // We use optional chaining ?. to prevent crash if import.meta.env is undefined
    const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001';
    
    console.log(`%c[Signaling] Connecting to: ${BACKEND_URL}`, 'color: #3b82f6; font-weight: bold;');
    
    this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        reconnectionAttempts: 5
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log("%c[Signaling] Connected", 'color: #22c55e; font-weight: bold;');
    });

    this.socket.on('connect_error', (err) => {
        console.error("Connection Error:", err);
        this.onError(`Connection failed: ${err.message}. Check console.`);
    });

    // 1. Match Found -> Start WebRTC Negotiation
    this.socket.on('match-found', async ({ initiator }: { initiator: boolean }) => {
      console.log("Match found! Am I initiator?", initiator);
      this.createPeerConnection();

      if (initiator) {
        try {
            const offer = await this.peerConnection!.createOffer();
            await this.peerConnection!.setLocalDescription(offer);
            this.socket.emit('signal', { type: 'offer', payload: offer });
        } catch (e) {
            console.error("Error creating offer:", e);
        }
      }
    });

    // 2. Handle Signaling Data (Offer/Answer/ICE)
    this.socket.on('signal', async (data: { type: string, payload: any }) => {
      if (!this.peerConnection) this.createPeerConnection();
      const pc = this.peerConnection!;

      try {
          if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.socket.emit('signal', { type: 'answer', payload: answer });
          } 
          else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
          } 
          else if (data.type === 'ice-candidate') {
            if (data.payload) {
              await pc.addIceCandidate(new RTCIceCandidate(data.payload));
            }
          }
      } catch (e) {
          console.error("Signaling error:", e);
      }
    });

    this.socket.on('chat-message', (text: string) => {
      this.onMessage(text);
    });

    this.socket.on('peer-disconnected', () => {
      this.handleCleanup();
      this.onDisconnect();
    });
  }

  private createPeerConnection() {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log("Received Remote Stream");
        this.onRemoteStream(event.streams[0]);
        // Signal the UI that we are fully connected
        this.onConnect();
      }
    };

    // Handle ICE Candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal', { type: 'ice-candidate', payload: event.candidate });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'disconnected' || this.peerConnection?.connectionState === 'failed') {
        this.handleCleanup();
        this.onDisconnect();
      }
    };
  }

  public joinQueue(settings: UserSettings) {
    this.socket.emit('join-queue', settings);
  }

  public sendMessage(text: string) {
    this.socket.emit('chat-message', text);
  }

  public destroy() {
    this.socket.emit('leave');
    this.handleCleanup();
    this.socket.disconnect();
  }

  private handleCleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { status, onlineCount } = useSelector((state: RootState) => state.chat);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const rtcServiceRef = useRef<WebRTCService | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<{id: number, char: string, left: number}[]>([]);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check for Prod config errors
  useEffect(() => {
    // Safe access
    const backendUrl = import.meta.env?.VITE_BACKEND_URL;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost && !backendUrl) {
        setConnectionError("CONFIG ERROR: VITE_BACKEND_URL missing. App is connecting to localhost in production.");
    }
  }, []);

  // Form handling
  const { control, handleSubmit } = useForm<UserSettings>({
    defaultValues: { myGender: 'male', preference: 'anyone' }
  });

  // Online count simulation
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(updateOnlineCount());
    }, 3000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Start Camera on Load
  useEffect(() => {
    const startCamera = async () => {
      try {
        if (stream) return;
        const userStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720, facingMode: "user" },
            audio: true 
        });
        setStream(userStream);
      } catch (e) {
        console.error("Camera access denied", e);
        alert("Camera/Microphone permissions are required for Chill-Zone.");
      }
    };
    startCamera();
  }, []); 

  // --- VIDEO STREAM ATTACHMENT LOGIC ---
  
  // Attach LOCAL stream whenever video element is available (e.g. status changes to CONNECTED)
  useEffect(() => {
    if (localVideoRef.current && stream) {
        console.log("Attaching local stream to video element");
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
    }
  }, [stream, status]);

  // Attach REMOTE stream whenever available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
        console.log("Attaching remote stream to video element");
        remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);


  // Handle connection
  const connectToStranger = useCallback((currentSettings: UserSettings) => {
    if (!stream) {
      alert("Waiting for camera...");
      return;
    }

    setConnectionError(null);
    setRemoteStream(null); // Clear previous remote stream
    dispatch(setStatus(AppStatus.SEARCHING));
    
    // Cleanup old service
    if (rtcServiceRef.current) rtcServiceRef.current.destroy();

    const service = new WebRTCService(
        stream,
        // On Message
        (text) => {
            dispatch(addMessage({ 
                id: Date.now().toString(), 
                sender: 'stranger', 
                text, 
                timestamp: Date.now() 
            }));
        },
        // On Remote Stream
        (newRemoteStream) => {
            // Update state so React can attach it in useEffect
            setRemoteStream(newRemoteStream);
        },
        // On Disconnect
        () => {
             dispatch(setStatus(AppStatus.IDLE));
             setRemoteStream(null);
        },
        // On Connect (Video Established)
        () => {
             dispatch(setStatus(AppStatus.CONNECTED));
             dispatch(clearMessages());
        },
        // On Socket Error
        (errorMsg) => {
            setConnectionError(errorMsg);
            dispatch(setStatus(AppStatus.IDLE));
        }
    );
    
    rtcServiceRef.current = service;
    service.joinQueue(currentSettings);

  }, [dispatch, stream]);

  const disconnect = useCallback(() => {
     if (rtcServiceRef.current) {
         rtcServiceRef.current.destroy();
     }
     dispatch(setStatus(AppStatus.IDLE));
     setRemoteStream(null);
  }, [dispatch]);

  const handleSendMessage = (text: string) => {
    if (rtcServiceRef.current) {
        rtcServiceRef.current.sendMessage(text);
        dispatch(addMessage({ id: Date.now().toString(), sender: 'me', text, timestamp: Date.now() }));
    }
  };

  const handleNext = useCallback(async () => {
      disconnect();
      setTimeout(() => {
          if (settings) {
              connectToStranger(settings);
          }
      }, 500); // Small delay to ensure socket cleanup
  }, [disconnect, connectToStranger, settings]);

  const onStart = (data: UserSettings) => {
    setSettings(data);
    connectToStranger(data);
  };
  
  const showEmoji = (char: string) => {
    const id = Date.now();
    setFloatingEmojis(prev => [...prev, { id, char, left: Math.random() * 80 + 10 }]);
    setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 2000);
  };

  return (
    <div className="h-[100dvh] w-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Header */}
      {status !== AppStatus.CONNECTED && (
        <header className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center">
          <div className="flex items-baseline gap-1 select-none cursor-default group">
            <span className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] transition-all group-hover:tracking-normal">
              CHILL
            </span>
            <span className="text-2xl md:text-3xl font-light italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:text-cyan-300 transition-all">
              ZONE
            </span>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-1 shadow-[0_0_10px_#3b82f6]"></div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-white/60 tabular-nums">
                {onlineCount.toLocaleString()} online
              </span>
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
              Live Signaling
            </div>
          </div>
        </header>
      )}

      {/* CONFIG ERROR BANNER */}
      {connectionError && (
        <div className="absolute top-20 left-4 right-4 z-50 p-4 bg-red-500/90 backdrop-blur-md rounded-xl border border-red-400 text-white shadow-2xl animate-bounce">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-bold">Connection Error</h3>
              <p className="text-sm opacity-90">{connectionError}</p>
              {connectionError.includes("VITE_BACKEND_URL") && (
                <p className="text-xs mt-1 bg-black/20 p-2 rounded">
                  Fix: Go to Netlify Settings &gt; Env Variables &gt; Add{" "}
                  <code>VITE_BACKEND_URL</code> with your Render URL.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 w-full h-full flex flex-col">
        {/* IDLE SCREEN */}
        {status === AppStatus.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/30 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/30 rounded-full blur-[120px]"></div>
            </div>

            <GlassCard className="p-8 w-full max-w-sm space-y-6 bg-black/40 border-white/10 shadow-2xl backdrop-blur-xl relative z-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Start Chatting
                </h2>
                <p className="text-white/40 text-sm">
                  <span className="block mb-2">
                    Connect with real strangers.
                  </span>
                </p>
              </div>

              <form onSubmit={handleSubmit(onStart)} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider ml-1">
                    I am
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["male", "female"].map((g) => (
                      <label key={g} className="cursor-pointer group">
                        <input
                          type="radio"
                          value={g}
                          {...control.register("myGender")}
                          className="peer sr-only"
                        />
                        <div className="py-3 text-center rounded-xl border border-white/10 bg-white/5 peer-checked:bg-blue-600 peer-checked:border-transparent peer-checked:text-white text-white/60 transition-all group-hover:bg-white/10 capitalize">
                          {g}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider ml-1">
                    Looking for
                  </label>
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    {["anyone", "male", "female"].map((pref) => (
                      <label key={pref} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          value={pref}
                          {...control.register("preference")}
                          className="peer sr-only"
                        />
                        <div className="py-2 rounded-lg text-sm text-center text-white/40 peer-checked:bg-white/10 peer-checked:text-white peer-checked:shadow-sm transition-all capitalize">
                          {pref}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-500 border-none shadow-blue-900/50 shadow-lg"
                >
                  Start Video Chat
                </Button>
              </form>
            </GlassCard>
          </div>
        )}

        {/* SEARCHING SCREEN */}
        {status === AppStatus.SEARCHING && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-50">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-64 h-64 border border-blue-500/30 rounded-full animate-[ping_3s_linear_infinite]"></div>
              <div className="absolute w-48 h-48 border border-blue-500/50 rounded-full animate-[ping_3s_linear_infinite_1s]"></div>
              <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full animate-pulse backdrop-blur-md"></div>

              <div className="z-10 text-center space-y-4">
                <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto"></div>
                <h2 className="text-xl font-medium text-white/80">
                  Connecting...
                </h2>
                <p className="text-xs text-white/40">
                  Waiting for someone to join the queue...
                </p>
              </div>
            </div>
            <div className="mt-12">
              <Button
                variant="ghost"
                onClick={disconnect}
                className="text-white/50 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* CONNECTED VIDEO SCREEN */}
        {status === AppStatus.CONNECTED && (
          <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-black relative">
            {/* REMOTE VIDEO */}
            <div className="relative flex-1 bg-[#1a1a1a] flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
              <div className="w-full h-full relative flex items-center justify-center">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover transform"
                />
                {/* Fallback/Loading state overlay could go here */}
              </div>

              {/* Floating Emojis */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                {floatingEmojis.map((e) => (
                  <div
                    key={e.id}
                    className="absolute bottom-0 text-5xl animate-[float_3s_ease-out_forwards] opacity-0"
                    style={{ left: `${e.left}%` }}
                  >
                    {e.char}
                  </div>
                ))}
              </div>
            </div>

            {/* LOCAL VIDEO */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted // Muted locally so you don't hear yourself
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />

              <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-50">
                <button
                  onClick={() => showEmoji("❤️")}
                  className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 hover:scale-110 transition-all"
                >
                  ❤️
                </button>
                <button
                  onClick={disconnect}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-lg hover:scale-105 transition-all"
                >
                  STOP
                </button>
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full shadow-lg hover:scale-105 transition-all"
                >
                  NEXT
                </button>
                <button
                  onClick={() => showEmoji("😂")}
                  className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 hover:scale-110 transition-all"
                >
                  😂
                </button>
              </div>

              <button
                className="md:hidden absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 z-40"
                onClick={() => setShowChatMobile(!showChatMobile)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
              </button>
            </div>

            {/* Chat Interface */}
            <div
              className={`
                    absolute md:relative z-30
                    ${
                      showChatMobile
                        ? "inset-0 bg-black/80"
                        : "pointer-events-none inset-x-0 bottom-[100px] h-[30%]"
                    }
                    md:inset-auto md:w-[350px] md:h-full md:bg-[#111] md:border-l md:border-white/10 md:pointer-events-auto
                    flex flex-col transition-all duration-300
                `}
            >
              <ChatInterface
                onSendMessage={handleSendMessage}
                mobileMode={true}
              />
              {showChatMobile && (
                <button
                  onClick={() => setShowChatMobile(false)}
                  className="md:hidden absolute top-4 right-4 text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      {/* Footer */}
      <footer className="w-full py-3 text-center text-white/30 text-xs bg-black/40 backdrop-blur-md border-t border-white/10">
        © 2025{" "}
        <span className="text-white/50 font-semibold">ChillMaCoding</span> —
        just chilling 😎
      </footer>
    </div>
  );
}
