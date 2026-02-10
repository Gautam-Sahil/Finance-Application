import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MasterService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  // USERS
  getAllUsers() {
    return this.http.get(`${this.baseUrl}/users`);
  }

  onDeleteUser(id: string) {
    return this.http.delete(`${this.baseUrl}/users/${id}`);
  }

  // DASHBOARD
  getDashboardStats() {
    return this.http.get(`${this.baseUrl}/dashboard-stats`);
  }

  // LOAN APPLICATION
  onSaveLoan(obj: any) {
    return this.http.post(`${this.baseUrl}/save-loan`, obj);
  }

  onUpdateLoan(id: string, obj: any) {
    return this.http.put(`${this.baseUrl}/update-loan/${id}`, obj);
  }

  onDeleteLoan(id: string) {
    return this.http.delete(`${this.baseUrl}/delete-loan/${id}`);
  }

  getLoanById(id: string) {
    return this.http.get(`${this.baseUrl}/get-loan/${id}`);
  }

  getAllApplications(page: number, limit: number, search: string, status: string) {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);

    return this.http.get(`${this.baseUrl}/get-loans`, { params });
  }

  // DOCUMENT UPLOAD
  uploadDocument(loanId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload-doc/${loanId}`, formData);
  }
}
