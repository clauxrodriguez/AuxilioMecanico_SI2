import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="login-wrap">
      <article class="card login-card">
        <h1>Gestion Usuario</h1>
        <p class="muted">Ingreso al sistema</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
          <div>
            <label class="label">Usuario</label>
            <input class="input" formControlName="username" autocomplete="username" />
          </div>

          <div>
            <label class="label">Contrasena</label>
            <input class="input" type="password" formControlName="password" autocomplete="current-password" />
          </div>

          <button class="btn btn-primary" type="submit" [disabled]="loading || form.invalid">
            {{ loading ? 'Ingresando...' : 'Iniciar sesion' }}
          </button>
        </form>

        <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>
      </article>
    </section>
  `,
  styles: [
    `
      .login-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .login-card {
        width: min(420px, 95vw);
        padding: 1.1rem;
      }

      h1 {
        margin-bottom: 0.2rem;
      }

      .muted {
        margin-top: 0;
        color: var(--muted);
      }
    `,
  ],
})
export class LoginComponent {
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/app/empleados']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'Credenciales invalidas o error de red.';
      },
    });
  }
}
