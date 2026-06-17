import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Sign In',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then(m => m.RegisterComponent),
    title: 'Create Account',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
    title: 'Verify Email',
  },
  {
    path: 'resend-verification',
    loadComponent: () =>
      import('./pages/resend-verification/resend-verification.component')
        .then(m => m.ResendVerificationComponent),
    title: 'Resend Code',
  },
  {
    path: 'logout',
    loadComponent: () =>
      import('./pages/logout/logout.component').then(m => m.LogoutComponent),
    title: 'Sign Out',
  },
];
