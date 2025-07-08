import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap, catchError, startWith } from 'rxjs/operators';

export interface SessionStatus {
  status: 'pending' | 'in progress' | 'completed' | 'error';
  message?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StatusService {
  private statusSubject = new BehaviorSubject<SessionStatus>({ status: 'pending' });
  private updateInterval = 15000; // 15 seconds
  private subscription?: Subscription;

  constructor(private http: HttpClient) {}

  startMonitoring(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.subscription = interval(this.updateInterval)
      .pipe(
        startWith(0), // Start immediately
        switchMap(() => this.fetchStatus())
      )
      .subscribe();
  }

  stopMonitoring(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  getStatus(): Observable<SessionStatus> {
    return this.statusSubject.asObservable();
  }

  private fetchStatus(): Observable<void> {
    return this.http.get<any>('http://localhost:8000/suppliers')
      .pipe(
        catchError(error => {
          console.error('Error fetching session status:', error);
          return [{ status: 'error', message: 'Connection failed' }];
        }),
        switchMap(data => {
          const newStatus: SessionStatus = {
            status: this.determineStatus(data),
            message: data?.message || data?.status,
            timestamp: new Date().toISOString()
          };
          this.statusSubject.next(newStatus);
          return [];
        })
      );
  }

  private determineStatus(data: any): 'pending' | 'in progress' | 'completed' | 'error' {
    if (!data) return 'error';
    
    // For suppliers endpoint: handle supplier array structure
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return 'error'; // No suppliers found
      }
      
      // Check if any supplier has been processed (has response_data or call_status is not pending)
      const hasProcessedSuppliers = data.some((supplier: any) => 
        supplier.response_data !== null || 
        supplier.call_status !== 'pending'
      );
      
      if (hasProcessedSuppliers) {
        return 'completed';
      } else {
        return 'in progress'; // Suppliers found but still being processed
      }
    }
    
    if (typeof data === 'string') {
      const dataStr = data.toLowerCase();
      if (dataStr.includes('completed') || dataStr.includes('done')) {
        return 'completed';
      } else if (dataStr.includes('in progress') || dataStr.includes('processing') || dataStr.includes('running')) {
        return 'in progress';
      }
      return 'pending';
    }
    
    if (typeof data === 'object') {
      const status = data.status || data.state || data.process_status;
      if (status) {
        const statusStr = status.toString().toLowerCase();
        if (statusStr.includes('completed') || statusStr.includes('done') || statusStr === 'success') {
          return 'completed';
        } else if (statusStr.includes('in progress') || statusStr.includes('processing') || statusStr.includes('running')) {
          return 'in progress';
        } else if (statusStr.includes('error') || statusStr.includes('failed')) {
          return 'error';
        }
      }
    }
    
    return 'pending';
  }
} 