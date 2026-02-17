import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
// 🟢 1. IMPORT ENVIRONMENT
import { environment } from '../../environments/environment';

export interface TicketReply {
  _id?: string;
  userId: any;
  message: string;
  createdAt: Date;
}

export interface SupportTicket {
  _id: string;
  userId: any;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: any;
  replies: TicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private http = inject(HttpClient);
  
  // 🟢 2. USE ENVIRONMENT VARIABLE
  private baseUrl = environment.apiUrl;
  
  private tokenKey = 'loanApp_token';

  private getAuthHeaders(): HttpHeaders {
    // 🟢 SAFE LOCALSTORAGE CHECK
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenKey) : '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getTickets(): Observable<SupportTicket[]> {
    return this.http.get<SupportTicket[]>(`${this.baseUrl}/tickets`, { headers: this.getAuthHeaders() });
  }

  getTicket(id: string): Observable<SupportTicket> {
    return this.http.get<SupportTicket>(`${this.baseUrl}/tickets/${id}`, { headers: this.getAuthHeaders() });
  }

  createTicket(ticket: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${this.baseUrl}/tickets`, ticket, { headers: this.getAuthHeaders() });
  }

  addReply(ticketId: string, message: string): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${this.baseUrl}/tickets/${ticketId}/reply`, { message }, { headers: this.getAuthHeaders() });
  }

  updateTicket(ticketId: string, data: Partial<SupportTicket>): Observable<SupportTicket> {
    return this.http.put<SupportTicket>(`${this.baseUrl}/tickets/${ticketId}`, data, { headers: this.getAuthHeaders() });
  }

  deleteTicket(ticketId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tickets/${ticketId}`, { headers: this.getAuthHeaders() });
  }
}