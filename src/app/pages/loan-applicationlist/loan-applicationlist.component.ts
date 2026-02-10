import { Component, OnInit, inject } from '@angular/core';
import { MasterService } from '../../service/master.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { toast } from 'ngx-sonner';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-loan-applicationlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-applicationlist.component.html',
  styleUrl: './loan-applicationlist.component.css'
})
export class LoanApplicationlistComponent implements OnInit {
  masterService = inject(MasterService);
  applicationList: any[] = [];
  router = inject(Router);

  page = 1;
  limit = 5;
  search = '';
  status = '';
  totalItems = 0;
  totalPages = 0;

  ngOnInit(): void {
    this.loadApplications();
  }

// Inside LoanApplicationlistComponent
loadApplications() {
  this.masterService.getAllApplications(this.page, this.limit, this.search, this.status)
    .subscribe({
      next: (res: any) => {
        // res is now { loans: [...], totalItems: 10, totalPages: 2 }
        this.applicationList = res.loans; 
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
      },
      error: (err) => {
        console.error("Fetch error", err);
      }
    });
}

  exportToExcel() {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.applicationList);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'Loan_Applications.xlsx');
  }

  changePage(p: number) {
    this.page = p;
    this.loadApplications();
  }
  onEdit(id: string) {
  // Navigate to the form and pass the ID as a query parameter
  this.router.navigate(['/new-loan-form'], { queryParams: { id: id } });
}

deleteApplication(id: string) {
  toast(
    'Confirm delete',
    {
      description: 'Are you sure you want to delete this application?',
      action: {
        label: 'Delete',
        onClick: () => {
          this.masterService.onDeleteLoan(id).subscribe({
            next: () => {
              toast.success('Deleted successfully!');
              this.loadApplications(); // refresh list
            },
            error: (err) => {
              toast.error('Delete failed', {
                description: err.message || 'Something went wrong'
              });
            }
          });
        }
      },
      cancel: {
        label: 'Cancel'
      }
    }
  );
}

}