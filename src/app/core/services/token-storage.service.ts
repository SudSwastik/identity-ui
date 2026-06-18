import { Injectable } from '@angular/core';
import { AuthTokens } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly ACCESS_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly ID_KEY = 'id_token';
  private readonly USERNAME_KEY = 'cognito_username';

  saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_KEY, tokens.refreshToken);
    localStorage.setItem(this.ID_KEY, tokens.idToken);
    if (tokens.username) {
      localStorage.setItem(this.USERNAME_KEY, tokens.username);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  getIdToken(): string | null {
    return localStorage.getItem(this.ID_KEY);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  hasToken(): boolean {
    return this.getAccessToken() !== null;
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.ID_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
  }
}
