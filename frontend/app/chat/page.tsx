"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatSession {
  id: number;
  topic_name: string | null;
  subject: string | null;
  messages_count: number;
  is_active: boolean;
}

interface VoiceState {
  isRecording: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  audioLevel: number;
}

export default function ChatTutor() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isRecording: false,
    isSpeaking: false,
    isProcessing: false,
    audioLevel: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    startSession();
    loadSessions();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSession = async () => {
    const token = localStorage.getItem("token")!;

    try {
      const res = await fetch(`${API_URL}/api/chat/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessionId(data.session_id);

      if (data.resumed) {
        loadChatHistory(data.session_id);
      } else {
        setMessages([{
          role: "assistant",
          content: "Hello! I'm your personal AI tutor. How can I help you today? You can ask me about any topic, or I can explain concepts using examples from your daily life. You can also type or use voice to talk to me!"
        }]);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  };

  const loadChatHistory = async (sid: number) => {
    const token = localStorage.getItem("token")!;

    try {
      const res = await fetch(`${API_URL}/api/chat/history/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data.messages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.timestamp
      })));
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const loadSessions = async () => {
    const token = localStorage.getItem("token")!;

    try {
      const res = await fetch(`${API_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    const token = localStorage.getItem("token")!;

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: userMessage,
          topic_id: topicId
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);

      if (data.message) {
        await speakText(data.message);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble responding. Can you try again?"
      }]);
    }

    setLoading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVoiceState(prev => ({ ...prev, isRecording: true }));

      const updateAudioLevel = () => {
        if (analyserRef.current && voiceState.isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVoiceState(prev => ({ ...prev, audioLevel: avg / 255 }));
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Please allow microphone access for voice input");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setVoiceState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));
  };

  const processAudio = async (audioBlob: Blob) => {
    setVoiceState(prev => ({ ...prev, isProcessing: true }));

    const token = localStorage.getItem("token")!;

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      const base64Data = await base64Promise;

      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);

        setMessages(prev => [...prev, { role: "user", content: transcript }]);
        setLoading(true);

        try {
          const res = await fetch(`${API_URL}/api/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              content: transcript,
              topic_id: topicId
            }),
          });

          const data = await res.json();
          setMessages(prev => [...prev, { role: "assistant", content: data.message }]);

          if (data.message) {
            await speakText(data.message);
          }
        } catch (err) {
          console.error("Chat error:", err);
        }

        setLoading(false);
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setVoiceState(prev => ({ ...prev, isProcessing: false }));
      };

      setVoiceState(prev => ({ ...prev, isProcessing: false }));

    } catch (err) {
      console.error("Audio processing error:", err);
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const speakText = async (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    };

    utterance.onend = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    };

    utterance.onerror = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setVoiceState(prev => ({ ...prev, isSpeaking: false }));
  };

  const endSession = async () => {
    const token = localStorage.getItem("token")!;

    try {
      await fetch(`${API_URL}/api/chat/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-red-900 bg-[#8b0000] shadow-[0_4px_20px_rgba(139,0,0,0.5)]">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-[#ebdcb9] hover:text-white transition-colors flex items-center gap-2">
            <span className="text-lg">◄</span> Back to Map
          </Link>
          <div className="text-xl font-serif tracking-[0.2em] uppercase drop-shadow-md text-white">
            AI Tutor
          </div>
          <button
            onClick={endSession}
            className="text-xs font-bold uppercase tracking-widest text-[#ebdcb9] hover:text-white transition-colors"
          >
            End Session
          </button>
        </nav>
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[#0d0d0d] border-2 border-red-900/50 p-6 mb-6 shadow-[0_0_30px_rgba(139,0,0,0.2)]">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-5 rounded-lg border-2 ${
                    msg.role === "user"
                      ? "bg-red-800/50 border-red-600 text-red-100"
                      : "bg-[#1a1a1a] border-red-900/50 text-neutral-200"
                  }`}
                >
                  <div className="text-[10px] font-black mb-2 opacity-70 uppercase tracking-wider">
                    {msg.role === "user" ? "You" : "AI Tutor"}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border-2 border-red-900/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Voice Indicator */}
        <div className="flex justify-center mb-4">
          <div
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all ${
              voiceState.isRecording
                ? "bg-red-700/50 border-red-500 animate-pulse"
                : voiceState.isSpeaking
                  ? "bg-blue-700/50 border-blue-500"
                  : voiceState.isProcessing
                    ? "bg-yellow-700/50 border-yellow-500"
                    : "bg-[#1a1a1a] border-red-900/50"
            }`}
          >
            <span className="text-xl">
              {voiceState.isRecording ? "🔴" : voiceState.isSpeaking ? "🔊" : "🎤"}
            </span>
            <span className="font-bold text-xs uppercase tracking-widest">
              {voiceState.isRecording
                ? "Recording..."
                : voiceState.isSpeaking
                  ? "Speaking..."
                  : voiceState.isProcessing
                    ? "Processing..."
                    : "Voice Ready"}
            </span>
            {voiceState.isRecording && (
              <div className="flex gap-1 ml-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full transition-all"
                    style={{
                      height: `${Math.min(20, voiceState.audioLevel * 40 + (i * 4))}px`,
                      animationDelay: `${i * 50}ms`
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#0d0d0d] border-2 border-red-900/50 p-5 shadow-[0_0_30px_rgba(139,0,0,0.15)]">
          <div className="flex gap-3">
            {/* Voice Button */}
            <button
              onClick={voiceState.isRecording ? stopRecording : startRecording}
              disabled={loading || voiceState.isProcessing}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl transition-all ${
                voiceState.isRecording
                  ? "bg-red-700 border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                  : "bg-[#1a1a1a] border-red-900/50 text-neutral-300 hover:bg-red-800 hover:border-red-600"
              } disabled:opacity-50`}
            >
              {voiceState.isRecording ? "⏹️" : "🎤"}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything or use voice..."
              className="flex-1 bg-[#1a1a1a] border-2 border-red-900/50 p-4 text-sm text-white focus:outline-none focus:border-red-600 placeholder:text-neutral-500 rounded-lg"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-red-700 border-2 border-red-600 text-white font-bold uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs shadow-[0_0_10px_rgba(220,38,38,0.3)] rounded-lg"
            >
              Send
            </button>

            {/* Stop Speaking */}
            {voiceState.isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-4 py-3 bg-blue-700/50 border-2 border-blue-500 text-white font-bold uppercase hover:bg-blue-600 transition-all text-xs rounded-lg"
              >
                ⏹️ Stop
              </button>
            )}
          </div>

          {/* Voice Controls Info */}
          <div className="mt-4 text-xs text-neutral-500 text-center">
            <span className="font-bold text-red-400">💡 Tip:</span> Click the microphone to use voice, or type your question. The AI will respond with voice!
          </div>
        </div>
      </div>
    </main>
  );
}