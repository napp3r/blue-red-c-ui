import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  chunkIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStateSubject = new Subject<boolean>();
  private audioDataSubject = new Subject<Blob>();
  private audioChunkSubject = new Subject<AudioChunk>();
  private chunkIndex = 0;
  private readonly CHUNK_SIZE = 4 * 1024; // 4KB

  constructor() {
    this.checkSupportedFormats();
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.audioChunks = [];
      this.chunkIndex = 0;

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);

          const arrayBuffer = await event.data.arrayBuffer();
          await this.sendAudioInChunks(arrayBuffer);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.audioDataSubject.next(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start(100);
      this.recordingStateSubject.next(true);
      console.log('MediaRecorder started successfully with format:', this.mediaRecorder.mimeType);
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow microphone access.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is already in use by another application.');
        }
      }
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.recordingStateSubject.next(false);
    }
  }

  getRecordingState(): Observable<boolean> {
    return this.recordingStateSubject.asObservable();
  }

  getAudioData(): Observable<Blob> {
    return this.audioDataSubject.asObservable();
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  private async sendAudioInChunks(arrayBuffer: ArrayBuffer): Promise<void> {
    const uint8Array = new Uint8Array(arrayBuffer);
    const totalLength = uint8Array.length;

    for (let offset = 0; offset < totalLength; offset += this.CHUNK_SIZE) {
      const chunk = uint8Array.slice(offset, offset + this.CHUNK_SIZE);
      const audioChunk: AudioChunk = {
        data: chunk.buffer,
        timestamp: Date.now(),
        chunkIndex: this.chunkIndex++
      };

      this.audioChunkSubject.next(audioChunk);

      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  getAudioChunks(): Observable<AudioChunk> {
    return this.audioChunkSubject.asObservable();
  }

  checkSupportedFormats(): void {
    console.log('Checking supported audio formats:');
    console.log('audio/webm;codecs=opus:', MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));
    console.log('audio/webm:', MediaRecorder.isTypeSupported('audio/webm'));
    console.log('audio/mp4:', MediaRecorder.isTypeSupported('audio/mp4'));
    console.log('audio/ogg;codecs=opus:', MediaRecorder.isTypeSupported('audio/ogg;codecs=opus'));
  }
}
