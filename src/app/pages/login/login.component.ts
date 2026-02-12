import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './auth.service'; // Ensure path is correct
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-login',
  standalone: true,
  // REMOVED AuthService from here
  imports: [FormsModule, ReactiveFormsModule, CommonModule], 
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showregisterForm = signal<boolean>(false);
  
  // INJECT the service here to make it available as 'this.authService'
  private authService = inject(AuthService); 
  private http = inject(HttpClient);
  private router = inject(Router);

  customerObj: any = {
    username: '',
    emailId: '',
    fullName: '',
    password: '',
    role: '', // You can change this or add a select box in the HTML
    projectName: 'Loan Management System'
};

  loginForm: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  changeView() {
    this.showregisterForm.set(!this.showregisterForm());
  }

register() {
  if (!this.customerObj.role) {
    toast.info("Please select a role before registering.");
    return;
  }

  this.http.post("http://localhost:3000/api/register", this.customerObj)
    .subscribe({
      next: (res: any) => {
        toast.success(res.message); // Uses message from server
        this.changeView(); // Switch back to login view
      },
      error: (err) => {
        toast.error(err.error.message || "Registration failed"); // Shows "User already exists" if 409
      }
    });
}

// login.component.ts

login() {
  this.http.post("http://localhost:3000/api/login", this.loginForm.value)
    .subscribe({
      next: (res: any) => {
        // 🔴 CRITICAL FIX: Save the token using the EXACT key MasterService expects
        localStorage.setItem('loanApp_token', res.token); 
        
        // Save user data for persistence
        localStorage.setItem('loanUser', JSON.stringify(res.user));

        // Update the signal in AuthService
        this.authService.updateUser(res.user);

        toast.success('Logged in successfully', {
          description: `Welcome back, ${res.user.fullName}`
        });

        this.router.navigateByUrl('dashboard');
      },
      error: (err) => {
        toast.error('Authentication Failed', {
          description: err.error.message || 'Please check your credentials'
        });
      }
    });
}
}