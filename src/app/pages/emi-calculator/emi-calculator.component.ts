import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../login/auth.service';
import { MasterService } from '../../service/master.service';
import { toast } from 'ngx-sonner';
import * as jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emi-calculator.component.html',
  styleUrls: ['./emi-calculator.component.css']
})
export class EmiCalculatorComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private masterService = inject(MasterService);

  // Calculator inputs
  loanAmount = signal<number>(500000);
  interestRate = signal<number>(10.5);
  tenure = signal<number>(60); // months
  tenureType: 'months' | 'years' = 'months';

  // Results
  emi = signal<number>(0);
  totalInterest = signal<number>(0);
  totalPayment = signal<number>(0);

  // Eligibility inputs
  monthlyIncome = signal<number>(50000);
  existingEmi = signal<number>(0);
  creditScore = signal<number>(750);
  
  // Eligibility results
  eligibleAmount = signal<number>(0);
  maxEmi = signal<number>(0);
  isEligible = signal<boolean>(false);
  eligibilityMessage = signal<string>('');

  // For amortization table
  showAmortization = signal<boolean>(false);
  amortizationSchedule: any[] = [];

  // For saving calculations
  currentUser = this.authService.currentUserSignal;
  savedCalculations: any[] = [];

  ngOnInit() {
    this.calculateEMI();
    if (this.currentUser()) {
      this.loadUserSalary(); // Pre-fill salary from latest application
    }
  }

  calculateEMI() {
    const amount = this.loanAmount();
    const rate = this.interestRate();
    let tenure = this.tenure();
    if (this.tenureType === 'years') tenure *= 12;

    this.http.post<any>('http://localhost:3000/api/calculate-emi', {
      amount, rate, tenure, tenureType: 'months'
    }).subscribe({
      next: (res) => {
        this.emi.set(res.emi);
        this.totalInterest.set(res.totalInterest);
        this.totalPayment.set(res.totalPayment);
      },
      error: () => toast.error('Failed to calculate EMI')
    });
  }

  checkEligibility() {
    this.http.post<any>('http://localhost:3000/api/check-eligibility', {
      monthlyIncome: this.monthlyIncome(),
      existingEmi: this.existingEmi(),
      creditScore: this.creditScore(),
      requestedAmount: this.loanAmount(),
      tenureMonths: this.tenureType === 'months' ? this.tenure() : this.tenure() * 12
    }).subscribe({
      next: (res) => {
        this.eligibleAmount.set(res.eligibleAmount);
        this.maxEmi.set(res.maxEmi);
        this.isEligible.set(res.isEligible);
        this.eligibilityMessage.set(res.message);
      },
      error: () => toast.error('Eligibility check failed')
    });
  }

  generateAmortization() {
    const principal = this.loanAmount();
    const monthlyRate = this.interestRate() / (12 * 100);
    const monthlyEMI = this.emi();
    let balance = principal;
    const schedule = [];

    for (let i = 1; i <= (this.tenureType === 'months' ? this.tenure() : this.tenure() * 12); i++) {
      const interest = balance * monthlyRate;
      const principalPaid = monthlyEMI - interest;
      balance -= principalPaid;
      schedule.push({
        month: i,
        openingBalance: Math.round(balance + principalPaid),
        emi: Math.round(monthlyEMI),
        interest: Math.round(interest),
        principal: Math.round(principalPaid),
        closingBalance: Math.round(Math.max(balance, 0))
      });
      if (balance <= 0) break;
    }
    this.amortizationSchedule = schedule;
    this.showAmortization.set(true);
  }

  exportToPDF() {
    const doc = new jsPDF.default();
    doc.text('EMI Calculation Report', 14, 15);
    doc.text(`Loan Amount: ₹${this.loanAmount().toLocaleString()}`, 14, 25);
    doc.text(`Interest Rate: ${this.interestRate()}%`, 14, 35);
    doc.text(`Tenure: ${this.tenure()} ${this.tenureType}`, 14, 45);
    doc.text(`Monthly EMI: ₹${this.emi().toLocaleString()}`, 14, 55);
    doc.text(`Total Interest: ₹${this.totalInterest().toLocaleString()}`, 14, 65);
    doc.text(`Total Payment: ₹${this.totalPayment().toLocaleString()}`, 14, 75);

    if (this.showAmortization()) {
      autoTable(doc, {
        head: [['Month', 'Opening Bal.', 'EMI', 'Interest', 'Principal', 'Closing Bal.']],
        body: this.amortizationSchedule.slice(0, 24).map(row => [
          row.month,
          `₹${row.openingBalance.toLocaleString()}`,
          `₹${row.emi.toLocaleString()}`,
          `₹${row.interest.toLocaleString()}`,
          `₹${row.principal.toLocaleString()}`,
          `₹${row.closingBalance.toLocaleString()}`
        ]),
        startY: 85,
        margin: { horizontal: 10 },
        styles: { fontSize: 8 }
      });
    }
    doc.save(`EMI_Calculation_${new Date().getTime()}.pdf`);
  }

  loadUserSalary() {
    // For simplicity, we fetch the user's latest application to get salary
    this.masterService.getAllApplications(1, 1, '', '').subscribe({
      next: (res: any) => {
        const latest = res.loans[0];
        if (latest && latest.salary) {
          this.monthlyIncome.set(latest.salary / 12); // Assuming salary is annual
        }
      }
    });
  }

  // Slider formatters
  formatLabel(value: number): string {
    if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
    if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'k';
    return '₹' + value;
  }
}