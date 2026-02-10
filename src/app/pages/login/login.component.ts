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
  // Simple validation to ensure role is selected
  if (!this.customerObj.role) {
   toast.info("Please select a role before registering.");
    return;
  }

  this.http.post("http://localhost:3000/api/register", this.customerObj)
    .subscribe({
      next: (res: any) => {
       toast.success("Registration successful for " + this.customerObj.role);
        this.changeView(); // Switch back to login view
      },
      error: (err) => {
      toast.error("Registration failed: " + (err.error.message || "Server Error"));
      }
    });
}
  login() {
  this.http.post("http://localhost:3000/api/login", this.loginForm.value)
    .subscribe({
      next: (res: any) => {
        toast.success('Logged in successfully', {
          description: `Welcome back, ${res.user.fullName}`
        });
        this.authService.updateUser(res.user);
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