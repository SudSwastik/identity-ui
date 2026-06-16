import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { ProblemDetail } from '../../../../core/models/auth.models';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, FormFieldComponent, ButtonComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch }
  );

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get nameCtrl() { return this.form.controls.name; }
  get emailCtrl() { return this.form.controls.email; }
  get passwordCtrl() { return this.form.controls.password; }
  get confirmPasswordCtrl() { return this.form.controls.confirmPassword; }

  get nameError(): string | null {
    if (!this.nameCtrl.touched) return null;
    if (this.nameCtrl.hasError('required')) return 'Name is required.';
    return null;
  }

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

  get confirmPasswordError(): string | null {
    if (!this.confirmPasswordCtrl.touched) return null;
    if (this.confirmPasswordCtrl.hasError('required')) return 'Please confirm your password.';
    if (this.form.hasError('passwordMismatch')) return 'Passwords do not match.';
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { name, email, password } = this.form.getRawValue();

    this.authService
      .register({ name, email, password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/verify-email'], { queryParams: { email } });
        },
        error: (err: HttpErrorResponse) => {
          const p = err.error as ProblemDetail;
          this.error.set(p?.detail ?? p?.title ?? 'Registration failed. Please try again.');
        },
      });
  }
}
