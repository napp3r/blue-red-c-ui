import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { SupplierInfomarion } from '../pages/suppliers-page/models/supplier-information.model';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private apiUrl = 'http://localhost:8000'; // Base API URL

  constructor(private http: HttpClient) { }

  // Fetch suppliers from the endpoint
  getSuppliers(): Observable<SupplierInfomarion[]> {
    return this.http.get<SupplierInfomarion[]>(`${this.apiUrl}/suppliers`)
      .pipe(
        catchError(error => {
          console.error('Error fetching suppliers:', error);
          // Return empty array on error to prevent app crash
          return of([]);
        })
      );
  }

  saveSelectedSupplier(supplier: SupplierInfomarion): Observable<any> {
    const payload = {
      ...supplier,
      selectedAt: new Date().toISOString(),
      status: 'approved'
    };
    
    return this.http.post(`${this.apiUrl}/suppliers/selected`, payload)
      .pipe(
        catchError(error => {
          console.error('Error saving supplier:', error);
          throw error;
        })
      );
  }

  getSelectedSuppliers(): Observable<SupplierInfomarion[]> {
    return this.http.get<SupplierInfomarion[]>(`${this.apiUrl}/suppliers/selected`)
      .pipe(
        catchError(error => {
          console.error('Error fetching selected suppliers:', error);
          return of([]);
        })
      );
  }
} 