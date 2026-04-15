import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Permiso } from '../../models/user-management.models';

@Component({
  selector: 'app-permiso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Permisos</h2>
          <p class="muted">Gestion global de permisos (crear, editar y eliminar).</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="form-grid card inner" [formGroup]="form" (ngSubmit)="save()" *ngIf="canManage">
        <h3>{{ editingId ? 'Editar permiso' : 'Nuevo permiso' }}</h3>
        <div>
          <label class="label">Nombre</label>
          <input class="input" formControlName="nombre" />
        </div>
        <div>
          <label class="label">Descripcion</label>
          <input class="input" formControlName="descripcion" />
        </div>
        <div class="actions">
          <button class="btn btn-primary" [disabled]="form.invalid || loading">
            {{ editingId ? 'Actualizar' : 'Crear' }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="resetForm()">Cancelar</button>
        </div>
      </form>

      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripcion</th>
            <th *ngIf="canManage">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let permiso of permisos">
            <td>{{ permiso.nombre }}</td>
            <td>{{ permiso.descripcion }}</td>
            <td *ngIf="canManage">
              <button class="btn btn-ghost" (click)="edit(permiso)">Editar</button>
              <button class="btn btn-danger" (click)="remove(permiso)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  styles: [
    `
      .page-block {
        padding: 1rem;
      }

      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .muted {
        color: var(--muted);
      }

      .inner {
        padding: 1rem;
        margin: 1rem 0;
      }

      .actions {
        display: flex;
        gap: 0.6rem;
      }
    `,
  ],
})
export class PermisoComponent implements OnInit {
  permisos: Permiso[] = [];
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_permiso');
  }

  ngOnInit(): void {
    this.fetchPermisos();
  }

  fetchPermisos(): void {
    this.api.getPermisos().subscribe({
      next: (rows) => {
        this.permisos = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar permisos.';
      },
    });
  }

  edit(permiso: Permiso): void {
    this.editingId = permiso.id;
    this.form.patchValue({
      nombre: permiso.nombre,
      descripcion: permiso.descripcion,
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({ nombre: '', descripcion: '' });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.form.getRawValue();
    const request$ = this.editingId
      ? this.api.updatePermiso(this.editingId, payload)
      : this.api.createPermiso(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchPermisos();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar permiso.';
      },
    });
  }

  remove(permiso: Permiso): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar permiso ${permiso.nombre}?`)) {
      return;
    }

    this.api.deletePermiso(permiso.id).subscribe({
      next: () => this.fetchPermisos(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar permiso.';
      },
    });
  }
}
