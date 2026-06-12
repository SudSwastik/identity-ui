import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, AuthCardComponent],
  template: `
    <app-auth-card brandName="Identity">
      <p style="text-align:center; color: var(--color-text-secondary); margin-bottom: var(--space-4)">
        Phase 3 — coming soon
      </p>
      <p style="text-align:center; font-size: var(--font-size-sm)">
        <a routerLink="/auth/login">Back to sign in</a>
      </p>
    </app-auth-card>
  `,
})
export class VerifyEmailComponent {}
