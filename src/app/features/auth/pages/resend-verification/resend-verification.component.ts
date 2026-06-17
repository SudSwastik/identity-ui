import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { ProblemDetail } from '../../../../core/models/auth.models';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-resend-verification',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './resend-verification.component.html',
  styleUrl: './resend-verification.component.scss',
})
export class ResendVerificationComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly prefillEmail = this.route.snapshot.queryParamMap.get('email') ?? '';

  readonly form = new FormGroup({
    email: new FormControl(this.prefillEmail, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  get emailCtrl() { return this.form.controls.email; }

  get emailError(): string | null {
    if (!this.emailCtrl.touched) return null;
    if (this.emailCtrl.hasError('required')) return 'Email is required.';
    if (this.emailCtrl.hasError('email')) return 'Enter a valid email address.';
    return null;
  }

  get verifyParams(): Record<string, string> {
    const email = this.emailCtrl.value;
    return email ? { email } : {};
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    const { email } = this.form.getRawValue();

    this.authService
      .resendVerification({ email })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.success.set(true),
        error: (err: HttpErrorResponse) => {
          const p = err.error as ProblemDetail;
          this.error.set(p?.detail ?? p?.title ?? 'Failed to resend code. Please try again.');
        },
      });
  }
}
