import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../service/notification.service';


@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dropdown">
      <button class="btn btn-link position-relative text-dark"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style="font-size: 1.2rem;">
        <i class="bi bi-bell"></i>

        @if (unreadCount() > 0) {
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {{ unreadCount() }}
          </span>
        }
      </button>

      <ul class="dropdown-menu dropdown-menu-end shadow notification-dropdown">

        <li class="dropdown-header d-flex justify-content-between align-items-center">
          <span class="fw-bold">Notifications</span>

          @if (unreadCount() > 0) {
            <button class="btn btn-sm btn-link p-0"
                    (click)="markAllAsRead()">
              Mark all as read
            </button>
          }
        </li>

        <li><hr class="dropdown-divider"></li>

        <!-- Show only latest 5 -->
        @if (notifications().length === 0) {
          <li class="text-center text-muted py-3">No notifications</li>
        }

        @for (notif of notifications().slice(0,5); track notif._id) {
          <li>
            <a class="dropdown-item"
               [class.bg-light]="!notif.isRead"
               [routerLink]="notif.link"
               (click)="markAsRead(notif._id)">

              <strong>{{ notif.title }}</strong>
              <p class="small text-muted mb-1 text-truncate">
                {{ notif.message }}
              </p>
              <small class="text-muted">
                {{ notif.createdAt | date:'short' }}
              </small>
            </a>
          </li>
        }

        <!-- View All -->
        @if (notifications().length > 5) {
          <li><hr class="dropdown-divider"></li>
          <li>
            <a routerLink="/notification"
               class="dropdown-item text-center fw-semibold text-primary">
              View All Notifications →
            </a>
          </li>
        }

      </ul>
    </div>
  `,
  styles: [`
    .notification-dropdown {
      width: 350px;
      max-height: 400px;
      overflow-y: auto;
    }

    .dropdown-item {
      white-space: normal;
      padding: 0.75rem 1rem;
    }

    .bg-light {
      background-color: #f8f9fa;
    }

    .text-truncate {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})

export class NotificationBellComponent {
  notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }
}