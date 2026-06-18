import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { TokenStorageService } from '../services/token-storage.service';
import { AuthService } from '../services/auth.service';
import { AuthTokens } from '../models/auth.models';

let isRefreshing = false;
const refreshDone$ = new BehaviorSubject<AuthTokens | null>(null);

function addBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function waitForRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return refreshDone$.pipe(
    filter((t): t is AuthTokens => t !== null),
    take(1),
    switchMap(t => next(addBearer(req, t.accessToken))),
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = tokenStorage.getAccessToken();
  if (token) {
    req = addBearer(req, token);
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      const refreshToken = tokenStorage.getRefreshToken();
      const username = tokenStorage.getUsername();

      if (!refreshToken || !username) {
        tokenStorage.clearTokens();
        router.navigate(['/auth/login']);
        return throwError(() => err);
      }

      if (isRefreshing) {
        return waitForRefresh(req, next);
      }

      isRefreshing = true;
      refreshDone$.next(null);

      return authService.refresh({ refreshToken, username }).pipe(
        tap(tokens => {
          tokenStorage.saveTokens(tokens);
          refreshDone$.next(tokens);
          isRefreshing = false;
        }),
        switchMap(tokens => next(addBearer(req, tokens.accessToken))),
        catchError(refreshErr => {
          isRefreshing = false;
          tokenStorage.clearTokens();
          router.navigate(['/auth/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
