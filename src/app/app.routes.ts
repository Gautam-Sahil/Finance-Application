import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LoanApplicationlistComponent } from './pages/loan-applicationlist/loan-applicationlist.component';
import { BankerListComponent } from './pages/banker-list/banker-list.component';
import { NewLoanFormComponent } from './pages/new-loan-form/new-loan-form.component';
import { authGuard, roleGuard } from './auth.guard'; // 👈 IMPORT BOTH GUARDS


import { EmiCalculatorComponent } from './pages/emi-calculator/emi-calculator.component';
import { SupportTicketListComponent } from './pages/support-ticket/support-ticket-list.component';
import { TicketFormComponent } from './pages/support-ticket/ticket-form.component';
import { TicketDetailComponent } from './pages/support-ticket/ticket-detail.component';
import { AuditLogComponent } from './pages/audit-log/audit-log.component';
import { NotificationPageComponent } from './pages/notification/notification.component';
import { RepaymentListComponent } from './pages/repayment-list/repayment-list.component';
import { RepaymentDetailComponent } from './pages/repayment-list/repayment-detail.component';
import { EnhancedDashboardComponent } from './pages/enhanced-dashbaord/enhanced-dashbaord.component';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },

    // 🟢 ALL PROTECTED ROUTES BELOW
    { 
        path: '',
        canActivate: [authGuard], // 🔒 Protects all children
        children: [
          { path: 'dashboard', component: EnhancedDashboardComponent, canActivate: [authGuard] },
            { path: 'loan-application-list', component: LoanApplicationlistComponent },
            { path: 'new-loan-form', component: NewLoanFormComponent },
            { path: 'repayments', component: RepaymentListComponent},
            { path: 'repayments/:id', component: RepaymentDetailComponent },
            { path: 'notification', component: NotificationPageComponent },
            { path: 'emi-calculator', component: EmiCalculatorComponent },
            { path: 'support-tickets', component: SupportTicketListComponent },
            { path: 'support-tickets/new', component: TicketFormComponent },
            { path: 'support-tickets/:id', component: TicketDetailComponent },
            { path: 'audit-log', component: AuditLogComponent }
        ]
    },

    // 🔒 Specific Role Routes (Keep separate or nest them)
    { 
        path: 'banker-user-list', 
        component: BankerListComponent, 
        canActivate: [roleGuard] 
    }
];