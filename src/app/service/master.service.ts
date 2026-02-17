import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BankerDashboardResponse, CustomerDashboardData } from '../dashboard.model';
// 🟢 IMPORT ENVIRONMENT (This is the key fix)
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MasterService {
  private http = inject(HttpClient);
  
  private baseUrl = environment.apiUrl;

  private tokenKey = 'loanApp_token'; 

  // Helper to get headers (Default is JSON)
  private getAuthHeaders(isFileUpload: boolean = false): HttpHeaders {
    // 🟢 SAFE TOKEN RETRIEVAL (Handle null/undefined)
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenKey) : null;
    
    let headersConfig: any = {};
    
    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }

    if (!isFileUpload) {
      headersConfig['Content-Type'] = 'application/json';
    }

    return new HttpHeaders(headersConfig);
  }

  // ... (The rest of your methods are fine, keep them below) ...

  getCustomerDashboard(): Observable<CustomerDashboardData> {
    const headers = this.getAuthHeaders();
    return this.http.get<CustomerDashboardData>(`${this.baseUrl}/dashboard/customer`, { headers });
  }

  getBankerDashboard(): Observable<BankerDashboardResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<BankerDashboardResponse>(`${this.baseUrl}/dashboard/banker`, { headers });
  }

  // ---------- USERS ----------
  getAllUsers() { return this.http.get(`${this.baseUrl}/users`); }
  
  updateUser(userId: string, userData: any) {
    return this.http.put(`${this.baseUrl}/users/${userId}`, userData, { headers: this.getAuthHeaders() });
  }
  
  onDeleteUser(id: string) { return this.http.delete(`${this.baseUrl}/users/${id}`); }

  // ========== PROFILE & PASSWORD ==========
  updateProfile(profileData: any) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/profile`, profileData, { headers });
  }

  changePassword(passwordData: { currentPassword: string; newPassword: string }) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/change-password`, passwordData, { headers });
  }


  // ---------- LOAN APPLICATION ----------
  onSaveLoan(obj: any) { 
    return this.http.post(`${this.baseUrl}/save-loan`, obj, { headers: this.getAuthHeaders() }); 
  }

  onUpdateLoan(id: string, obj: any) { 
    return this.http.put(`${this.baseUrl}/update-loan/${id}`, obj, { headers: this.getAuthHeaders() }); 
  }

  onDeleteLoan(id: string) { 
    return this.http.delete(`${this.baseUrl}/delete-loan/${id}`, { headers: this.getAuthHeaders() }); 
  }
  
  getLoanById(id: string) { return this.http.get(`${this.baseUrl}/get-loan/${id}`); }
  
  getAllApplications(page: number, limit: number, search: string, status: string) {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get(`${this.baseUrl}/get-loans`, { params });
  }

  // ---------- DOCUMENTS ----------
  uploadDocument(loanId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = this.getAuthHeaders(true); 
    return this.http.post(`${this.baseUrl}/upload-doc/${loanId}`, formData, { headers });
  }

  verifyDocument(loanId: string, docIndex: number) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/verify-doc/${loanId}/${docIndex}`, {}, { headers });
  }

  // ---------- APPROVAL WORKFLOW ----------
  approveLoan(loanId: string, data: { remarks?: string }) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/approve-loan/${loanId}`, data, { headers });
  }

  rejectLoan(loanId: string, data: { reason: string }) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/reject-loan/${loanId}`, data, { headers });
  }

  // ========== REPAYMENT ==========
  getRepaymentLoans() {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/repayments/loans`, { headers });
  }

  getRepaymentSchedule(loanId: string) {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/repayments/loan/${loanId}`, { headers });
  }

  markRepaymentPaid(repaymentId: string) {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/repayments/pay/${repaymentId}`, {}, { headers });
  }

  generateRepaymentSchedule(loanId: string, data: any) {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/repayments/generate/${loanId}`, data, { headers });
  }

  getReviewHistory(loanId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/review-history/${loanId}`);
  }

  getAuditLogs(params: any) {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/audit-logs`, { headers, params });
  }
}