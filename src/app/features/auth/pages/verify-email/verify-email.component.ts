import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { ProblemDetail } from '../../../../core/models/auth.models';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';

  readonly form = new FormGroup({
    confirmationCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get codeCtrl() { return this.form.controls.confirmationCode; }

  get codeError(): string | null {
    if (!this.codeCtrl.touched) return null;
    if (this.codeCtrl.hasError('required')) return 'Verification code is required.';
    if (this.codeCtrl.hasError('minlength')) return 'Code must be at least 6 characters.';
    return null;
  }

  get resendLink(): string[] { return ['/auth/resend-verification']; }
  get resendParams(): Record<string, string> { return this.email ? { email: this.email } : {}; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { confirmationCode } = this.form.getRawValue();

    this.authService
      .verifyEmail({ email: this.email, confirmationCode })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login'], { queryParams: { verified: 'true' } });
        },
        error: (err: HttpErrorResponse) => {
          const p = err.error as ProblemDetail;
          this.error.set(p?.detail ?? p?.title ?? 'Verification failed. Please try again.');
        },
      });
  }
}
