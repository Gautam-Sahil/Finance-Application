import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LoanApplicationlistComponent } from './pages/loan-applicationlist/loan-applicationlist.component';
import { BankerListComponent } from './pages/banker-list/banker-list.component';
import { CustomerListComponent } from './pages/customer-list/customer-list.component';
import { NewLoanFormComponent } from './pages/new-loan-form/new-loan-form.component';
import { roleGuard } from './auth.guard';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [

    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
      { path: 'dashboard',
       component: DashboardComponent 
      },
    {
        path: 'login',
        component: LoginComponent,
    },
      {
        path: 'loan-application-list',
        component: LoanApplicationlistComponent,
    },
      {
        path: 'banker-list',
        component: BankerListComponent,
        canActivate: [roleGuard]
    },
      {
        path: 'customer-list',
        component: CustomerListComponent,
    },
      {
        path: 'new-loan-form',
        component: NewLoanFormComponent,
    }
];
