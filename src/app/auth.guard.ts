import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { toast } from 'ngx-sonner';
import { AuthService } from './pages/login/auth.service';


export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUserSignal();

  if (user && (user.role === 'Admin' || user.role === 'Banker')) {
    return true;
  } else {
    toast.error("Access Denied", { description: "You don't have permission for this page." });
    router.navigateByUrl('/loan-application-list');
    return false;
  }
};