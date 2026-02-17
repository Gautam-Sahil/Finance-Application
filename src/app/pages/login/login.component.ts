import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { toast } from 'ngx-sonner';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  // VIEW SIGNALS
  isRegisterMode = signal(false);
  isVerifyMode = signal(false);
  isForgotPassword = signal(false);
  isResetMode = signal(false); // 🟢 NEW: For entering OTP + New Pass

  // DATA
  verificationEmail = '';
  otpCode = '';
  forgotEmail = '';
  newPassword = ''; // 🟢 NEW

  // LOGIN FORM
  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  customerObj: any = {
    username: '', emailId: '', fullName: '', password: '', role: ''
  };

ngOnInit() {
  this.route.queryParams.subscribe(params => {
    const token = params['token'];
    const userParam = params['user'];

    if (token) {
      // Clear query params immediately
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });

      localStorage.setItem('loanApp_token', token);

      if (userParam) {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('loanUser', JSON.stringify(user));
        this.authService.updateUser(user);
      }

      toast.success('Login Successful!');
      this.router.navigateByUrl('/dashboard');
    }
  });
}

  // --- ACTIONS ---

  login() {
    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        toast.success(`Welcome back, ${res.user.fullName}`);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => toast.error(err.error.message || 'Login Failed')
    });
  }

  register() {
    this.authService.register(this.customerObj).subscribe({
      next: (res: any) => {
        toast.success('OTP Sent to email!');
        this.verificationEmail = this.customerObj.emailId;
        this.isVerifyMode.set(true); 
        this.isRegisterMode.set(false);
      },
      error: (err) => toast.error(err.error.message || 'Registration Failed')
    });
  }

  verifyOtp() {
    this.authService.verifyEmail(this.verificationEmail, this.otpCode).subscribe({
      next: (res: any) => {
        toast.success('Account Verified! Please Login.');
        this.isVerifyMode.set(false);
        this.isRegisterMode.set(false);
      },
      error: (err) => toast.error(err.error.message || 'Invalid OTP')
    });
  }

  cancelVerify() {
  this.isVerifyMode.set(false);
  this.isRegisterMode.set(true);
  this.otpCode = '';
}


  // 1. Send OTP for Password Reset
  sendResetLink() {
    if (!this.forgotEmail) return;
    this.authService.sendForgotPasswordOtp(this.forgotEmail).subscribe({
      next: (res: any) => {
        toast.success('OTP sent to your email.');
        // 🟢 FIX: Don't go back to login. Go to Reset Mode.
        this.isForgotPassword.set(false);
        this.isResetMode.set(true); 
      },
      error: (err) => toast.error(err.error.message)
    });
  }

  // 2. Submit New Password with OTP
  submitResetPassword() {
    const data = {
      email: this.forgotEmail,
      otp: this.otpCode,
      newPassword: this.newPassword
    };

    this.authService.resetPassword(data).subscribe({
      next: (res: any) => {
        toast.success('Password changed successfully! Please login.');
        this.isResetMode.set(false); // Go back to main login
        this.otpCode = '';
        this.newPassword = '';
      },
      error: (err) => toast.error(err.error.message || 'Reset failed')
    });
  }

  // --- UI TOGGLES ---

  changeView() {
    this.isRegisterMode.update(val => !val);
    this.isForgotPassword.set(false);
    this.isResetMode.set(false);
  }

  toggleForgotPassword() {
    this.isForgotPassword.update(val => !val);
    this.isResetMode.set(false);
  }

  // Cancel reset and go back to login
  cancelReset() {
    this.isResetMode.set(false);
    this.isForgotPassword.set(false);
  }

 socialLogin(provider: string) {
  const rootUrl = environment.apiUrl.replace('/api', '');
    // Point this to your backend
    window.location.href = `${rootUrl}/api/auth/${provider}`;
  }

}