import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="shell">
      <app-sidebar></app-sidebar>

      <main class="page content">
        <app-topbar></app-topbar>
        <section class="workspace">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        display: grid;
        grid-template-columns: 280px 1fr;
        min-height: 100vh;
      }

      .content {
        min-width: 0;
      }

      .workspace {
        padding: 1rem;
      }

      @media (max-width: 920px) {
        .shell {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MainLayoutComponent {}
