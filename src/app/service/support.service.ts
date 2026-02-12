import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private baseUrl = 'http://localhost:3000/api';
  private tokenKey = 'loanApp_token'; // 🔴 Must match Login

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ✅ Added headers to all requests
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