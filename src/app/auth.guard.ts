// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AuthService } from './pages/login/auth.service';

// 🟢 1. General Guard: Checks if user is logged in
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.currentUserSignal()) {
    return true; // User is logged in, let them pass
  } else {
    router.navigateByUrl('/login');
    return false;
  }
};

// 🟢 2. Role Guard: Checks if user is Admin or Banker (Existing)
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUserSignal();

  if (user && (user.role === 'Admin' || user.role === 'Banker')) {
    return true;
  } else {
    toast.error("Access Denied", { description: "You don't have permission for this page." });
    // If logged in but wrong role, go to dashboard, else login
    router.navigateByUrl(user ? '/dashboard' : '/login');
    return false;
  }
};