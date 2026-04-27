/**
 * Voice Agent Service - Omnidimension Integration
 *
 * This module provides voice agent capabilities using Omnidimension's API.
 * Configure your API keys in environment variables.
 *
 * Omnidimension: https://www.omnidimension.ai/
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Omnidimension configuration
const OMNI_CONFIG = {
  apiKey: process.env.OMNIDIMENSION_API_KEY || "",
  agentId: process.env.OMNIDIMENSION_AGENT_ID || "",
  endpoint: "https://api.omnidimension.ai/v1"
};

export interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
}

export interface OmnidimensionConfig {
  apiKey: string;
  agentId: string;
  userId: string;
  sessionId: string;
  language?: string;
  voiceId?: string;
}

/**
 * Start a voice agent session with Omnidimension
 */
export async function startVoiceSession(userId: string, sessionId: string): Promise<string> {
  if (!OMNI_CONFIG.apiKey) {
    console.warn("Omnidimension API key not configured, using Web Speech API fallback");
    return "";
  }

  try {
    const response = await fetch(`${OMNI_CONFIG.endpoint}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        agent_id: OMNI_CONFIG.agentId,
        user_id: userId,
        session_id: sessionId,
        language: "en",
        voice: {
          voice_id: "default",
          speed: 1.0,
          pitch: 1.0
        }
      })
    });

    const data = await response.json();
    return data.session_token || "";
  } catch (error) {
    console.error("Failed to start voice session:", error);
    return "";
  }
}

/**
 * Send audio to Omnidimension and get transcription + response
 */
export async function processVoiceWithOmnidimension(
  audioBlob: Blob,
  sessionToken: string
): Promise<{ transcript: string; response: string; audioUrl?: string }> {
  if (!OMNI_CONFIG.apiKey || !sessionToken) {
    throw new Error("Omnidimension not configured");
  }

  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");
    formData.append("session_token", sessionToken);

    const response = await fetch(`${OMNI_CONFIG.endpoint}/process`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OMNI_CONFIG.apiKey}`
      },
      body: formData
    });

    const data = await response.json();
    return {
      transcript: data.transcript || "",
      response: data.response || "",
      audioUrl: data.audio_url
    };
  } catch (error) {
    console.error("Voice processing error:", error);
    throw error;
  }
}

/**
 * Send text and get voice response from Omnidimension
 */
export async function getVoiceResponse(
  text: string,
  sessionToken: string
): Promise<string> {
  if (!OMNI_CONFIG.apiKey || !sessionToken) {
    throw new Error("Omnidimension not configured");
  }

  try {
    const response = await fetch(`${OMNI_CONFIG.endpoint}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        text,
        session_token: sessionToken,
        voice: {
          voice_id: "default",
          speed: 1.0,
          pitch: 1.0
        }
      })
    });

    const data = await response.json();
    return data.audio_url || "";
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
}

/**
 * End voice session
 */
export async function endVoiceSession(sessionToken: string): Promise<void> {
  if (!OMNI_CONFIG.apiKey || !sessionToken) return;

  try {
    await fetch(`${OMNI_CONFIG.endpoint}/sessions/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OMNI_CONFIG.apiKey}`
      },
      body: JSON.stringify({ session_token: sessionToken })
    });
  } catch (error) {
    console.error("Failed to end voice session:", error);
  }
}

/**
 * Web Speech API fallback for local voice processing
 */
export class LocalVoiceAgent {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    // Use Web Speech API for speech-to-text
    return new Promise((resolve, reject) => {
      // @ts-ignore - webkitSpeechRecognition
      this.recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (err: any) => {
        reject(err);
      };

      // For actual usage, we'd need to convert blob to audio and play it
      // This is a simplified version
      this.recognition.start();
    });
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = (err) => reject(err);

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    this.synthesis.cancel();
  }
}

export const localVoiceAgent = new LocalVoiceAgent();
