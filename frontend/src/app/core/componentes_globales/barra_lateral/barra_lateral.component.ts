import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './barra_lateral.component.html',
  styleUrls: ['./barra_lateral.component.css'],
})
export class SidebarComponent {
  constructor(public readonly auth: AuthService) {}

  get hasAdminPermission(): boolean {
    return this.auth.hasPermission('manage_empleado') || 
           this.auth.hasPermission('manage_rol') || 
           this.auth.hasPermission('manage_servicio');
  }

  logout(): void {
    this.auth.logout();
  }
}
