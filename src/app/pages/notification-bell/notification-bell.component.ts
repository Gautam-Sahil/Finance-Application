import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../service/notification.service';
import { AuthService } from '../login/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dropdown">
      <button class="btn btn-icon position-relative" 
              type="button" 
              data-bs-toggle="dropdown" 
              aria-expanded="false">
        
        <i class="bi bi-bell-fill fs-5 text-secondary transition-icon"></i>
        
        @if (unreadCount() > 0) {
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger shadow-sm border border-white">
            {{ unreadCount() > 9 ? '9+' : unreadCount() }}
          </span>
        }
      </button>

      <div class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-4 p-0 overflow-hidden animate-slide-in" 
           style="width: 360px; z-index: 1050;">
        
        <div class="dropdown-header p-3 d-flex justify-content-between align-items-center bg-gradient-primary text-white">
          <h6 class="m-0 fw-bold"><i class="bi bi-bell me-2"></i>Notifications</h6>
          @if (unreadCount() > 0) {
            <button class="btn btn-sm btn-light py-0 px-2 rounded-pill small-text fw-bold" 
                    (click)="markAllAsRead(); $event.stopPropagation()">
              Mark all read
            </button>
          }
        </div>

        <div class="notification-list custom-scrollbar">
          
          @if (notifications().length === 0) {
            <div class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-1 opacity-50"></i>
              <p class="mt-2 small">No new notifications</p>
            </div>
          }

          @for (notif of notifications().slice(0, 5); track notif._id) {
            <div class="notification-item p-3 border-bottom position-relative clickable"
                 [class.bg-unread]="!notif.isRead"
                 (click)="handleNotificationClick(notif)">
              
              <div class="d-flex align-items-start gap-3">
                <div class="icon-circle shadow-sm" [ngClass]="getIconClass(notif.title)">
                  <i class="bi" [ngClass]="getIcon(notif.title)"></i>
                </div>

                <div class="flex-grow-1" style="min-width: 0;">
                  <div class="d-flex justify-content-between align-items-start">
                    <strong class="text-dark d-block text-truncate" style="font-size: 0.95rem;">
                      {{ notif.title }}
                    </strong>
                    <span class="timestamp text-muted ms-2">{{ notif.createdAt | date:'shortTime' }}</span>
                  </div>
                  
                  <p class="text-secondary small mb-0 text-truncate-2">
                    {{ notif.message }}
                  </p>
                </div>

                @if (!notif.isRead) {
                  <span class="unread-dot position-absolute"></span>
                }
              </div>
            </div>
          }
        </div>

        <div class="p-2 bg-light text-center border-top">
          <a routerLink="/notification" class="text-decoration-none fw-bold small text-primary view-all-link">
            View All History <i class="bi bi-arrow-right ms-1"></i>
          </a>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* --- Animations & Layout --- */
    .animate-slide-in {
      animation: slideIn 0.2s ease-out;
    }
   @keyframes slideIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

    .custom-scrollbar {
      max-height: 400px;
      overflow-y: auto;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d2dbe3; border-radius: 10px; }

    /* --- Notification Item Styling --- */
    .notification-item {
      transition: background 0.2s;
      cursor: pointer;
    }
    .notification-item:hover { background-color: #f8f9fa; }
    .notification-item:active { background-color: #e9ecef; }
    
    .bg-unread {
      background-color: #f0fdf4; /* Light Mint Green for Unread */
    }

    .text-truncate-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    /* --- Icons --- */
    .icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;
    }
    .bg-success-gradient { background: linear-gradient(135deg, #28a745, #20c997); }
    .bg-danger-gradient { background: linear-gradient(135deg, #dc3545, #f86d7d); }
    .bg-info-gradient { background: linear-gradient(135deg, #0dcaf0, #3d8bfd); }

    .bg-gradient-primary {
      background: linear-gradient(135deg, #0d6efd, #0a58ca);
    }

    /* --- Unread Dot --- */
    .unread-dot {
      width: 8px;
      height: 8px;
      background-color: #0d6efd;
      border-radius: 50%;
      top: 50%;
      right: 15px;
      transform: translateY(-50%);
    }

    .timestamp { font-size: 0.7rem; }
    .btn-icon:hover .transition-icon { color: #0d6efd !important; }
    .view-all-link:hover { text-decoration: underline !important; }
  `]
})
export class NotificationBellComponent {
  notificationService = inject(NotificationService);
  authService = inject(AuthService);
  router = inject(Router);

  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  // 🟢 NAVIGATION FIX: Handle click logic manually
  handleNotificationClick(notif: any) {
    // 1. Mark as read
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif._id);
    }

    // 2. Navigate if link exists
    if (notif.link) {
      this.router.navigateByUrl(notif.link);
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  // 🟢 UI LOGIC: Choose icon based on text
  getIconClass(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('approved') || t.includes('verified')) return 'bg-success-gradient';
    if (t.includes('rejected') || t.includes('failed')) return 'bg-danger-gradient';
    return 'bg-info-gradient';
  }

  getIcon(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('approved') || t.includes('verified')) return 'bi-check-lg';
    if (t.includes('rejected')) return 'bi-x-lg';
    if (t.includes('document')) return 'bi-file-earmark-text';
    return 'bi-info-lg';
  }
}