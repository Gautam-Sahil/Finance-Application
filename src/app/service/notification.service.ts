import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../pages/login/auth.service';
import { toast } from 'ngx-sonner';
// 🟢 IMPORT ENVIRONMENT
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

  // Signals for UI
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  constructor() {
    // 🟢 THE FIX: Watch for User Login/Logout automatically
    effect(() => {
      const user = this.authService.currentUserSignal();
      
      if (user) {
        console.log("👤 User Logged In - Initializing Notifications...");
        this.connectSocket(user._id);
        this.loadNotifications(); // Fetch existing history immediately
      } else {
        console.log("👋 User Logged Out - Cleaning up...");
        this.disconnectSocket();
        this.notifications.set([]); // Clear sensitive data
        this.unreadCount.set(0);
      }
    });
  }

  // Helper for headers
  private getHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('loanApp_token') : null;
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // 1. Socket Connection Logic
  private connectSocket(userId: string) {
    if (this.socket && this.socket.connected) {
        this.socket.emit('authenticate', userId);
        return;
    }

    this.socket = io(this.socketUrl, { 
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket Connected');
      this.socket?.emit('authenticate', userId);
    });

    this.socket.on('notification', (notification: Notification) => {
      console.log('🔔 Real-time Notification:', notification);
      
      // Add to list immediately
      this.notifications.update(list => [notification, ...list]);
      this.unreadCount.update(c => c + 1);
      
      // Show toast
      toast.info(notification.title, { description: notification.message });
      
      // Play sound (optional)
      this.playNotificationSound();
    });

    this.socket.on('disconnect', () => {
        console.log('❌ Socket Disconnected');
    });
  }

  private disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 2. HTTP Fetch Logic (History)
  loadNotifications() {
    this.http.get<{ notifications: Notification[]; unreadCount: number }>(
      `${this.apiUrl}/notifications`, 
      this.getHeaders()
    ).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications);
        this.unreadCount.set(res.unreadCount);
      },
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  // 3. Actions
  markAsRead(notificationId: string) {
    // Optimistic Update (Update UI first, then API)
    this.notifications.update(list =>
      list.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
    );
    this.updateUnreadCount();

    this.http.put(
      `${this.apiUrl}/notifications/${notificationId}/read`, 
      {}, 
      this.getHeaders()
    ).subscribe();
  }

  markAllAsRead() {
    // Optimistic Update
    this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
    this.unreadCount.set(0);

    this.http.put(
      `${this.apiUrl}/notifications/read-all`, 
      {}, 
      this.getHeaders()
    ).subscribe();
  }

  private updateUnreadCount() {
    const count = this.notifications().filter(n => !n.isRead).length;
    this.unreadCount.set(count);
  }

  private playNotificationSound() {
    try {
        const audio = new Audio('assets/notification.mp3'); // Ensure you have a file or remove this
        audio.play().catch(e => console.log('Audio blocked', e));
    } catch (e) {}
  }
}