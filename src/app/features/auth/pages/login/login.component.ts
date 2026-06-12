import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { TokenStorageService } from '../../../../core/services/token-storage.service';
import { AuthTokens, isMfaChallenge, ProblemDetail } from '../../../../core/models/auth.models';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly verified = toSignal(
    this.route.queryParamMap.pipe(map(p => p.get('verified') === 'true'))
  );

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get emailCtrl() { return this.form.controls.email; }
  get passwordCtrl() { return this.form.controls.password; }

  get emailError(): string | null {
    if (!this.emailCtrl.touched) return null;
    if (this.emailCtrl.hasError('required')) return 'Email is required.';
    if (this.emailCtrl.hasError('email')) return 'Enter a valid email address.';
    return null;
  }

  get passwordError(): string | null {
    if (!this.passwordCtrl.touched) return null;
    if (this.passwordCtrl.hasError('required')) return 'Password is required.';
    if (this.passwordCtrl.hasError('minlength')) return 'Password must be at least 8 characters.';
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => {
          if (isMfaChallenge(res)) {
            this.router.navigate(['/auth/mfa'], {
              state: { session: res.session, email: this.emailCtrl.value },
            });
          } else {
            this.tokenStorage.saveTokens(res as AuthTokens);
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err: HttpErrorResponse) => {
          const p = err.error as ProblemDetail;
          this.error.set(p?.detail ?? p?.title ?? 'Login failed. Please try again.');
        },
      });
  }
}
