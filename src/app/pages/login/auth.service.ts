// auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api';
  
  // Signal to track the logged-in user
 currentUserSignal = signal<any>(JSON.parse(sessionStorage.getItem('bankUser') || 'null'));

 updateUser(user: any) {
    sessionStorage.setItem('loanUser', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  constructor() {
    const user = localStorage.getItem('loanUser'); // Better to use localStorage for persistence
    if (user) this.currentUserSignal.set(JSON.parse(user));
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        // Store token and user info
        localStorage.setItem('loanApp_token', res.token);
        localStorage.setItem('loanUser', JSON.stringify(res.user));
        this.currentUserSignal.set(res.user);
      })
    );
  }

 logout() {
    sessionStorage.removeItem('bankUser');
    sessionStorage.removeItem('token');
    this.currentUserSignal.set(null);
  }

}