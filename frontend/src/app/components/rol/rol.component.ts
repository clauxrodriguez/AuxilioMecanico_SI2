import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Permiso, Rol } from '../../models/user-management.models';

@Component({
  selector: 'app-rol',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Roles</h2>
          <p class="muted">Asigna permisos a roles para control de acceso.</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="card inner" [formGroup]="form" (ngSubmit)="save()" *ngIf="canManage">
        <h3>{{ editingId ? 'Editar rol' : 'Nuevo rol' }}</h3>

        <div>
          <label class="label">Nombre</label>
          <input class="input" formControlName="nombre" />
        </div>

        <div>
          <label class="label">Permisos</label>
          <div class="perm-grid">
            <label *ngFor="let permiso of permisosCatalogo" class="perm-row">
              <input
                type="checkbox"
                [checked]="selectedPermissionIds.has(permiso.id)"
                (change)="togglePermission(permiso.id, $event)"
              />
              <span>{{ permiso.nombre }}</span>
              <small>{{ permiso.descripcion }}</small>
            </label>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" [disabled]="form.invalid || loading">Guardar</button>
          <button type="button" class="btn btn-ghost" (click)="resetForm()">Cancelar</button>
        </div>
      </form>

      <table class="table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Permisos</th>
            <th *ngIf="canManage">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let rol of roles">
            <td>{{ rol.nombre }}</td>
            <td>
              <span class="badge" *ngFor="let p of rol.permisos">{{ p.nombre }}</span>
            </td>
            <td *ngIf="canManage">
              <button class="btn btn-ghost" (click)="edit(rol)">Editar</button>
              <button class="btn btn-danger" (click)="remove(rol)">Eliminar</button>
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
        margin-top: 1rem;
      }

      .perm-grid {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 0.7rem;
        max-height: 260px;
        overflow: auto;
        display: grid;
        gap: 0.5rem;
      }

      .perm-row {
        display: grid;
        grid-template-columns: 24px 170px 1fr;
        gap: 0.5rem;
        align-items: center;
      }

      .badge {
        margin-right: 0.35rem;
        margin-bottom: 0.2rem;
      }
    `,
  ],
})
export class RolComponent implements OnInit {
  roles: Rol[] = [];
  permisosCatalogo: Permiso[] = [];
  selectedPermissionIds = new Set<string>();
  editingId: string | null = null;
  loading = false;
  errorMsg = '';

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_rol');
  }

  ngOnInit(): void {
    this.fetchAll();
  }

  fetchAll(): void {
    this.api.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar roles.';
      },
    });

    this.api.getPermisos().subscribe({
      next: (permisos) => {
        this.permisosCatalogo = permisos;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar permisos del catalogo.';
      },
    });
  }

  togglePermission(permissionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedPermissionIds.add(permissionId);
    } else {
      this.selectedPermissionIds.delete(permissionId);
    }
  }

  edit(rol: Rol): void {
    this.editingId = rol.id;
    this.form.patchValue({ nombre: rol.nombre });
    this.selectedPermissionIds = new Set(rol.permisos.map((p) => p.id));
  }

  resetForm(): void {
    this.editingId = null;
    this.selectedPermissionIds = new Set<string>();
    this.form.reset({ nombre: '' });
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = {
      nombre: this.form.getRawValue().nombre,
      permisos: Array.from(this.selectedPermissionIds),
    };

    const request$ = this.editingId
      ? this.api.updateRole(this.editingId, payload)
      : this.api.createRole(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchAll();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar rol.';
      },
    });
  }

  remove(rol: Rol): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar rol ${rol.nombre}?`)) {
      return;
    }

    this.api.deleteRole(rol.id).subscribe({
      next: () => this.fetchAll(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar rol.';
      },
    });
  }
}
