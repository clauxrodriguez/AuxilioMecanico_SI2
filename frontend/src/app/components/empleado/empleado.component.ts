import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Empleado, Rol } from '../../models/user-management.models';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Empleados</h2>
          <p class="muted">Alta, edicion y baja de usuarios empleados.</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMsg">{{ errorMsg }}</p>

      <form class="card inner" [formGroup]="form" (ngSubmit)="save()" *ngIf="canManage">
        <h3>{{ editingId ? 'Editar empleado' : 'Nuevo empleado' }}</h3>

        <div class="form-grid">
          <div>
            <label class="label">Usuario</label>
            <input class="input" formControlName="username" [readonly]="!!editingId" />
          </div>

          <div>
            <label class="label">Contrasena {{ editingId ? '(opcional)' : '' }}</label>
            <input class="input" type="password" formControlName="password" />
          </div>

          <div>
            <label class="label">Nombre</label>
            <input class="input" formControlName="first_name" />
          </div>

          <div>
            <label class="label">Email</label>
            <input class="input" type="email" formControlName="email" />
          </div>

          <div>
            <label class="label">CI</label>
            <input class="input" formControlName="ci" />
          </div>

          <div>
            <label class="label">Apellido paterno</label>
            <input class="input" formControlName="apellido_p" />
          </div>

          <div>
            <label class="label">Apellido materno</label>
            <input class="input" formControlName="apellido_m" />
          </div>

          <div>
            <label class="label">Telefono</label>
            <input class="input" formControlName="telefono" />
          </div>

          <div>
            <label class="label">Direccion</label>
            <input class="input" formControlName="direccion" />
          </div>

          <div>
            <label class="label">Sueldo</label>
            <input class="input" type="number" formControlName="sueldo" />
          </div>

          <div>
            <label class="label">Cargo ID (opcional)</label>
            <input class="input" formControlName="cargo" />
          </div>

          <div>
            <label class="label">Departamento ID (opcional)</label>
            <input class="input" formControlName="departamento" />
          </div>

          <div>
            <label class="label">Foto perfil (opcional)</label>
            <input class="input" type="file" (change)="onFileChange($event)" accept="image/*" />
          </div>
        </div>

        <fieldset class="roles-box">
          <legend>Roles</legend>
          <label *ngFor="let rol of rolesCatalogo" class="role-item">
            <input
              type="checkbox"
              [checked]="selectedRoleIds.has(rol.id)"
              (change)="toggleRole(rol.id, $event)"
            />
            <span>{{ rol.nombre }}</span>
          </label>
        </fieldset>

        <div class="actions">
          <button class="btn btn-primary" [disabled]="loading || form.invalid">Guardar</button>
          <button class="btn btn-ghost" type="button" (click)="resetForm()">Cancelar</button>
        </div>
      </form>

      <table class="table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Cargo</th>
            <th>Departamento</th>
            <th>Roles</th>
            <th *ngIf="canManage">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let emp of empleados">
            <td>{{ emp.usuario.username }}</td>
            <td>{{ emp.usuario.first_name }} {{ emp.apellido_p }}</td>
            <td>{{ emp.usuario.email }}</td>
            <td>{{ emp.cargo_nombre || 'N/A' }}</td>
            <td>{{ emp.departamento_nombre || 'N/A' }}</td>
            <td>
              <span class="badge" *ngFor="let r of emp.roles_asignados">{{ r.nombre }}</span>
            </td>
            <td *ngIf="canManage">
              <button class="btn btn-ghost" (click)="edit(emp)">Editar</button>
              <button class="btn btn-danger" (click)="remove(emp)">Eliminar</button>
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

      .roles-box {
        border: 1px solid var(--line);
        border-radius: 10px;
        margin-top: 1rem;
        padding: 0.8rem;
      }

      .role-item {
        margin-right: 0.9rem;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .actions {
        margin-top: 1rem;
        display: flex;
        gap: 0.6rem;
      }

      .badge {
        margin-right: 0.25rem;
      }
    `,
  ],
})
export class EmpleadoComponent implements OnInit {
  empleados: Empleado[] = [];
  rolesCatalogo: Rol[] = [];
  selectedRoleIds = new Set<string>();
  selectedFile: File | null = null;

  loading = false;
  errorMsg = '';
  editingId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    first_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    ci: ['', Validators.required],
    apellido_p: ['', Validators.required],
    apellido_m: ['', Validators.required],
    direccion: [''],
    telefono: [''],
    sueldo: [0, Validators.required],
    cargo: [''],
    departamento: [''],
  });

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_empleado');
  }

  ngOnInit(): void {
    this.fetchAll();
  }

  fetchAll(): void {
    this.api.getEmpleados().subscribe({
      next: (rows) => {
        this.empleados = rows;
      },
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo cargar empleados.';
      },
    });

    this.api.getRoles().subscribe({
      next: (rows) => {
        this.rolesCatalogo = rows;
      },
      error: () => undefined,
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  toggleRole(roleId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedRoleIds.add(roleId);
    } else {
      this.selectedRoleIds.delete(roleId);
    }
  }

  edit(emp: Empleado): void {
    this.editingId = emp.id;
    this.form.patchValue({
      username: emp.usuario.username,
      password: '',
      first_name: emp.usuario.first_name,
      email: emp.usuario.email,
      ci: emp.ci,
      apellido_p: emp.apellido_p,
      apellido_m: emp.apellido_m,
      direccion: emp.direccion || '',
      telefono: emp.telefono || '',
      sueldo: emp.sueldo,
      cargo: emp.cargo || '',
      departamento: emp.departamento || '',
    });

    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();

    this.selectedRoleIds = new Set(emp.roles || emp.roles_asignados.map((r) => r.id));
  }

  resetForm(): void {
    this.editingId = null;
    this.selectedRoleIds = new Set<string>();
    this.selectedFile = null;
    this.form.reset({
      username: '',
      password: '',
      first_name: '',
      email: '',
      ci: '',
      apellido_p: '',
      apellido_m: '',
      direccion: '',
      telefono: '',
      sueldo: 0,
      cargo: '',
      departamento: '',
    });

    this.form.controls.password.setValidators([Validators.required]);
    this.form.controls.password.updateValueAndValidity();
  }

  private buildFormData(): FormData {
    const raw = this.form.getRawValue();
    const data = new FormData();

    Object.entries(raw).forEach(([key, value]) => {
      if (key === 'password' && this.editingId && !value) {
        return;
      }
      data.append(key, `${value ?? ''}`);
    });

    Array.from(this.selectedRoleIds).forEach((roleId) => data.append('roles', roleId));

    if (this.selectedFile) {
      data.append('foto_perfil', this.selectedFile);
    }

    return data;
  }

  save(): void {
    if (!this.canManage || this.form.invalid) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = this.buildFormData();
    const request$ = this.editingId
      ? this.api.updateEmpleado(this.editingId, payload)
      : this.api.createEmpleado(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.resetForm();
        this.fetchAll();
      },
      error: (error) => {
        this.loading = false;
        this.errorMsg = error?.error?.detail || 'No se pudo guardar empleado.';
      },
    });
  }

  remove(emp: Empleado): void {
    if (!this.canManage) {
      return;
    }

    if (!window.confirm(`Eliminar empleado ${emp.usuario.username}?`)) {
      return;
    }

    this.api.deleteEmpleado(emp.id).subscribe({
      next: () => this.fetchAll(),
      error: (error) => {
        this.errorMsg = error?.error?.detail || 'No se pudo eliminar empleado.';
      },
    });
  }
}
