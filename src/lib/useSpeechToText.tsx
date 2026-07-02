/**
 * useSpeechToText — Hook para ditado por microfone
 * 
 * Usa a Web Speech API (SpeechRecognition) para ouvir e transcrever
 * automaticamente o que o usuário fala.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechToTextOptions {
  onTranscript?: (text: string) => void;
  lang?: string;
  continuous?: boolean;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const { onTranscript, lang = 'pt-BR', continuous = true } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    // Verifica suporte
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        transcriptRef.current += finalTranscript + ' ';
        onTranscript?.(transcriptRef.current);
      } else if (interimTranscript) {
        onTranscript?.(transcriptRef.current + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [lang, continuous, onTranscript]);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    transcriptRef.current = '';
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // Já está rodando
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) {
      // Já parou
    }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    isSupported,
    start,
    stop,
    toggle,
  };
}

/**
 * MicrophoneButton — Botão de microfone para usar com inputs
 */
export function MicrophoneButton({ 
  onTranscript, 
  className = '' 
}: { 
  onTranscript?: (text: string) => void;
  className?: string;
}) {
  const { isListening, isSupported, toggle } = useSpeechToText({ onTranscript });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      title={isListening ? 'Parar de ditar' : 'Iniciar ditado'}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${isListening ? 'text-red-500 animate-pulse' : 'text-ink-400'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  );
}
