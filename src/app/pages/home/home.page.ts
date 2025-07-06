import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceRecordingService, AudioChunk } from '../../services/voice-recording.service';
import { WebSocketService, WebSocketMessage } from '../../services/websocket.service';
import { TranscriptionService, TranscriptionResult } from '../../services/transcription.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage implements OnInit, OnDestroy {
  isRecording = false;
  isConnected = false;
  isTranscribing = false;
  recordingTime = 0;
  transcriptionResults: TranscriptionResult[] = [];
  private recordingInterval: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private voiceRecordingService: VoiceRecordingService,
    private webSocketService: WebSocketService,
    private transcriptionService: TranscriptionService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.voiceRecordingService.getRecordingState().subscribe(
        (recording) => {
          this.isRecording = recording;
          if (recording) {
            this.startRecordingTimer();
          } else {
            this.stopRecordingTimer();
          }
        }
      )
    );

    this.subscriptions.push(
      this.voiceRecordingService.getAudioChunks().subscribe(
        (audioChunk) => {
          this.sendAudioChunkToServer(audioChunk);
        }
      )
    );

    this.subscriptions.push(
      this.voiceRecordingService.getAudioData().subscribe(
        (audioBlob) => {
          console.log('Final audio blob received:', audioBlob.size, 'bytes');
        }
      )
    );

    this.subscriptions.push(
      this.transcriptionService.getTranscriptionResults().subscribe(
        (results) => {
          this.transcriptionResults = results;
        }
      )
    );

    this.subscriptions.push(
      this.transcriptionService.getTranscriptionState().subscribe(
        (transcribing) => {
          this.isTranscribing = transcribing;
        }
      )
    );

    this.connectToWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
    this.stopRecordingTimer();
  }

  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.voiceRecordingService.stopRecording();
      this.transcriptionService.stopTranscription();
    } else {
      try {
        await this.voiceRecordingService.startRecording();

        setTimeout(() => {
          this.transcriptionService.startTranscription();
        }, 500);

      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to start recording. Please check microphone permissions.');
      }
    }
  }

  private connectToWebSocket(): void {
    this.subscriptions.push(
      this.webSocketService.connect('ws://localhost:8000/ws/streaming').subscribe(
        (message: WebSocketMessage) => {
          console.log('Received message:', message);
          this.isConnected = true;

          if (message.type === 'transcription') {
            this.transcriptionService.handleServerTranscription(
              message.data.text,
              message.data.isFinal || true
            );
          }
        },
        (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
        }
      )
    );
  }

  private sendAudioToServer(audioBlob: Blob): void {
    if (this.webSocketService.isConnected()) {
      this.webSocketService.sendAudioData(audioBlob);
      console.log('Audio data sent to server');
    } else {
      console.error('WebSocket not connected');
      alert('Not connected to server. Please try again.');
    }
  }

  private sendAudioChunkToServer(audioChunk: AudioChunk): void {
    if (this.webSocketService.isConnected()) {
      this.webSocketService.sendAudioChunk(audioChunk.data);
      console.log(`Audio chunk ${audioChunk.chunkIndex} sent to server: ${audioChunk.data.byteLength} bytes`);
    } else {
      console.error('WebSocket not connected');
    }
  }

  private startRecordingTimer(): void {
    this.recordingTime = 0;
    this.recordingInterval = setInterval(() => {
      this.recordingTime++;
    }, 1000);
  }

  private stopRecordingTimer(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  clearTranscription(): void {
    this.transcriptionService.clearTranscription();
  }

  getLatestTranscription(): string {
    if (this.transcriptionResults.length === 0) return '';
    return this.transcriptionResults[this.transcriptionResults.length - 1].text;
  }

  isTranscriptionSupported(): boolean {
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  trackByTimestamp(index: number, item: TranscriptionResult): number {
    return item.timestamp;
  }
}
