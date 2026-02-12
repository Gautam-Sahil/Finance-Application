import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../service/notification.service';

@Component({
  selector: 'app-notification-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold text-dark-green m-0">Notifications & Alerts</h2>
          <p class="text-muted small m-0">Stay updated on system announcements and updates.</p>
        </div>
        
        <div class="d-flex gap-2">
          <button class="btn btn-outline-success btn-sm" (click)="markAllRead()">
            <i class="bi bi-check2-all"></i> Mark all as read
          </button>
          <button class="btn btn-success btn-sm">
            <i class="bi bi-gear-fill"></i> Settings
          </button>
        </div>
      </div>

      <div class="notification-container">
        
        @if (notifications().length === 0) {
          <div class="text-center py-5 text-muted bg-white rounded shadow-sm">
            <i class="bi bi-bell-slash fs-1"></i>
            <p class="mt-2">No new notifications</p>
          </div>
        }

        @for (notif of notifications(); track notif._id) {
          <div class="card mb-3 border-0 shadow-sm notification-card" 
               [class.unread]="!notif.isRead">
            <div class="card-body d-flex align-items-start gap-3">
              
              <div class="icon-box" [ngClass]="notif.isRead ? 'bg-light text-muted' : 'bg-green-light text-green'">
                <i class="bi bi-bell-fill"></i>
              </div>

              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start">
                  <h6 class="fw-bold mb-1" [class.text-dark-green]="!notif.isRead">{{ notif.title }}</h6>
                  <small class="text-muted text-nowrap ms-2">
                    <i class="bi bi-clock"></i> {{ notif.createdAt | date:'medium' }}
                  </small>
                </div>
                
                <p class="text-secondary mb-2 small">{{ notif.message }}</p>
                
                @if (notif.link) {
                  <a [routerLink]="notif.link" class="btn btn-sm btn-link p-0 text-decoration-none text-green">
                    View Details <i class="bi bi-arrow-right"></i>
                  </a>
                }
              </div>

              <div class="d-flex flex-column gap-2">
                @if (!notif.isRead) {
                  <button class="btn btn-sm btn-icon" (click)="markRead(notif._id)" title="Mark as read">
                    <i class="bi bi-check-circle-fill text-success"></i>
                  </button>
                }
                <button class="btn btn-sm btn-icon" title="Dismiss">
                  <i class="bi bi-x text-muted"></i>
                </button>
              </div>

            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    /* --- Greenery Theme Colors --- */
    .text-dark-green { color: #064e3b; }
    .text-green { color: #059669; }
    .bg-green-light { background-color: #d1fae5; }
    
    /* --- Card Styling --- */
    .notification-card {
      transition: all 0.2s ease;
      border-left: 4px solid transparent;
    }
    
    /* Unread Styling: Light green background + Green border */
    .notification-card.unread {
      background-color: #ecfdf5; /* Very light mint */
      border-left: 4px solid #10b981;
    }

    .notification-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
    }

    /* --- Icon Box --- */
    .icon-box {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .btn-icon {
      background: transparent;
      border: none;
      font-size: 1.1rem;
      transition: 0.2s;
    }
    .btn-icon:hover { transform: scale(1.2); }
  `]
})
export class NotificationPageComponent {
  notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;

  markRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }
}