import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';
import { EmpresaApiService, EmpresaDto } from '../../servicios/empresas.api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './barra_lateral.component.html',
  styleUrls: ['./barra_lateral.component.css'],
})
export class SidebarComponent implements OnInit {
  empresa: EmpresaDto | null = null;

  constructor(
    public readonly auth: AuthService,
    private readonly empresaApi: EmpresaApiService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isClient) {
      this.empresaApi.getMyEmpresa().subscribe({
        next: (data) => {
          this.empresa = data;
        },
        error: (err) => {
          console.error('Error cargando datos de la empresa:', err);
        },
      });
    }
  }

  get hasAdminPermission(): boolean {
    return this.auth.hasPermission('manage_empleado') || 
           this.auth.hasPermission('manage_rol') || 
           this.auth.hasPermission('manage_servicio');
  }

  getStarArray(rating: number | undefined): number[] {
    if (!rating) return [];
    const rounded = Math.round(rating);
    return Array(5).fill(0).map((_, i) => i < rounded ? 1 : 0);
  }

  logout(): void {
    this.auth.logout();
  }
}
