import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AuthTokens,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ResendRequest,
} from '../models/auth.models';

export interface Environment {
  production: boolean;
  apiBaseUrl: string;
}

export const ENVIRONMENT = new InjectionToken<Environment>('environment');

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ENVIRONMENT).apiBaseUrl;

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, req);
  }

  register(req: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/register`, req);
  }

  verifyEmail(req: VerifyEmailRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/verify-email`, req);
  }

  resendVerification(req: ResendRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/resend-verification`, req);
  }

  refresh(req: RefreshRequest): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/api/auth/refresh`, req);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/auth/logout`, {});
  }
}
