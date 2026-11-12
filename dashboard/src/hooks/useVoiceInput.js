import { useState, useRef, useEffect, useCallback } from 'react';

// Word-to-digit conversion dictionary for English and Telugu phonetic/script words
const WORD_TO_DIGIT = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  okati: '1', rendu: '2', moodu: '3', naalugu: '4', aidu: '5',
  aaru: '6', yedu: '7', edu: '7', enimidi: '8', tommidi: '9', padi: '10',
  'సున్నా': '0', 'ఒకటి': '1', 'రెండు': '2', 'మూడు': '3', 'నాలుగు': '4',
  'ఐదు': '5', 'ఆరు': '6', 'ఏడు': '7', 'ఎనిమిది': '8', 'తొమ్మిది': '9', 'పది': '10'
};

/**
 * Parses spoken numbers into standard digit strings.
 * E.g., "nine eight four eight zero" -> "98480"
 * E.g., "double eight five one" -> "8851"
 */
export const parseSpokenDigits = (input) => {
  if (!input) return '';
  const tokens = input.toLowerCase().replace(/[-_.,]/g, ' ').split(/\s+/).filter(Boolean);
  let result = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === 'double' && i + 1 < tokens.length) {
      const nextWord = tokens[++i];
      const digit = WORD_TO_DIGIT[nextWord] || nextWord.replace(/\D/g, '');
      result += digit + digit;
    } else if (token === 'triple' && i + 1 < tokens.length) {
      const nextWord = tokens[++i];
      const digit = WORD_TO_DIGIT[nextWord] || nextWord.replace(/\D/g, '');
      result += digit + digit + digit;
    } else if (WORD_TO_DIGIT[token]) {
      result += WORD_TO_DIGIT[token];
    } else {
      result += token.replace(/\D/g, '');
    }
  }

  return result;
};

/**
 * Custom hook for browser Web Speech Recognition
 */
export const useVoiceInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-IN'); // 'en-IN' or 'te-IN'
  const [errorMessage, setErrorMessage] = useState(null);

  const recognitionRef = useRef(null);
  const callbackRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && 
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setActiveField(null);
  }, []);

  const startListening = useCallback((fieldKey, onResultCallback, customLang = null) => {
    if (!isSupported) {
      setErrorMessage("Voice speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    // Stop existing instance if any
    stopListening();
    setErrorMessage(null);
    setTranscript('');
    setActiveField(fieldKey);
    callbackRef.current = onResultCallback;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    const selectedLang = customLang || voiceLang;
    recognition.lang = selectedLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalized = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalized += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const currentText = finalized || interim;
      setTranscript(currentText);

      if (finalized && callbackRef.current) {
        callbackRef.current(finalized.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage("Microphone access was denied. Please allow microphone permissions in your browser.");
      } else if (event.error === 'no-speech') {
        setErrorMessage("No speech detected. Please speak closer to your microphone.");
      } else if (event.error !== 'aborted') {
        setErrorMessage(`Voice recognition notice: ${event.error}`);
      }
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      setActiveField(null);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setErrorMessage("Could not start microphone. Please check browser settings.");
      setIsListening(false);
      setActiveField(null);
    }
  }, [isSupported, voiceLang, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isSupported,
    isListening,
    activeField,
    transcript,
    voiceLang,
    setVoiceLang,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening
  };
};
