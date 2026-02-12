import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { MasterService } from '../../service/master.service';
import { AuthService } from '../../pages/login/auth.service';
import { Router } from '@angular/router';

declare var bootstrap: any;

@Component({
  selector: 'app-banker-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './banker-list.component.html',
  styleUrls: ['./banker-list.component.css']
})
export class BankerListComponent implements OnInit, OnDestroy {
  masterService = inject(MasterService);
  authService = inject(AuthService);
  router = inject(Router);
  fb = inject(FormBuilder);

  userList: any[] = [];
  filteredUsers: any[] = [];
  currentUser: any = null;
  selectedUser: any = null;

  // Filtering & Sorting
  searchTerm: string = '';
  currentFilter: string = 'All';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  // Edit Modal
  showEditModal: boolean = false;
  editForm!: FormGroup;
  editUserId: string = '';
  editModalInstance: any;
  availableRoles: string[] = ['Customer', 'Banker', 'Admin'];

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUsers();
    this.initEditForm();
  }

  ngOnDestroy(): void {
    if (this.editModalInstance) this.editModalInstance.hide();
  }

  initEditForm(): void {
    this.editForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      emailId: ['', [Validators.required, Validators.email]],
      fullName: ['', Validators.required],
      role: ['', Validators.required],
      projectName: ['LoanApp_v19']
    });
  }

  loadCurrentUser(): void {
    this.currentUser = this.authService.currentUserSignal();
    if (!this.currentUser) {
      const stored = localStorage.getItem('loanUser');
      if (stored) this.currentUser = JSON.parse(stored);
    }
    if (!this.currentUser) {
      toast.error('Access Denied', { description: 'Please login first' });
      this.router.navigate(['/login']);
      return;
    }
    if (this.currentUser.role === 'Customer') {
      toast.error('Access Denied', { description: 'Customers cannot access this page' });
      this.router.navigate(['/loan-application-list']);
    }
  }

  loadUsers(): void {
    this.masterService.getAllUsers().subscribe({
      next: (res: any) => {
        this.userList = res;
        this.applyFilters();
      },
      error: () => toast.error('Failed to load users')
    });
  }

  // ========== PERMISSIONS ==========
  canEdit(user: any): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'Admin') return true;
    if (this.currentUser.role === 'Banker') return user.role === 'Customer';
    return false;
  }

  canDelete(user: any): boolean {
    if (!this.currentUser) return false;
    if (user._id === this.currentUser._id) return false;
    if (this.currentUser.role === 'Admin') return true;
    if (this.currentUser.role === 'Banker') return user.role === 'Customer';
    return false;
  }

  // ========== VIEW DETAILS ==========
  viewUserDetails(user: any): void {
    this.selectedUser = user;
    new bootstrap.Modal(document.getElementById('userDetailsModal')).show();
  }

  // ========== EDIT USER ==========
  openEditModal(user: any): void {
    if (!this.canEdit(user)) {
      toast.error('Permission Denied');
      return;
    }
    this.editUserId = user._id;
    this.editForm.patchValue({
      username: user.username,
      emailId: user.emailId,
      fullName: user.fullName,
      role: user.role,
      projectName: user.projectName || 'LoanApp_v19'
    });

    // Disable username if editing self
    if (user._id === this.currentUser._id) {
      this.editForm.get('username')?.disable();
    } else {
      this.editForm.get('username')?.enable();
    }

    // Banker role restrictions
    if (this.currentUser.role === 'Banker') {
      this.editForm.get('role')?.setValue('Customer');
      this.editForm.get('role')?.disable();
    } else {
      this.editForm.get('role')?.enable();
    }

    this.showEditModal = true;
    setTimeout(() => {
      const el = document.getElementById('editUserModal');
      if (el) {
        this.editModalInstance = new bootstrap.Modal(el);
        this.editModalInstance.show();
      }
    }, 100);
  }

  closeEditModal(): void {
    if (this.editModalInstance) this.editModalInstance.hide();
    this.showEditModal = false;
    this.editForm.reset();
    this.editUserId = '';
  }

  saveUser(): void {
    if (this.editForm.invalid) {
      Object.keys(this.editForm.controls).forEach(k => this.editForm.get(k)?.markAsTouched());
      toast.error('Please fill all required fields');
      return;
    }
    const formValue = this.editForm.getRawValue(); // includes disabled controls
    this.masterService.updateUser(this.editUserId, formValue).subscribe({
      next: () => {
        toast.success('User updated successfully');
        this.closeEditModal();
        this.loadUsers();
      },
      error: (err) => toast.error('Update failed', { description: err.error?.message })
    });
  }

  // ========== DELETE ==========
  deleteUser(userId: string, username: string): void {
    const user = this.userList.find(u => u._id === userId);
    if (!user || !this.canDelete(user)) {
      toast.error('Permission Denied');
      return;
    }
    toast(`Delete ${user.role} - ${username}`, {
      description: `Permanently delete ${username}?`,
      action: { label: 'Delete', onClick: () => this.confirmDelete(userId, user) },
      cancel: { label: 'Cancel' },
      duration: 10000
    });
  }

  private confirmDelete(userId: string, user: any): void {
    this.masterService.onDeleteUser(userId).subscribe({
      next: () => {
        toast.success('User deleted', { description: `${user.username} removed` });
        this.loadUsers();
      },
      error: () => toast.error('Delete failed')
    });
  }

  // ========== FILTER / SORT / PAGINATION ==========
  applyFilter(role: string): void { this.currentFilter = role; this.currentPage = 1; this.applyFilters(); }
  applySearch(): void { this.currentPage = 1; this.applyFilters(); }
  applyFilters(): void {
    let result = [...this.userList];
    if (this.currentFilter !== 'All') result = result.filter(u => u.role === this.currentFilter);
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(u => 
        u.username.toLowerCase().includes(term) ||
        u.emailId.toLowerCase().includes(term) ||
        u.fullName.toLowerCase().includes(term)
      );
    }
    if (this.sortField) {
      result.sort((a, b) => {
        const av = a[this.sortField], bv = b[this.sortField];
        return (av < bv ? -1 : av > bv ? 1 : 0) * (this.sortDirection === 'asc' ? 1 : -1);
      });
    }
    this.totalPages = Math.ceil(result.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredUsers = result.slice(start, start + this.pageSize);
  }
  sortBy(field: string): void {
    if (this.sortField === field) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDirection = 'asc'; }
    this.applyFilters();
  }
  changePage(page: number): void { if (page >= 1 && page <= this.totalPages) { this.currentPage = page; this.applyFilters(); } }
  getPageNumbers(): number[] {
    const max = 5, total = this.totalPages, curr = this.currentPage;
    let start = Math.max(1, curr - Math.floor(max / 2));
    let end = Math.min(total, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  getRoleCount(role: string): number { return this.userList.filter(u => u.role === role).length; }
  get f() { return this.editForm.controls; }
}