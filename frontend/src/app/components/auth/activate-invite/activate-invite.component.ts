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
        <div class="brand-icon">&#128295;</div>
        <h1 class="title">Activar cuenta</h1>
        <p class="muted sub">Elige tu usuario y contrasena para acceder a la app movil de Auxilio Mecanico.</p>

        <div class="alert-error" *ngIf="!token">
          Enlace de invitacion invalido o expirado. Contacta a tu administrador.
        </div>

        <form *ngIf="token" [formGroup]="form" class="act-grid" (ngSubmit)="submit()">
          <div>
            <label class="label">Nombre de usuario <span class="req">*</span></label>
            <input
              class="input"
              formControlName="username"
              autocomplete="username"
              placeholder="Ej: juan.perez"
            />
            <small class="hint">Este sera tu usuario para ingresar a la app movil.</small>
            <small class="field-error" *ngIf="form.get('username')?.invalid && form.get('username')?.touched">
              Ingresa un nombre de usuario
            </small>
          </div>

          <div>
            <label class="label">Contrasena <span class="req">*</span></label>
            <input class="input" type="password" formControlName="password" autocomplete="new-password" placeholder="Minimo 6 caracteres" />
          </div>

          <div>
            <label class="label">Confirmar contrasena <span class="req">*</span></label>
            <input class="input" type="password" formControlName="confirmPassword" autocomplete="new-password" placeholder="Repite la contrasena" />
            <small class="field-error" *ngIf="passwordMismatch">Las contrasenas no coinciden</small>
          </div>

          <div class="alert-error" *ngIf="errorMsg">{{ errorMsg }}</div>

          <div class="act-actions">
            <button class="btn btn-primary" style="flex:1" [disabled]="loading || form.invalid">
              {{ loading ? 'Activando...' : 'Activar mi cuenta' }}
            </button>
            <a class="btn btn-ghost" routerLink="/login">Ir a login</a>
          </div>
        </form>
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
        background:
          radial-gradient(circle at 20% 10%, #d9ecf7 0, transparent 35%),
          radial-gradient(circle at 80% 80%, #d8f3ea 0, transparent 35%),
          #f2f5f7;
      }

      .activate-card {
        width: min(480px, 95vw);
        padding: 2rem 1.8rem;
        text-align: center;
      }

      .brand-icon {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
      }

      .title {
        margin: 0 0 0.4rem;
        font-size: 1.5rem;
      }

      .sub {
        color: var(--muted);
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
      }

      .act-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        text-align: left;
      }

      .req { color: var(--danger); }

      .hint {
        display: block;
        font-size: 0.78rem;
        color: var(--muted);
        margin-top: 0.2rem;
      }

      .field-error {
        display: block;
        font-size: 0.8rem;
        color: var(--danger);
        margin-top: 0.2rem;
      }

      .alert-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: var(--danger);
        border-radius: 8px;
        padding: 0.6rem 0.9rem;
        font-size: 0.9rem;
      }

      .act-actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        margin-top: 0.4rem;
      }

      .act-actions .btn {
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

  get passwordMismatch(): boolean {
    const raw = this.form.getRawValue();
    return !!raw.confirmPassword && raw.password !== raw.confirmPassword;
  }

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
