import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { UserManagementApiService } from '../../services/user-management-api.service';
import { Cargo, Empleado, Rol } from '../../models/user-management.models';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card page-block">
      <header class="head">
        <div>
          <h2>Empleados</h2>
          <p class="muted">Alta, edicion y baja de usuarios empleados.</p>
        </div>
        <a *ngIf="!isCreateView && canManage" [routerLink]="['/app/empleados/nuevo']" class="btn btn-primary">
          + Registrar empleado
        </a>
        <a *ngIf="isCreateView" [routerLink]="['/app/empleados']" class="btn btn-ghost">&larr; Volver</a>
      </header>

      <div class="alert-error" *ngIf="errorMsg">{{ errorMsg }}</div>
      <div class="alert-success" *ngIf="successMsg">{{ successMsg }}</div>

      <!-- FORM -->
      <form class="emp-form card inner" [formGroup]="form" (ngSubmit)="save()" *ngIf="canManage && isCreateView">
        <h3 class="form-title">{{ editingId ? 'Editar empleado' : 'Nuevo empleado' }}</h3>

        <div class="section-label">Datos personales</div>
        <div class="form-grid">
          <div class="full-width">
            <label class="label">Nombre completo <span class="req">*</span></label>
            <input class="input" formControlName="nombre_completo" placeholder="Ej: Juan Perez" />
            <small class="field-error" *ngIf="form.get('nombre_completo')?.invalid && form.get('nombre_completo')?.touched">
              Campo requerido
            </small>
          </div>

          <div>
            <label class="label">Correo electronico <span class="req">*</span></label>
            <input class="input" type="email" formControlName="email" placeholder="correo@ejemplo.com" [readonly]="!!editingId" />
            <small class="field-error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
              Ingresa un correo valido
            </small>
          </div>

          <div>
            <label class="label">CI <span class="req">*</span></label>
            <input class="input" formControlName="ci" placeholder="Numero de cedula" />
            <small class="field-error" *ngIf="form.get('ci')?.invalid && form.get('ci')?.touched">
              Campo requerido
            </small>
          </div>

          <div>
            <label class="label">Telefono</label>
            <input class="input" formControlName="telefono" placeholder="+591 7xxxxxxx" />
          </div>

          <div>
            <label class="label">Direccion</label>
            <input class="input" formControlName="direccion" placeholder="Calle, Nro, Ciudad" />
          </div>

          <div>
            <label class="label">Sueldo (Bs) <span class="req">*</span></label>
            <input class="input" type="number" min="0" formControlName="sueldo" />
          </div>

          <div>
            <label class="label">Cargo</label>
            <select class="input" formControlName="cargo">
              <option value="">Sin cargo</option>
              <option *ngFor="let cargo of cargosCatalogo" [value]="cargo.id">
                {{ cargo.nombre }}
              </option>
            </select>
          </div>

          <div>
            <label class="label">Foto de perfil (opcional)</label>
            <input class="input" type="file" (change)="onFileChange($event)" accept="image/*" />
          </div>
        </div>

        <div class="section-label" style="margin-top:1.2rem">Roles asignados</div>
        <div class="roles-grid" *ngIf="rolesCatalogo.length; else noRoles">
          <label *ngFor="let rol of rolesCatalogo" class="role-check" [class.selected]="selectedRoleIds.has(rol.id)">
            <input
              type="checkbox"
              [checked]="selectedRoleIds.has(rol.id)"
              (change)="toggleRole(rol.id, $event)"
            />
            <span class="role-name">{{ rol.nombre }}</span>
          </label>
        </div>
        <ng-template #noRoles>
          <p class="muted" style="font-size:0.85rem">No hay roles creados. <a [routerLink]="['/app/roles/nuevo']">Crear rol</a></p>
        </ng-template>

        <div class="section-label" style="margin-top:1.2rem" *ngIf="!editingId">Acceso a la app movil</div>
        <div class="credentials-box" *ngIf="!editingId">
          <label class="toggle-row">
            <input type="checkbox" formControlName="send_credentials" />
            <span>
              <strong>Enviar credenciales por correo</strong>
              <small class="muted">
                El empleado recibira su usuario y contrasena temporal para ingresar a la app movil de inmediato.
                Si no se activa, se envia un enlace para que el empleado configure su propia contrasena.
              </small>
            </span>
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="loading || form.invalid">
            {{ loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Registrar empleado') }}
          </button>
          <button class="btn btn-ghost" type="button" (click)="cancelForm()">Cancelar</button>
        </div>
      </form>

      <!-- TABLE -->
      <div *ngIf="!isCreateView">
        <div class="table-toolbar">
          <span class="muted" style="font-size:0.9rem">{{ empleados.length }} empleado(s)</span>
          <button class="btn btn-ghost" (click)="fetchAll()">Refrescar</button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th style="width:48px"></th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Cargo</th>
                <th>Roles</th>
                <th>Estado</th>
                <th *ngIf="canManage">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let emp of empleados">
                <td>
                  <div class="avatar" [style.background]="avatarColor(emp.nombre_completo)">
                    {{ initials(emp.nombre_completo) }}
                  </div>
                </td>
                <td>
                  <strong>{{ emp.nombre_completo }}</strong>
                  <br />
                  <small class="muted">{{ emp.usuario.is_active ? emp.usuario.username : '—' }}</small>
                </td>
                <td>{{ emp.usuario.email }}</td>
                <td>{{ emp.cargo_nombre || '—' }}</td>
                <td>
                  <span class="role-badge" *ngFor="let r of emp.roles_asignados">{{ r.nombre }}</span>
                  <span class="muted" *ngIf="!emp.roles_asignados.length" style="font-size:0.8rem">Sin roles</span>
                </td>
                <td>
                  <span class="status-badge active" *ngIf="emp.usuario.is_active">Activo</span>
                  <span class="status-badge pending" *ngIf="!emp.usuario.is_active">Pendiente</span>
                </td>
                <td *ngIf="canManage">
                  <div class="row-actions">
                    <button class="btn btn-ghost btn-sm" (click)="openEdit(emp)" title="Editar">Editar</button>
                    <button class="btn btn-danger btn-sm" (click)="remove(emp)" title="Eliminar">Eliminar</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!empleados.length">
                <td colspan="7" style="text-align:center; padding:2rem; color:var(--muted)">
                  No hay empleados registrados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .page-block { padding: 1.2rem; }

      .head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-bottom: 1rem;
      }

      .head h2 { margin: 0 0 0.15rem; }
      .muted { color: var(--muted); }

      .alert-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: var(--danger);
        border-radius: 8px;
        padding: 0.6rem 0.9rem;
        margin-bottom: 0.8rem;
        font-size: 0.9rem;
      }

      .alert-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: var(--ok);
        border-radius: 8px;
        padding: 0.6rem 0.9rem;
        margin-bottom: 0.8rem;
        font-size: 0.9rem;
      }

      /* FORM */
      .inner { padding: 1.2rem; margin-bottom: 1rem; }
      .form-title { margin: 0 0 1rem; font-size: 1.1rem; }

      .section-label {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
        margin-bottom: 0.5rem;
      }

      .req { color: var(--danger); }

      .full-width { grid-column: 1 / -1; }

      .field-error {
        display: block;
        color: var(--danger);
        font-size: 0.8rem;
        margin-top: 0.2rem;
      }

      /* Roles grid */
      .roles-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .role-check {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.7rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: background 0.15s, border-color 0.15s;
      }

      .role-check.selected {
        background: #e0f2fe;
        border-color: var(--brand);
        color: var(--brand-2);
      }

      .role-check input[type="checkbox"] { accent-color: var(--brand); }

      /* Credentials toggle */
      .credentials-box {
        background: var(--surface-2);
        border-radius: 10px;
        padding: 0.8rem 1rem;
      }

      .toggle-row {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        cursor: pointer;
      }

      .toggle-row input[type="checkbox"] {
        margin-top: 0.25rem;
        accent-color: var(--brand);
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .toggle-row span { display: flex; flex-direction: column; gap: 0.2rem; }
      .toggle-row small { font-size: 0.82rem; }

      .form-actions {
        margin-top: 1.2rem;
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      /* TABLE */
      .table-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.7rem;
      }

      .table-wrap { overflow-x: auto; }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 0.8rem;
        flex-shrink: 0;
      }

      .role-badge {
        display: inline-block;
        padding: 0.18rem 0.55rem;
        border-radius: 999px;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 0.75rem;
        font-weight: 600;
        margin: 0.1rem 0.15rem 0.1rem 0;
      }

      .status-badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .status-badge.active { background: #d1fae5; color: #065f46; }
      .status-badge.pending { background: #fef3c7; color: #92400e; }

      .row-actions { display: flex; gap: 0.4rem; }

      .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.82rem; }
    `,
  ],
})
export class EmpleadoComponent implements OnInit {
  empleados: Empleado[] = [];
  isCreateView = false;
  cargosCatalogo: Cargo[] = [];
  rolesCatalogo: Rol[] = [];
  selectedRoleIds = new Set<string>();
  selectedFile: File | null = null;

  loading = false;
  errorMsg = '';
  successMsg = '';
  editingId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    nombre_completo: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    ci: ['', Validators.required],
    direccion: [''],
    telefono: [''],
    sueldo: [0, Validators.required],
    cargo: [''],
    send_credentials: [false],
  });

  private readonly avatarPalette = [
    '#0c7b93', '#144f6a', '#0f7b6c', '#7c3aed', '#b45309',
    '#be185d', '#1d4ed8', '#065f46', '#9a3412', '#374151',
  ];

  constructor(
    private readonly api: UserManagementApiService,
    private readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
  ) {}

  get canManage(): boolean {
    return this.auth.hasPermission('manage_empleado');
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  ngOnInit(): void {
    this.route.url.subscribe((segments) => {
      this.isCreateView = segments.some((s) => s.path === 'nuevo');
      if (this.isCreateView) {
        this.resetForm();
      }
    });
    this.fetchAll();
  }

  fetchAll(): void {
    this.api.getEmpleados().subscribe({
      next: (rows) => { this.empleados = rows; },
      error: (err) => { this.errorMsg = err?.error?.detail || 'No se pudo cargar empleados.'; },
    });

    this.api.getRoles().subscribe({
      next: (rows) => { this.rolesCatalogo = rows; },
      error: () => undefined,
    });

    this.api.getCargos().subscribe({
      next: (rows) => { this.cargosCatalogo = rows; },
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
      nombre_completo: emp.nombre_completo,
      email: emp.usuario.email,
      ci: emp.ci,
      direccion: emp.direccion || '',
      telefono: emp.telefono || '',
      sueldo: emp.sueldo,
      cargo: emp.cargo || '',
      send_credentials: false,
    });
    this.selectedRoleIds = new Set(emp.roles || emp.roles_asignados.map((r) => r.id));
  }

  openEdit(emp: Empleado): void {
    this.edit(emp);
    this.isCreateView = true;
  }

  cancelForm(): void {
    this.resetForm();
    this.isCreateView = false;
  }

  resetForm(): void {
    this.editingId = null;
    this.selectedRoleIds = new Set<string>();
    this.selectedFile = null;
    this.errorMsg = '';
    this.successMsg = '';
    this.form.reset({
      nombre_completo: '',
      email: '',
      ci: '',
      direccion: '',
      telefono: '',
      sueldo: 0,
      cargo: '',
      send_credentials: false,
    });
  }

  private buildFormData(): FormData {
    const raw = this.form.getRawValue();
    const data = new FormData();

    data.append('nombre_completo', raw.nombre_completo ?? '');
    data.append('email', raw.email ?? '');
    data.append('ci', raw.ci ?? '');
    data.append('direccion', raw.direccion ?? '');
    data.append('telefono', raw.telefono ?? '');
    data.append('sueldo', String(raw.sueldo ?? 0));
    data.append('cargo', raw.cargo ?? '');

    if (!this.editingId) {
      data.append('send_credentials', raw.send_credentials ? 'true' : 'false');
    }

    Array.from(this.selectedRoleIds).forEach((id) => data.append('roles', id));

    if (this.selectedFile) {
      data.append('foto_perfil', this.selectedFile);
    }

    return data;
  }

  save(): void {
    if (!this.canManage) {
      this.errorMsg = 'No tienes permiso para gestionar empleados.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg = 'Por favor completa todos los campos requeridos.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const payload = this.buildFormData();
    const request$ = this.editingId
      ? this.api.updateEmpleado(this.editingId, payload)
      : this.api.createEmpleado(payload);

    request$.subscribe({
      next: () => {
        this.loading = false;
        const sendCreds = this.form.get('send_credentials')?.value;
        this.successMsg = this.editingId
          ? 'Empleado actualizado correctamente.'
          : sendCreds
            ? 'Empleado registrado. Se enviaron las credenciales por correo.'
            : 'Empleado registrado. Se envio un enlace de activacion por correo.';
        this.resetForm();
        this.fetchAll();
        this.isCreateView = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'No se pudo guardar el empleado.';
      },
    });
  }

  remove(emp: Empleado): void {
    if (!this.canManage) return;

    if (!window.confirm(`Eliminar empleado "${emp.nombre_completo}"?`)) return;

    this.api.deleteEmpleado(emp.id).subscribe({
      next: () => {
        this.successMsg = 'Empleado eliminado.';
        this.fetchAll();
      },
      error: (err) => { this.errorMsg = err?.error?.detail || 'No se pudo eliminar el empleado.'; },
    });
  }
}
