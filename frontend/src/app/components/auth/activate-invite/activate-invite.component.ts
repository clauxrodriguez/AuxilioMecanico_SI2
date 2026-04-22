import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-activate-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="activate-wrap">
      <article class="card activate-card">
        <h1>Activar cuenta de empleado</h1>
        <p class="muted">Crea tu usuario y contrasena para habilitar tu acceso.</p>

        <p class="error" *ngIf="!token">Invitacion invalida: falta el token en el enlace.</p>

        <form *ngIf="token" [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
          <div>
            <label class="label">Usuario</label>
            <input class="input" formControlName="username" autocomplete="username" />
          </div>

          <div>
            <label class="label">Contrasena</label>
            <input class="input" type="password" formControlName="password" autocomplete="new-password" />
          </div>

          <div>
            <label class="label">Confirmar contrasena</label>
            <input class="input" type="password" formControlName="confirmPassword" autocomplete="new-password" />
          </div>

          <div class="actions">
            <button class="btn btn-primary" [disabled]="loading || form.invalid">{{ loading ? 'Activando...' : 'Activar cuenta' }}</button>
            <a class="btn btn-ghost" routerLink="/login">Ir a login</a>
          </div>
        </form>

        <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>
      </article>
    </section>
  `,
  styles: [
    `
      .activate-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .activate-card {
        width: min(520px, 95vw);
        padding: 1.4rem;
      }

      .muted {
        color: var(--muted);
      }

      .actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .actions .btn {
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class ActivateInviteComponent implements OnInit {
  token: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  submit(): void {
    if (!this.token || this.loading || this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.password !== raw.confirmPassword) {
      this.errorMsg = 'Las contrasenas no coinciden.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.auth.activateEmployeeInvitation({
      token: this.token,
      username: raw.username.trim(),
      password: raw.password,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/app/empleados']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo activar la cuenta.';
      },
    });
  }
}
