import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LoanApplicationlistComponent } from './pages/loan-applicationlist/loan-applicationlist.component';
import { BankerListComponent } from './pages/banker-list/banker-list.component';
import { CustomerListComponent } from './pages/customer-list/customer-list.component';
import { NewLoanFormComponent } from './pages/new-loan-form/new-loan-form.component';
import { roleGuard } from './auth.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NotificationPageComponent } from './pages/notification/notification.component';
import { EmiCalculatorComponent } from './pages/emi-calculator/emi-calculator.component';
import { SupportTicketListComponent } from './pages/support-ticket/support-ticket-list.component';
import { TicketFormComponent } from './pages/support-ticket/support-ticket.component';
import { TicketDetailComponent } from './pages/support-ticket/ticket-detail.component';


export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent },
    
    // Protected Routes
    { path: 'loan-application-list', component: LoanApplicationlistComponent },
    { path: 'banker-user-list', component: BankerListComponent, canActivate: [roleGuard] },
    { path: 'customer-list', component: CustomerListComponent },
    { path: 'new-loan-form', component: NewLoanFormComponent },
    
    // 🟢 UPDATE THIS ROUTE
    { path: 'notification', component: NotificationPageComponent},
    
    { path: 'emi-calculator', component: EmiCalculatorComponent},
      { path: 'support-tickets', component: SupportTicketListComponent},
        { path: 'support-tickets/new', component: TicketFormComponent} ,
          { path: 'support-tickets/:id', component: TicketDetailComponent}   

];