import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface WebSocketMessage {
  type: 'transcription' | 'status' | 'error';
  data: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketMessage>();

  constructor() {}

  connect(url: string): Observable<WebSocketMessage> {
    // Only create new connection if not already connected
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log('Creating new WebSocket connection...');
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
      };

      this.socket.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          const message: WebSocketMessage = {
            type: parsedData.type || 'status',
            data: parsedData.data || parsedData,
            timestamp: Date.now()
          };
          this.messageSubject.next(message);
        } catch (error) {
          const message: WebSocketMessage = {
            type: 'status',
            data: event.data,
            timestamp: Date.now()
          };
          this.messageSubject.next(message);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.messageSubject.error(error);
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
      };
    } else {
      console.log('WebSocket already connected, reusing existing connection');
    }

    return this.messageSubject.asObservable();
  }

  sendAudioData(audioBlob: Blob): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(audioBlob);
    } else {
      console.error('WebSocket is not connected');
    }
  }

  sendAudioChunk(audioChunk: ArrayBuffer): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(audioChunk);
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
