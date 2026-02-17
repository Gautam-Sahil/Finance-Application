export interface CustomerLoan {
  _id: string;
  name: string;
  approvedAmount: number;
  emi: number;
  outstanding: number;
  nextDue: string;
  progress: number;
}

export interface UpcomingEmi {
  _id: string;
  loanId: { fullName: string };
  dueDate: string;
  amount: number;
}

export interface PaymentHistoryItem {
  _id: { year: number; month: number };
  total: number;
}


export interface CustomerDashboardData {
  totalLoans: number;
  totalOutstanding: number;
  totalApproved: number;
  totalPaid: number;
  nextEmi: { amount: number; dueDate: string } | null;
  loans: CustomerLoan[];
  upcoming: UpcomingEmi[];
  recentActivity: Array<{ id: string; title: string; status: string; date: string }>;
  paymentHistory: PaymentHistoryItem[];
}

export interface StatusCount {
  _id: string;
  count: number;
}

export interface MonthlyTrendItem {
  _id: { year: number; month: number };
  count: number;
}

export interface RecentApplication {
  _id: string;
  fullName: string;
  applicationStatus: string;
  createdAt: string;
}

export interface RepaymentSummary {
  _id: string;
  count: number;
  total: number;
}

export interface BankerDashboardResponse {
  statusCounts: StatusCount[];
  monthlyTrend: MonthlyTrendItem[];
  totalApproved: number;
  recent: RecentApplication[];
  repaymentSummary: RepaymentSummary[];
}
