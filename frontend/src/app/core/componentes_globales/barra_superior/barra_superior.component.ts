import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barra_superior.component.html',
  styleUrls: ['./barra_superior.component.css'],
})
export class TopbarComponent {
  constructor(public readonly auth: AuthService) {}
}
