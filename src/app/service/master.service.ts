import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BankerDashboardResponse, CustomerDashboardData } from '../dashboard.model';

@Injectable({ providedIn: 'root' })
export class MasterService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/api';

  // ✅ FIX 1: Match the key used in LoginComponent
  private tokenKey = 'loanApp_token'; 

  // Helper to get headers (Default is JSON)
  private getAuthHeaders(isFileUpload: boolean = false): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    
    let headersConfig: any = {
      'Authorization': `Bearer ${token}`
    };

    // ✅ FIX 2: Only add 'Content-Type: application/json' if it's NOT a file upload
    // For file uploads, Angular/Browser automatically sets 'multipart/form-data; boundary=...'
    if (!isFileUpload) {
      headersConfig['Content-Type'] = 'application/json';
    }

    return new HttpHeaders(headersConfig);
  }


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

  // ✅ FIX: Added headers here too just in case you protect it later
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
    
    // ✅ FIX 2 IMPLEMENTATION: Pass 'true' to tell helper NOT to add JSON header
    const headers = this.getAuthHeaders(true); 
    
    return this.http.post(`${this.baseUrl}/upload-doc/${loanId}`, formData, { headers });
  }

  verifyDocument(loanId: string, docIndex: number) {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/verify-doc/${loanId}/${docIndex}`, {}, { headers });
  }

  // ---------- APPROVAL WORKFLOW ----------
  // These send JSON data, so they use the default getAuthHeaders() (which includes application/json)
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

// Admin only: generate schedule for a loan
generateRepaymentSchedule(loanId: string, data: any) {
  const headers = this.getAuthHeaders();
  return this.http.post(`${this.baseUrl}/repayments/generate/${loanId}`, data, { headers });
}
  getReviewHistory(loanId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/review-history/${loanId}`);
  }

  // In master.service.ts
getAuditLogs(params: any) {
  const headers = this.getAuthHeaders();
  return this.http.get(`${this.baseUrl}/audit-logs`, { headers, params });
}
}