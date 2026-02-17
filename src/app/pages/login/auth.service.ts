import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment'; // ✅ NEW

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // ✅ USE ENVIRONMENT VARIABLE
  private apiUrl = environment.apiUrl;

  currentUserSignal = signal<any>(this.getUserFromStorage());

  private getUserFromStorage() {
    const userStr = localStorage.getItem('loanUser');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  register(userObj: any) {
    return this.http.post(`${this.apiUrl}/register`, userObj);
  }

  verifyEmail(email: string, otp: string) {
    return this.http.post(`${this.apiUrl}/verify-otp`, { emailId: email, otp });
  }

  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('loanApp_token', res.token);
        localStorage.setItem('loanUser', JSON.stringify(res.user));
        this.currentUserSignal.set(res.user);
      })
    );
  }

  sendForgotPasswordOtp(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: any) {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  logout() {
    localStorage.removeItem('loanApp_token');
    localStorage.removeItem('loanUser');
    sessionStorage.clear();
    this.currentUserSignal.set(null);
    this.router.navigateByUrl('/login');
  }

  updateUser(user: any) {
    localStorage.setItem('loanUser', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }
}
