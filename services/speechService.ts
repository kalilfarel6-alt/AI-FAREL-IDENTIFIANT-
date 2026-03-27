
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type VoiceAccent = 'universal' | 'african';

// Check if speech synthesis is supported in the current environment
const isSpeechSupported = typeof window !== 'undefined' && !!window.speechSynthesis;

// Audio Context Singleton to prevent browser limits
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isSpeaking = false;
let currentAccent: VoiceAccent = 'universal';

export const setVoiceAccent = (accent: VoiceAccent) => {
  currentAccent = accent;
};

export const getVoiceAccent = (): VoiceAccent => {
  return currentAccent;
};

function getAudioContext() {
  if (!audioContext) {
    // Gemini TTS typically returns 24kHz audio
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
}

// Helper to decode base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert raw PCM data to AudioBuffer
function createAudioBufferFromPCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): AudioBuffer {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Convert int16 to float32 (-1.0 to 1.0)
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const stopSpeech = () => {
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore errors if already stopped
    }
    currentSource = null;
  }
  // Also cancel standard browser synthesis if available
  if (isSpeechSupported) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
};

/**
 * Returns true if speech started, false if blocked (already speaking)
 */
export const speakResult = async (text: string, onEnded?: () => void): Promise<boolean> => {
  if (isSpeaking) {
    console.log("Speech blocked: already speaking");
    return false;
  }

  stopSpeech(); // Ensure previous audio is stopped (double check)
  isSpeaking = true;

  // STRATEGY: 
  // If "African" accent is requested, we first check if the browser has a native African French voice (fr-SN, fr-CI, etc).
  if (currentAccent === 'african' && isSpeechSupported) {
      const voices = window.speechSynthesis.getVoices();
      const hasNativeAfricanVoice = voices.some(v => 
        v.lang === 'fr-SN' || v.lang === 'fr-CI' || v.lang === 'fr-CM' || v.lang === 'fr-ML' || v.lang === 'fr-TG'
      );
      
      if (hasNativeAfricanVoice) {
          fallbackSpeak(text, onEnded);
          return true;
      }
  }

  try {
    // 1. Try High-Quality Gemini TTS
    const voiceName = currentAccent === 'african' ? 'Charon' : 'Fenrir'; 
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBytes = decode(base64Audio);
      const audioBuffer = createAudioBufferFromPCM(audioBytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      currentSource = source;

      source.onended = () => {
        currentSource = null;
        isSpeaking = false;
        if (onEnded) onEnded();
      };
      return true;
    }
  } catch (error) {
    console.warn("Gemini TTS failed or network issue, falling back to browser TTS", error);
  }

  // 2. Fallback to Browser Speech Synthesis
  if (isSpeechSupported) {
    fallbackSpeak(text, onEnded);
    return true;
  } else {
    isSpeaking = false;
    if (onEnded) onEnded();
    return false;
  }
};

const fallbackSpeak = (text: string, onEnded?: () => void) => {
  if (!isSpeechSupported) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  
  if (currentAccent === 'african') {
      utterance.pitch = 0.9; 
      utterance.rate = 0.95; 
  } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
  }

  const voices = window.speechSynthesis.getVoices();
  let selectedVoice: SpeechSynthesisVoice | undefined;

  if (currentAccent === 'african') {
      selectedVoice = voices.find(v => 
          ['fr-SN', 'fr-CI', 'fr-CM', 'fr-ML', 'fr-TG', 'fr-NE'].includes(v.lang)
      );
  }

  if (!selectedVoice) {
      const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
      selectedVoice = frenchVoices.find(v => 
        v.name.toLowerCase().includes('thomas') || 
        v.name.toLowerCase().includes('nicolas') || 
        v.name.toLowerCase().includes('google français') 
      );

      if (!selectedVoice && frenchVoices.length > 0) {
        selectedVoice = frenchVoices[0];
      }
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  }

  utterance.onend = () => {
    isSpeaking = false;
    if (onEnded) onEnded();
  };

  utterance.onerror = () => {
      isSpeaking = false;
      if (onEnded) onEnded();
  }

  window.speechSynthesis.speak(utterance);
};

export const getAvailableVoices = () => {
  if (!isSpeechSupported) return [];
  return window.speechSynthesis.getVoices();
};
