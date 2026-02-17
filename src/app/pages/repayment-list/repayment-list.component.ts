import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MasterService } from '../../service/master.service';
import { AuthService } from '../login/auth.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-repayment-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
 templateUrl: './repayment-list.component.html',
  styleUrls: ['./repayment-list.component.css']
})
export class RepaymentListComponent implements OnInit {
  private masterService = inject(MasterService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUserSignal;
  loans = signal<any[]>([]);

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans() {
    this.masterService.getRepaymentLoans().subscribe({
      next: (res: any) => this.loans.set(res),
      error: () => toast.error('Failed to load loans')
    });
  }

  viewLoan(id: string) {
    this.router.navigate(['/repayments', id]);
  }
}