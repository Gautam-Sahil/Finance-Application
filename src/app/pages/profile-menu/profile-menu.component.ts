import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../pages/login/auth.service';
import { MasterService } from '../../service/master.service';
import { toast } from 'ngx-sonner';

// Required to use Bootstrap's JavaScript API
declare var bootstrap: any;

interface UserProfile {
  username: string;
  fullName: string;
  emailId?: string;
  email?: string;
}

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.css']
})
export class ProfileMenuComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private masterService = inject(MasterService);
  private router = inject(Router);
  private http = inject(HttpClient);

  currentUser: any = null;

  // Modal Instances
  private editProfileModal: any;
  private changePasswordModal: any;

  // Forms
  editProfileForm = { username: '', fullName: '', emailId: '' };
  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  ngOnInit(): void {
    // 1. Try getting from Signal first
    this.currentUser = this.authService.currentUserSignal();

    // 2. Fallback to LocalStorage immediately if signal is empty (e.g. page refresh)
    if (!this.currentUser) {
      const stored = localStorage.getItem('loanUser');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
          // Sync the signal so the rest of the app knows
          this.authService.currentUserSignal.set(this.currentUser);
        } catch (e) {
          console.error("Error loading user from storage", e);
        }
      }
    }
  }

  // 🧹 CLEANUP: Handle DOM elements when component is destroyed
  ngOnDestroy(): void {
    // Dispose modals if they exist
    if (this.editProfileModal) this.editProfileModal.dispose();
    if (this.changePasswordModal) this.changePasswordModal.dispose();

    // Remove the moved modals from <body> to prevent duplicates
    const editEl = document.getElementById('editProfileModal');
    if (editEl) editEl.remove();

    const passEl = document.getElementById('changePasswordModal');
    if (passEl) passEl.remove();

    // Ensure backdrop is gone
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
  }

  getInitials(): string {
    if (!this.currentUser?.fullName) return 'U';
    return this.currentUser.fullName.split(' ').map((n: any) => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // ========== EDIT PROFILE ==========
// ========== EDIT PROFILE ==========
  openEditProfileModal(event: Event) {
    event.preventDefault();
    
    // 1. Show modal immediately (optional, or wait for data)
    const modalElement = document.getElementById('editProfileModal');
    if (modalElement) {
      document.body.appendChild(modalElement);
      this.editProfileModal = new bootstrap.Modal(modalElement);
      this.editProfileModal.show();
    }

    // 2. Fetch FRESH data from Server to ensure Username exists
    this.http.get<UserProfile>(`${this.masterService['baseUrl']}/profile`, { // Use dynamic URL
  headers: { Authorization: `Bearer ${localStorage.getItem('loanApp_token')}` }
}).subscribe({
  next: (user: UserProfile) => {
    console.log('Fetched Fresh User:', user);

    this.editProfileForm = {
      username: user.username || '',
      fullName: user.fullName || '',
      // 🟢 FIX: Prioritize emailId
      emailId: user.emailId || user.email || '' 
    };
      // Update local state to match
      this.currentUser = user;
      this.authService.updateUser(user);
      },
      error: (err: any) => {
      console.error('Failed to fetch profile', err);
      // Fallback to local data if server fails
      if (this.currentUser) {
         this.editProfileForm = {
        username: this.currentUser.username || '',
        fullName: this.currentUser.fullName || '',
        emailId: this.currentUser.emailId || ''
        };
      }
      }
    });
  }
  saveProfile() {
    this.masterService.updateProfile(this.editProfileForm).subscribe({
      next: (res: any) => {
        // Update Local State with response data
        const updatedUser = { ...this.currentUser, ...res.user };
        
        localStorage.setItem('loanUser', JSON.stringify(updatedUser));
        this.authService.updateUser(updatedUser);
        this.currentUser = updatedUser;
        
        toast.success('Profile updated successfully');
        
        if (this.editProfileModal) {
          this.editProfileModal.hide();
        }
      },
      error: (err) => {
        toast.error('Update failed', { description: err.error?.message });
      }
    });
  }

  closeEditModal() {
    if (this.editProfileModal) this.editProfileModal.hide();
  }

  // ========== CHANGE PASSWORD ==========
  openChangePasswordModal(event: Event) {
    event.preventDefault();
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    
    const modalElement = document.getElementById('changePasswordModal');
    if (modalElement) {
      document.body.appendChild(modalElement);
      this.changePasswordModal = new bootstrap.Modal(modalElement);
      this.changePasswordModal.show();
    }
  }

  changePassword() {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      toast.warning('New password and confirmation do not match');
      return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }

    this.masterService.changePassword({
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        toast.success('Password changed successfully');
        if (this.changePasswordModal) {
          this.changePasswordModal.hide();
        }
      },
      error: (err) => {
        toast.error('Password change failed', { description: err.error?.message });
      }
    });
  }

  closePasswordModal() {
    if (this.changePasswordModal) this.changePasswordModal.hide();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    toast.success('Logged out successfully');
  }
}