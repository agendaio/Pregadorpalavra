/**
 * useSpeechRecognition — hook para transcrição de voz em tempo real.
 *
 * Usa a Web Speech API nativa (Chrome/Edge/Safari). Sem deps externas.
 *
 * Retorna:
 *   - isSupported: o browser suporta
 *   - isListening: tá gravando agora
 *   - transcript: texto transcrito em tempo real
 *   - interimTranscript: o que tá sendo processado (não-final)
 *   - start()/stop()/reset(): controles
 *   - error: mensagem de erro se falhou
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Tipos do Web Speech API (nem sempre vêm no TS padrão)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence: number };
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;          // só resultados finais
  interimTranscript: string;   // enquanto o usuário fala
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

export function useSpeechRecognition(lang = 'pt-BR'): UseSpeechRecognitionReturn {
  const Ctor = getSpeechRecognitionCtor();
  const isSupported = !!Ctor;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef('');

  useEffect(() => {
    return () => {
      recogRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setError('Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.');
      return;
    }
    setError(null);
    setInterimTranscript('');
    finalRef.current = transcript; // mantém o que já tinha (caso seja "append")
    const recog = new Ctor();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = lang;
    recog.maxAlternatives = 1;

    recog.onstart = () => setIsListening(true);

    recog.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          finalRef.current = (finalRef.current ? finalRef.current + ' ' : '') + r[0].transcript.trim();
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript(finalRef.current);
      setInterimTranscript(interim);
    };

    recog.onerror = (ev: SpeechRecognitionErrorEvent) => {
      const mensagens: Record<string, string> = {
        'no-speech': 'Nenhuma fala detectada. Tente novamente.',
        'audio-capture': 'Microfone não disponível. Verifique as permissões.',
        'not-allowed': 'Permissão de microfone negada.',
        'network': 'Erro de rede no reconhecimento de voz.',
        'aborted': 'Gravação interrompida.',
      };
      setError(mensagens[ev.error] ?? `Erro de voz: ${ev.error}`);
      setIsListening(false);
    };

    recog.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      setTranscript(finalRef.current);
    };

    try {
      recog.start();
      recogRef.current = recog;
    } catch (e) {
      setError((e as Error).message);
    }
  }, [Ctor, lang, transcript]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recogRef.current?.abort();
    setTranscript('');
    setInterimTranscript('');
    finalRef.current = '';
    setError(null);
    setIsListening(false);
  }, []);

  return { isSupported, isListening, transcript, interimTranscript, start, stop, reset, error };
}
