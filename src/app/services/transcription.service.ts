import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TranscriptionService {
  private recognition: any;
  private isListening = false;
  private transcriptionSubject = new BehaviorSubject<TranscriptionResult[]>([]);
  private isTranscribingSubject = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isTranscribingSubject.next(true);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          this.addTranscriptionResult(transcript, true, confidence);
        } else {
          interimTranscript += transcript;
          this.addTranscriptionResult(transcript, false, confidence);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isTranscribingSubject.next(false);

      if (event.error === 'not-allowed') {
        console.error('Microphone permission denied');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected, restarting...');
        setTimeout(() => {
          if (this.isListening) {
            this.recognition.start();
          }
        }, 1000);
      } else if (event.error === 'audio-capture') {
        console.error('Audio capture error - microphone may be in use');
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isTranscribingSubject.next(false);
      if (this.isListening) {
        this.startTranscription();
      }
    };
  }

  startTranscription(): void {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.clearTranscription();

      try {
        this.recognition.start();
        console.log('Starting speech recognition...');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        this.isListening = false;
        this.isTranscribingSubject.next(false);
      }
    }
  }

  stopTranscription(): void {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
    }
  }

  private addTranscriptionResult(text: string, isFinal: boolean, confidence?: number): void {
    const currentResults = this.transcriptionSubject.value;
    const newResult: TranscriptionResult = {
      text,
      isFinal,
      confidence,
      timestamp: Date.now()
    };

    if (isFinal) {
      const lastIndex = currentResults.length - 1;
      if (lastIndex >= 0 && !currentResults[lastIndex].isFinal) {
        currentResults[lastIndex] = newResult;
      } else {
        currentResults.push(newResult);
      }
    } else {
      const lastIndex = currentResults.length - 1;
      if (lastIndex >= 0 && !currentResults[lastIndex].isFinal) {
        currentResults[lastIndex] = newResult;
      } else {
        currentResults.push(newResult);
      }
    }

    this.transcriptionSubject.next([...currentResults]);
  }

  clearTranscription(): void {
    this.transcriptionSubject.next([]);
  }

  getTranscriptionResults(): Observable<TranscriptionResult[]> {
    return this.transcriptionSubject.asObservable();
  }

  getTranscriptionState(): Observable<boolean> {
    return this.isTranscribingSubject.asObservable();
  }

  isTranscribing(): boolean {
    return this.isListening;
  }

  handleServerTranscription(text: string, isFinal: boolean = true): void {
    this.addTranscriptionResult(text, isFinal);
  }
}
