import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../pages/login/auth.service';
import { toast } from 'ngx-sonner';
// 🟢 1. IMPORT ENVIRONMENT
import { environment } from '../../environments/environment';

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
  
  private apiUrl = environment.apiUrl; 
  
  private socketUrl = this.apiUrl.replace('/api', '');

  private isSocketConnected = false;

  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  constructor() {
    this.initSocket();
    this.loadNotifications();
  }

  private getHeaders() {
    // 🟢 SAFE TOKEN CHECK
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('loanApp_token') : null;
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  public initSocket() {
    // 🟢 SAFE CHECK FOR SSR (Server Side Rendering)
    if (typeof window === 'undefined') return;

    const currentUser = this.authService.currentUserSignal();
    if (!currentUser) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', currentUser._id);
      return; 
    }

    // 🟢 USE SOCKET URL (Root)
    this.socket = io(this.socketUrl, { 
      transports: ['websocket'],
      autoConnect: true 
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected to:', this.socketUrl);
      this.isSocketConnected = true;
      this.socket?.emit('authenticate', currentUser._id);
    });

    this.socket.on('notification', (notification: Notification) => {
      console.log('🔔 New notification:', notification);
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
    if (!currentUser) return;

    // 🟢 USE API URL (already includes /api, so just add /notifications)
    this.http.get<{ notifications: Notification[]; unreadCount: number }>(
      `${this.apiUrl}/notifications`, 
      this.getHeaders()
    ).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications);
        this.unreadCount.set(res.unreadCount);
      },
      error: () => console.log('Notifications load failed')
    });
  }

  markAsRead(notificationId: string) {
    this.http.put(
      `${this.apiUrl}/notifications/${notificationId}/read`, 
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
    this.http.put(
      `${this.apiUrl}/notifications/read-all`, 
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