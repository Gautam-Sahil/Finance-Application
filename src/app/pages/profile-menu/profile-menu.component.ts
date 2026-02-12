import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../pages/login/auth.service';
import { MasterService } from '../../service/master.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.css']
})
export class ProfileMenuComponent implements OnInit {
  private authService = inject(AuthService);
  private masterService = inject(MasterService);
  private router = inject(Router);

  currentUser: any = null;

  // Edit Profile
  editProfileModal: any;
  editProfileForm = {
    username: '',
    fullName: '',
    emailId: ''
  };

  // Change Password
  changePasswordModal: any;
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserSignal();
    if (!this.currentUser) {
      const stored = localStorage.getItem('loanUser');
      if (stored) this.currentUser = JSON.parse(stored);
    }
  }

  // Get user initials for avatar
  getInitials(): string {
    if (!this.currentUser?.fullName) return 'U';
    return this.currentUser.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // ========== EDIT PROFILE ==========
  openEditProfileModal() {
    // Pre-fill form
    this.editProfileForm = {
      username: this.currentUser.username,
      fullName: this.currentUser.fullName,
      emailId: this.currentUser.emailId
    };
    const modalElement = document.getElementById('editProfileModal');
    if (modalElement) {
      this.editProfileModal = new (window as any).bootstrap.Modal(modalElement);
      this.editProfileModal.show();
    }
  }

  saveProfile() {
    this.masterService.updateProfile(this.editProfileForm).subscribe({
      next: (res: any) => {
        // Update local storage and signal
        const updatedUser = { ...this.currentUser, ...res.user };
        localStorage.setItem('loanUser', JSON.stringify(updatedUser));
        this.authService.updateUser(updatedUser);
        this.currentUser = updatedUser;
        toast.success('Profile updated successfully');
        this.editProfileModal.hide();
      },
      error: (err) => {
        toast.error('Update failed', { description: err.error?.message });
      }
    });
  }

  // ========== CHANGE PASSWORD ==========
  openChangePasswordModal() {
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    const modalElement = document.getElementById('changePasswordModal');
    if (modalElement) {
      this.changePasswordModal = new (window as any).bootstrap.Modal(modalElement);
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
        this.changePasswordModal.hide();
      },
      error: (err) => {
        toast.error('Password change failed', { description: err.error?.message });
      }
    });
  }

  // ========== LOGOUT ==========
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    toast.success('Logged out successfully');
  }
}