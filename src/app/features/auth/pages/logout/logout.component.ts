import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { TokenStorageService } from '../../../../core/services/token-storage.service';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [AuthCardComponent],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss',
})
export class LogoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.authService.logout().subscribe({
      next: () => this.finish(),
      error: () => this.finish(),
    });
  }

  private finish(): void {
    this.tokenStorage.clearTokens();
    this.router.navigate(['/auth/login']);
  }
}
