import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MasterService } from '../../service/master.service';
import { AuthService } from '../login/auth.service';
import { toast } from 'ngx-sonner';

interface AuditLog {
  _id: string;
  userId?: { _id: string; fullName: string; email: string; role: string };
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  collectionName: string;
  documentId: string;
  changes: any;
  timestamp: Date;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.css']
})
export class AuditLogComponent implements OnInit {
  private masterService = inject(MasterService);
  private authService = inject(AuthService);
  showRawJson = false;

  // ✅ Keep the signal itself, not the value
  currentUser = this.authService.currentUserSignal;

  logs = signal<AuditLog[]>([]);
  total = signal(0);
  page = signal(1);
  limit = 20;
  totalPages = signal(1);

  // Filters
  collectionFilter = '';
  actionFilter = '';
  startDate = '';
  endDate = '';
  selectedUserId = '';
  users: any[] = [];

  ngOnInit(): void {
    this.loadLogs();
    // ✅ Use currentUser() to get the value
    if (this.currentUser()?.role !== 'Customer') {
      this.loadUsers();
    }
  }

  loadLogs() {
    const params: any = {
      page: this.page(),
      limit: this.limit,
    };
    if (this.collectionFilter) params.collection = this.collectionFilter;
    if (this.actionFilter) params.action = this.actionFilter;
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;
    if (this.selectedUserId && this.currentUser()?.role !== 'Customer') {
      params.userId = this.selectedUserId;
    }

    // ✅ Use masterService which adds auth headers
    this.masterService.getAuditLogs(params).subscribe({
      next: (res: any) => {
        this.logs.set(res.logs);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
      },
      error: (err) => {
        console.error(err);
        toast.error('Failed to load audit logs');
      }
    });
  }

  loadUsers() {
    this.masterService.getAllUsers().subscribe({
      next: (res: any) => this.users = res,
      error: () => console.warn('Could not load users')
    });
  }

  applyFilters() {
    this.page.set(1);
    this.loadLogs();
  }

  resetFilters() {
    this.collectionFilter = '';
    this.actionFilter = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedUserId = '';
    this.page.set(1);
    this.loadLogs();
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.page.set(newPage);
      this.loadLogs();
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'CREATE': return 'bi-plus-circle-fill text-success';
      case 'UPDATE': return 'bi-pencil-fill text-primary';
      case 'DELETE': return 'bi-trash-fill text-danger';
      default: return 'bi-question-circle-fill';
    }
  }

  getActionBg(action: string): string {
    switch (action) {
      case 'CREATE': return 'bg-success-subtle';
      case 'UPDATE': return 'bg-primary-subtle';
      case 'DELETE': return 'bg-danger-subtle';
      default: return 'bg-secondary-subtle';
    }
  }

 formatChanges(changes: any): { key: string; value: string }[] {
  if (!changes) return [];
  if (typeof changes === 'string') {
    try {
      changes = JSON.parse(changes);
    } catch {
      return [{ key: 'message', value: changes }];
    }
  }
  if (typeof changes !== 'object') return [{ key: 'value', value: String(changes) }];

  return Object.entries(changes).map(([key, val]) => {
    let displayValue = '';
    if (val === null || val === undefined) displayValue = '—';
    else if (typeof val === 'object') {
      // For arrays/objects, show a summary
      if (Array.isArray(val)) {
        displayValue = `[${val.length} item(s)]`;
      } else {
        displayValue = JSON.stringify(val).substring(0, 50) + (JSON.stringify(val).length > 50 ? '…' : '');
      }
    } else if (key.toLowerCase().includes('date') && typeof val === 'string') {
      // Try to format date strings
      const d = new Date(val);
      if (!isNaN(d.getTime())) displayValue = d.toLocaleString();
      else displayValue = String(val);
    } else {
      displayValue = String(val);
    }
    return { key, value: displayValue };
  });
}

// Toggle raw JSON
toggleRaw() {
  this.showRawJson = !this.showRawJson;
}
  getEntityLink(log: AuditLog): string[] | null {
    if (log.collectionName === 'LoanApplication') {
      return ['/loan-application-list', log.documentId];
    } else if (log.collectionName === 'User') {
      if (this.currentUser()?.role !== 'Customer') {
        return ['/banker-user-list']; // adjust to your user detail route
      }
    }
    return null;
  }
}