import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { toast } from 'ngx-sonner';

import { MasterService } from '../../service/master.service';

declare var bootstrap: any;

@Component({
  selector: 'app-loan-applicationlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-applicationlist.component.html',
  styleUrls: ['./loan-applicationlist.component.css']
})
export class LoanApplicationlistComponent implements OnInit {
  masterService = inject(MasterService);
  router = inject(Router);

  // Data
  applicationList: any[] = [];
  totalItems = 0;
  totalPages = 0;
  loading = false;

  // Pagination & filters
  page = 1;
  limit = 10;
  search = '';
  status = '';

  // Modal
  selectedApplication: any = null;
  private modalInstance: any;

  ngOnInit(): void {
    this.loadApplications();
  }

  // ==================== DATA FETCH ====================
  loadApplications(): void {
    this.loading = true;
    this.masterService.getAllApplications(this.page, this.limit, this.search, this.status)
      .subscribe({
        next: (res: any) => {
          this.applicationList = res.loans;
          this.totalItems = res.totalItems;
          this.totalPages = res.totalPages;
          this.loading = false;
        },
        error: (err) => {
          console.error('Fetch error', err);
          toast.error('Failed to load applications', { description: err.message });
          this.loading = false;
        }
      });
  }

  // ==================== FILTER / SEARCH ====================
  onSearchChange(): void {
    this.page = 1;
    this.loadApplications();
  }

  clearSearch(): void {
    this.search = '';
    this.onSearchChange();
  }

  resetFilters(): void {
    this.search = '';
    this.status = '';
    this.page = 1;
    this.limit = 10;
    this.loadApplications();
    toast.info('Filters cleared');
  }

  resetPagination(): void {
    this.page = 1;
    this.loadApplications();
  }

  // ==================== PAGINATION ====================
  changePage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.page) {
      this.page = p;
      this.loadApplications();
    }
  }

  get visiblePages(): number[] {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    let l: number;

    for (let i = 1; i <= this.totalPages; i++) {
      if (i === 1 || i === this.totalPages || (i >= this.page - delta && i <= this.page + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push(-1); // indicates ellipsis
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }

  // ==================== CRUD ACTIONS ====================
  onEdit(id: string): void {
    this.router.navigate(['/new-loan-form'], { queryParams: { id } });
  }

  deleteApplication(id: string): void {
    toast('Confirm deletion', {
      description: 'Are you sure you want to permanently delete this application?',
      action: {
        label: 'Delete',
        onClick: () => {
          this.masterService.onDeleteLoan(id).subscribe({
            next: () => {
              toast.success('Application deleted');
              if (this.applicationList.length === 1 && this.page > 1) {
                this.page--;
              }
              this.loadApplications();
            },
            error: (err) => toast.error('Delete failed', { description: err.message })
          });
        }
      },
      cancel: { label: 'Cancel' },
      duration: 10000
    });
  }

  // ==================== DETAIL MODAL ====================
  viewDetails(application: any): void {
    this.selectedApplication = application;
    setTimeout(() => {
      const modalElement = document.getElementById('detailModal');
      if (modalElement) {
        this.modalInstance = new bootstrap.Modal(modalElement);
        this.modalInstance.show();
      }
    }, 50);
  }

  // ==================== UTILITIES ====================
  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'pending': return 'bg-warning text-dark';
      case 'done': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  }

  statusIconClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bi bi-check-circle';
      case 'rejected': return 'bi bi-x-circle';
      case 'pending': return 'bi bi-hourglass-split';
      case 'done': return 'bi bi-check2-all';
      default: return 'bi bi-question-circle';
    }
  }

  creditScoreClass(score: number): string {
    if (!score) return 'badge bg-light text-dark';
    if (score >= 750) return 'badge bg-success';
    if (score >= 650) return 'badge bg-warning text-dark';
    return 'badge bg-danger';
  }

  // ==================== EXPORT ====================
  exportToExcel(): void {
    // Clean data for export (exclude sensitive or unnecessary fields)
    const exportData = this.applicationList.map(item => ({
      'Full Name': item.fullName,
      'Email': item.email,
      'Mobile': item.mobileNumber,
      'PAN': item.panCard,
      'DOB': item.dateOfBirth ? new Date(item.dateOfBirth).toLocaleDateString() : '',
      'Salary': item.salary,
      'Employment': item.employmentStatus,
      'Status': item.applicationStatus,
      'Credit Score': item.creditScore,
      'Assets': item.assets,
      'City': item.city,
      'Applied On': item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loan Applications');
    XLSX.writeFile(wb, `Loan_Applications_${new Date().getTime()}.xlsx`);
    toast.success('Exported successfully');
  }
}