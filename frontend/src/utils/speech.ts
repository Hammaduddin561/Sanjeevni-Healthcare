// Web Speech API wrapper for Voice Input & Speech Synthesis

// Word to number mapping for Hindi and English common numbers
const HINDI_NUMBER_MAP: Record<string, number> = {
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16, 'सत्रह': 17, 'अट्ठारह': 18, 'उन्नीस': 19, 'बीस': 20,
  'तीस': 30, 'चालीस': 40, 'पैंतालीस': 45, 'पचास': 50, 'पचपन': 55, 'साठ': 60, 'पैंसठ': 65, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'सौ': 100
};

export const parseNumberFromSpeech = (text: string): number | null => {
  // Check for direct numeric digits (e.g. "45", "120")
  const match = text.match(/\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }

  // Check Hindi number mapping
  const words = text.trim().split(/\s+/);
  for (const w of words) {
    if (HINDI_NUMBER_MAP[w] !== undefined) {
      return HINDI_NUMBER_MAP[w];
    }
  }
  return null;
};

export class SpeechHandler {
  static isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  static startListening(
    lang: 'en' | 'hi',
    onResult: (transcript: string, parsedNumber: number | null) => void,
    onError?: (error: string) => void
  ): any {
    if (!this.isSpeechRecognitionSupported()) {
      onError?.('Web Speech API is not supported in this browser.');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const parsedNum = parseNumberFromSpeech(transcript);
      onResult(transcript, parsedNum);
    };

    recognition.onerror = (event: any) => {
      onError?.(event.error);
    };

    try {
      recognition.start();
      return recognition;
    } catch (e) {
      onError?.(String(e));
      return null;
    }
  }

  static speak(text: string, lang: 'en' | 'hi', onEnd?: () => void): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.9;

    // Pick matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const targetLang = lang === 'hi' ? 'hi' : 'en';
    const voice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang));
    if (voice) {
      utterance.voice = voice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  static stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
