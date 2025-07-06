import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SupplierInfomarion } from '../pages/suppliers-page/models/supplier-information.model';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private apiUrl = 'http://localhost:3000/api'; // Adjust this to your backend URL

  constructor(private http: HttpClient) { }

  saveSelectedSupplier(supplier: SupplierInfomarion): Observable<any> {
    const payload = {
      ...supplier,
      selectedAt: new Date().toISOString(),
      status: 'approved'
    };
    
    return this.http.post(`${this.apiUrl}/suppliers/selected`, payload);
  }

  getSelectedSuppliers(): Observable<SupplierInfomarion[]> {
    return this.http.get<SupplierInfomarion[]>(`${this.apiUrl}/suppliers/selected`);
  }
} 