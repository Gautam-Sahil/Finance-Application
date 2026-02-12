import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
// Adjust path
import { NgxSonnerToaster } from 'ngx-sonner';
import { AuthService } from './pages/login/auth.service';
import { NotificationBellComponent } from './pages/notification-bell/notification-bell.component';
import { NotificationService } from './service/notification.service';
import { ProfileMenuComponent } from './pages/profile-menu/profile-menu.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, NgxSonnerToaster, NotificationBellComponent, ProfileMenuComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  notificationService = inject(NotificationService);
  
  isCollapsed = false;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  onLogout() {
    this.authService.logout(); // Make sure your service clears local storage
    this.router.navigateByUrl('/login');
  }
}