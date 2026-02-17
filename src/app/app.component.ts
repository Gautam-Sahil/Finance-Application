import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
// Adjust path
import { NgxSonnerToaster } from 'ngx-sonner';
import { AuthService } from './pages/login/auth.service';
import { NotificationBellComponent } from './pages/notification-bell/notification-bell.component';
import { NotificationService } from './service/notification.service';
import { ProfileMenuComponent } from './pages/profile-menu/profile-menu.component';
import { ChatWidgetComponent } from './pages/chat-widget/chat-widget.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, NgxSonnerToaster, NotificationBellComponent, ProfileMenuComponent, ChatWidgetComponent, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title: string = 'finance-application';
  authService = inject(AuthService);
  private router = inject(Router);
  notificationService = inject(NotificationService);
  
  isCollapsed = false;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  onLogout() {
    this.authService.logout(); // Make sure your service clears local storage
    localStorage.removeItem('loanApp_token');
    localStorage.removeItem('loanUser');
    this.router.navigate(['/login']);
  }
}