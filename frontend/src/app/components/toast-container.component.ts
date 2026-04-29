import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService, Toast } from '.././services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts"
        [class]="'toast toast-' + toast.type"
        [@slideIn]
      >
        <div class="toast-content">
          <div class="toast-header">
            <strong>{{ toast.title }}</strong>
            <button
              type="button"
              class="toast-close"
              (click)="onClose(toast.id)"
            >
              ✕
            </button>
          </div>
          <p class="toast-message">{{ toast.message }}</p>
          <div class="toast-actions" *ngIf="toast.action">
            <button
              type="button"
              class="toast-action-btn"
              (click)="onActionClick(toast)"
            >
              {{ toast.action.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
        pointer-events: none;
      }

      .toast {
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 12px 16px;
        color: #fff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        pointer-events: all;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .toast-success {
        background: rgba(34, 197, 94, 0.95);
        border-color: rgba(34, 197, 94, 0.4);
      }

      .toast-error {
        background: rgba(239, 68, 68, 0.95);
        border-color: rgba(239, 68, 68, 0.4);
      }

      .toast-warning {
        background: rgba(251, 146, 60, 0.95);
        border-color: rgba(251, 146, 60, 0.4);
      }

      .toast-info {
        background: rgba(59, 130, 246, 0.95);
        border-color: rgba(59, 130, 246, 0.4);
      }

      .toast-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .toast-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .toast-header strong {
        margin: 0;
        font-weight: 600;
      }

      .toast-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
        flex-shrink: 0;
      }

      .toast-close:hover {
        opacity: 1;
      }

      .toast-message {
        margin: 0;
        font-size: 14px;
        line-height: 1.4;
      }

      .toast-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
      }

      .toast-action-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #fff;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .toast-action-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      @media (max-width: 600px) {
        .toast-container {
          max-width: 90vw;
          left: 5%;
          right: 5%;
        }

        .toast {
          padding: 10px 12px;
        }

        .toast-message {
          font-size: 13px;
        }
      }
    `,
  ],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private destroy$ = new Subject<void>();

  constructor(private readonly toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService
      .getToasts()
      .pipe(takeUntil(this.destroy$))
      .subscribe((toasts) => {
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClose(id: string): void {
    this.toastService.remove(id);
  }

  onActionClick(toast: Toast): void {
    if (toast.action) {
      toast.action.callback();
      this.toastService.remove(toast.id);
    }
  }
}
