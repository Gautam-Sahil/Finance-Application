import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { toast } from 'ngx-sonner';
import { AuthService } from './pages/login/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('authToken');

  // Clone request and add Authorization header if token exists
  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401) {
        // Token expired or invalid – logout and redirect
        authService.logout();
        toast.error('Session expired', { description: 'Please login again' });
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};