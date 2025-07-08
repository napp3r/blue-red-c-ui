import { Component, OnInit, OnDestroy, Injectable, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VoiceRecordingService, AudioChunk } from '../../services/voice-recording.service';
import { WebSocketService, WebSocketMessage } from '../../services/websocket.service';
import { TranscriptionService, TranscriptionResult } from '../../services/transcription.service';
import { StatusService, SessionStatus } from '../../services/status.service';
import { Subscription } from 'rxjs';

// Add a shared service for WebSocket control
@Injectable({ providedIn: 'root' })
export class WebSocketSessionService {
  private shouldDisconnect = false;
  setShouldDisconnect(value: boolean) { this.shouldDisconnect = value; }
  getShouldDisconnect() { return this.shouldDisconnect; }
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage implements OnInit, OnDestroy {
  isRecording = false;
  isConnected = false;
  isTranscribing = false;
  recordingTime = 0;
  transcriptionResults: TranscriptionResult[] = [];
  sessionStatus: SessionStatus = { status: 'pending' };
  private recordingInterval: any;
  private subscriptions: Subscription[] = [];
  private statusSubscription: Subscription | null = null;
  
  // Demo mode properties
  isDemoMode = true;
  private demoStatusTimer: any;
  private demoRecordingTimer: any;

  constructor(
    private voiceRecordingService: VoiceRecordingService,
    private webSocketService: WebSocketService,
    private transcriptionService: TranscriptionService,
    private statusService: StatusService,
    private webSocketSessionService: WebSocketSessionService, // <-- inject shared service
    private cdr: ChangeDetectorRef
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

    // Only start status monitoring if not in demo mode
    if (!this.isDemoMode) {
      this.statusSubscription = this.statusService.getStatus().subscribe(
        (status) => {
          this.sessionStatus = status;
        }
      );

      this.statusService.startMonitoring();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Only disconnect if not waiting for supplier approval
    if (this.webSocketSessionService.getShouldDisconnect()) {
      this.webSocketService.disconnect();
    }
    this.statusService.stopMonitoring();
    this.stopRecordingTimer();
  }

  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.voiceRecordingService.stopRecording();
      this.transcriptionService.stopTranscription();
      
      // After real recording stops, trigger demo process
      setTimeout(() => {
        this.triggerDemoAfterRecording();
      }, 1000);
      
      // Don't disconnect WebSocket - keep it alive for supplier selection
    } else {
      try {
        // Stop status service monitoring immediately when starting recording
        this.statusService.stopMonitoring();
        console.log('Status service stopped at recording start');
        
        // Always try to connect WebSocket first
        await this.ensureWebSocketConnected();
        if (!this.isConnected) {
          throw new Error('WebSocket connection failed.');
        }
        await this.voiceRecordingService.startRecording();
        setTimeout(() => {
          this.transcriptionService.startTranscription();
        }, 500);
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to start recording. Please check server connection and microphone permissions.');
        this.webSocketService.disconnect();
      }
    }
  }

  private ensureWebSocketConnected(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve();
      } else {
        this.connectToWebSocket();
        // Wait for connection or timeout after 2 seconds
        const start = Date.now();
        const check = () => {
          if (this.isConnected) {
            resolve();
          } else if (Date.now() - start > 2000) {
            resolve(); // Will fail in toggleRecording if not connected
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      }
    });
  }

  private connectToWebSocket(): void {
    // Only connect if not already connected
    if (!this.isConnected) {
      console.log('Connecting to WebSocket...');
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
            // Attempt to reconnect after a delay
            setTimeout(() => {
              if (!this.isConnected) {
                console.log('Attempting to reconnect WebSocket...');
                this.connectToWebSocket();
              }
            }, 3000);
          }
        )
      );
    } else {
      console.log('WebSocket already connected, skipping connection');
    }
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

  // Demo methods
  startDemo(): void {
    this.isDemoMode = true;
    this.isConnected = true;
    this.sessionStatus = { status: 'pending' };
    
    // Start demo status progression
    this.startDemoStatusProgression();
    
    // Add demo transcription
    this.addDemoTranscription();
  }

  private startDemoStatusProgression(): void {
    console.log('Starting demo status progression...');
    
    // Clear any existing timers
    if (this.demoStatusTimer) {
      clearTimeout(this.demoStatusTimer);
    }
    
    // Status progression: pending -> in progress -> completed
    this.demoStatusTimer = setTimeout(() => {
      console.log('Setting status to in progress');
      this.sessionStatus = { status: 'in progress' };
      this.cdr.detectChanges(); // Force change detection
      
      // Set the completed status after another delay
      this.demoStatusTimer = setTimeout(() => {
        console.log('Setting status to completed');
        this.sessionStatus = { status: 'completed' };
        this.cdr.detectChanges(); // Force change detection
      }, 10000); // 10 more seconds for completion
      
    }, 8000); // 8 seconds for processing
  }

  private addDemoTranscription(): void {
    const demoTexts = [
      "I need 50 chairs",
      "delivered to carrousel du louvre",
      "deliver 11.07.2025",
      "sampled"
    ];

    demoTexts.forEach((text, index) => {
      setTimeout(() => {
        this.transcriptionResults.push({
          text: text,
          isFinal: true,
          confidence: 0.95,
          timestamp: Date.now() + index
        });
      }, (index + 1) * 1000);
    });
  }

  startDemoRecording(): void {
    this.isRecording = true;
    this.recordingTime = 0;
    this.startRecordingTimer();
    
    // Stop recording after 4 seconds
    setTimeout(() => {
      this.stopDemoRecording();
    }, 4000);
  }

  stopDemoRecording(): void {
    this.isRecording = false;
    this.stopRecordingTimer();
  }

  resetDemo(): void {
    this.isDemoMode = true;
    this.isRecording = false;
    this.isConnected = false;
    this.recordingTime = 0;
    this.transcriptionResults = [];
    this.sessionStatus = { status: 'pending' };
    
    if (this.demoStatusTimer) {
      clearTimeout(this.demoStatusTimer);
    }
    if (this.demoRecordingTimer) {
      clearTimeout(this.demoRecordingTimer);
    }
  }

  // Trigger demo process after real recording stops
  private triggerDemoAfterRecording(): void {
    console.log('Triggering demo after recording...');
    this.isConnected = true;
    this.isDemoMode = true; // Ensure demo mode is active
    
    // Stop status service monitoring to prevent interference
    this.statusService.stopMonitoring();
    console.log('Status service stopped');
    
    // Unsubscribe from status service if it exists
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
      this.statusSubscription = null;
      console.log('Status subscription unsubscribed');
    }
    
    // Force status update with change detection
    this.sessionStatus = { status: 'pending' };
    console.log('Initial status set to pending');
    
    // Use setTimeout to ensure change detection runs
    setTimeout(() => {
      // Start demo status progression
      this.startDemoStatusProgression();
    }, 100);
    
    // Don't add demo transcription - keep user's real transcription
  }
}
