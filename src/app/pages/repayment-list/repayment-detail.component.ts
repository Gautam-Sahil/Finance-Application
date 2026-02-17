import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MasterService } from '../../service/master.service';
import { AuthService } from '../login/auth.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-repayment-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './repayment-detail.component.html',
  styleUrls: ['./repayment-detail.component.css']
})
export class RepaymentDetailComponent implements OnInit {
  private masterService = inject(MasterService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentUser = this.authService.currentUserSignal;
  loan: any = null;
  repayments: any[] = [];

  // Modal state
  showTermModal = false;
  termAmount = 0;
  termRate = 0;
  termTenure = 0;
  termDate = '';

  ngOnInit(): void {
    const loanId = this.route.snapshot.paramMap.get('id');
    if (loanId) this.loadLoan(loanId);
  }

  loadLoan(loanId: string) {
    this.masterService.getRepaymentSchedule(loanId).subscribe({
      next: (res: any) => {
        this.loan = res.loan;
        this.repayments = res.repayments;
      },
      error: () => toast.error('Failed to load repayment details')
    });
  }

  markAsPaid(repaymentId: string) {
    this.masterService.markRepaymentPaid(repaymentId).subscribe({
      next: () => {
        toast.success('Payment recorded');
        this.loadLoan(this.loan._id);
      },
      error: () => toast.error('Failed to record payment')
    });
  }

  openTermModal() {
    // Pre-fill with existing values if any
    this.termAmount = this.loan.approvedAmount || 0;
    this.termRate = this.loan.interestRate || 0;
    this.termTenure = this.loan.tenureMonths || 0;
    this.termDate = this.loan.disbursedDate ? new Date(this.loan.disbursedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    this.showTermModal = true;
  }

  submitTermsAndGenerate() {
    if (this.termAmount <= 0 || this.termRate <= 0 || this.termTenure <= 0) {
      toast.warning('Please fill all fields with positive values');
      return;
    }

    const payload: any = {
      approvedAmount: this.termAmount,
      interestRate: this.termRate,
      tenureMonths: this.termTenure
    };
    if (this.termDate) {
      payload.disbursedDate = new Date(this.termDate).toISOString();
    }

    this.masterService.generateRepaymentSchedule(this.loan._id, payload).subscribe({
      next: () => {
        toast.success('Schedule generated');
        this.showTermModal = false;
        this.loadLoan(this.loan._id);
      },
      error: (err) => {
        toast.error('Generation failed', { description: err.error?.message });
        this.showTermModal = false;
      }
    });
  }

  canEdit(): boolean {
    return ['Admin', 'Banker'].includes(this.currentUser()?.role);
  }

  goBack() {
    this.router.navigate(['/repayments']);
  }
}