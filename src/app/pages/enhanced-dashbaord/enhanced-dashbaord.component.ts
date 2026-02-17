import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../login/auth.service';
import { MasterService } from '../../service/master.service';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts'; // 👈 Import Types
import { toast } from 'ngx-sonner';
import { FilterPipe } from '../../filter.pipe';
import { BankerDashboardResponse, CustomerDashboardData, RecentApplication, RepaymentSummary, StatusCount, CustomerLoan,  UpcomingEmi , PaymentHistoryItem} from '../../dashboard.model';

@Component({
  selector: 'app-enhanced-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxChartsModule, FilterPipe],
  templateUrl: './enhanced-dashbaord.component.html',
  styleUrls: ['./enhanced-dashbaord.component.css']
})
export class EnhancedDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private masterService = inject(MasterService);

  currentUser = this.authService.currentUserSignal;
  today = new Date();

  // Data Signals
  customerData = signal<CustomerDashboardData | null>(null);
  statusCounts = signal<StatusCount[]>([]);
  monthlyTrend = signal<any[]>([]); // Changed to any[] for flexibility
  totalApproved = signal(0);
  recentApplications = signal<RecentApplication[]>([]);
  repaymentSummary = signal<RepaymentSummary[]>([]);

  // Computed Pie Data
  statusChartData = computed(() =>
    this.statusCounts().map(s => ({
      name: s._id,
      value: s.count
    }))
  );

  // 🟢 CHART OPTIONS
  // Proper Color Object for newer ngx-charts
  colorScheme: Color = {
    name: 'cool',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0']
  };

  showXAxis = true;
  showYAxis = true;
  gradient = true; // Set to true makes it look nicer
  showLegend = false; // Disable legend for cleaner look on small cards
  showXAxisLabel = true;
  xAxisLabel = 'Month';
  showYAxisLabel = true;
  yAxisLabel = 'Applications';

 paymentChartData(history: any[] = []): { name: string; value: number }[] {
  if (!history || !history.length) return [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return history.map(item => ({
    name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
    value: item.total
  }));
}
  ngOnInit(): void {
    this.loadDashboardData();
  }

  // 🟢 FORMATTER: Removes decimals (16.000 -> 16)
  formatYAxis(val: any) {
    if (val % 1 === 0) {
      return val.toLocaleString(); // Return integer
    }
    return ''; // Hide decimal ticks
  }


  // In EnhancedDashboardComponent
get nextEmi(): { amount: number; dueDate: string } | null {
  const data = this.customerData();
  if (!data?.upcoming?.length) return null;

  // Sort by due date ascending
  const sorted = [...data.upcoming].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const next = sorted[0];
  return { amount: next.amount, dueDate: next.dueDate };
}


  loadDashboardData() {
    const role = this.currentUser()?.role;
    if (role === 'Customer') {
      this.masterService.getCustomerDashboard().subscribe({
        next: (res: any) => this.customerData.set(res as CustomerDashboardData),
        error: () => toast.error('Failed to load dashboard')
      });
    } else {
      this.masterService.getBankerDashboard().subscribe({
        next: (res: BankerDashboardResponse) => {
          this.statusCounts.set(res.statusCounts);

          const seriesData = res.monthlyTrend.map(item => ({
            name: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
            value: item.count
          }));

          this.monthlyTrend.set([{
            name: 'Applications',
            series: seriesData
          }]);

          this.totalApproved.set(res.totalApproved);
          this.recentApplications.set(res.recent);
          this.repaymentSummary.set(res.repaymentSummary);
        },
        error: () => toast.error('Failed to load dashboard')
      });
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'bg-warning text-dark';
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'disbursed': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  }
}