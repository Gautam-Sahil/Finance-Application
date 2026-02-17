import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // 👈 Import HttpHeaders
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../pages/login/auth.service';
import { toast } from 'ngx-sonner';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private socket: Socket | null = null;
  private baseUrl = 'http://localhost:3000';
  private isSocketConnected = false;

  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  constructor() {
    this.initSocket();
    this.loadNotifications(); // Now safe to call
  }

  // ✅ Helper to get headers for this service
  private getHeaders() {
    const token = localStorage.getItem('loanApp_token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

 public initSocket() {
  const currentUser = this.authService.currentUserSignal();
  if (!currentUser) return;

  // Prevent duplicate connections
  if (this.socket && this.socket.connected) {
    // Just re-authenticate to be sure
    this.socket.emit('authenticate', currentUser._id);
    return; 
  }

  this.socket = io(this.baseUrl, { 
    transports: ['websocket'],
    // Ensure we don't auto-connect until we are ready
    autoConnect: true 
  });

  this.socket.on('connect', () => {
    console.log('✅ Socket connected');
    this.isSocketConnected = true;
    this.socket?.emit('authenticate', currentUser._id);
  });

  this.socket.on('notification', (notification: Notification) => {
    console.log('🔔 New notification:', notification);
    
    // 🟢 Update signals immediately
    this.notifications.update(list => [notification, ...list]);
    this.unreadCount.update(c => c + 1);
    
    toast.info(notification.title, { description: notification.message });
  });

  this.socket.on('disconnect', () => {
    this.isSocketConnected = false;
  });
}
  loadNotifications() {
    const currentUser = this.authService.currentUserSignal();
    if (!currentUser) return; // Don't fetch if not logged in

    // ✅ FIX: Added headers
    this.http.get<{ notifications: Notification[]; unreadCount: number }>(
      `${this.baseUrl}/api/notifications`, 
      this.getHeaders()
    ).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications);
        this.unreadCount.set(res.unreadCount);
      },
      error: () => console.log('Notifications load failed (auth issue?)')
    });
  }

  markAsRead(notificationId: string) {
    // ✅ FIX: Added headers
    this.http.put(
      `${this.baseUrl}/api/notifications/${notificationId}/read`, 
      {}, 
      this.getHeaders()
    ).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      }
    });
  }

  markAllAsRead() {
    // ✅ FIX: Added headers
    this.http.put(
      `${this.baseUrl}/api/notifications/read-all`, 
      {}, 
      this.getHeaders()
    ).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      }
    });
  }
}