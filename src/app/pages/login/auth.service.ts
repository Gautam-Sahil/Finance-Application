// auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api';
  
  // 🟢 Initialize Signal from localStorage safely
  currentUserSignal = signal<any>(this.getUserFromStorage());

  private getUserFromStorage() {
    const userStr = localStorage.getItem('loanUser');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // 1. REGISTER (Triggers OTP email)
  register(userObj: any) {
    return this.http.post(`${this.apiUrl}/register`, userObj);
  }

  // 2. VERIFY EMAIL (Activates account)
  verifyEmail(email: string, otp: string) {
    return this.http.post(`${this.apiUrl}/verify-otp`, { emailId: email, otp });
  }

  // 3. LOGIN (Stores token & user)
  login(credentials: any) {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        // Save to LocalStorage
        localStorage.setItem('loanApp_token', res.token);
        localStorage.setItem('loanUser', JSON.stringify(res.user));
        
        // Update Signal
        this.currentUserSignal.set(res.user);
      })
    );
  }

  // 4. FORGOT PASSWORD (Sends OTP)
  sendForgotPasswordOtp(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  // 5. RESET PASSWORD (Verifies OTP & updates password)
  resetPassword(data: any) {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  // 6. LOGOUT (Clears everything)
  logout() {
    localStorage.removeItem('loanApp_token');
    localStorage.removeItem('loanUser');
    sessionStorage.clear();
    
    this.currentUserSignal.set(null);
    this.router.navigateByUrl('/login');
  }

  // Helper to sync state manually if needed
  updateUser(user: any) {
    localStorage.setItem('loanUser', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }
}