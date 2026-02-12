import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { AuthService } from '../login/auth.service';
import { toast } from 'ngx-sonner';
import { SupportService, SupportTicket } from '../../service/support.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.css']
})
export class TicketDetailComponent implements OnInit {
  private supportService = inject(SupportService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ticket = signal<SupportTicket | null>(null);
currentUser = this.authService.currentUserSignal;
  replyMessage = '';
  isUpdating = false;

  // For banker/admin
  availableStatuses = ['open', 'in-progress', 'closed'];
  availablePriorities = ['low', 'medium', 'high'];
  users: any[] = []; // For assignment – we'd need an endpoint to fetch bankers

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTicket(id);
    }
  }

  loadTicket(id: string) {
    this.supportService.getTicket(id).subscribe({
      next: (res) => this.ticket.set(res),
      error: () => {
        toast.error('Ticket not found');
        this.router.navigate(['/support-tickets']);
      }
    });
  }

  addReply() {
    if (!this.replyMessage.trim()) {
      toast.warning('Reply cannot be empty');
      return;
    }
    this.supportService.addReply(this.ticket()!._id, this.replyMessage).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.replyMessage = '';
        toast.success('Reply added');
      },
      error: () => toast.error('Failed to add reply')
    });
  }

  updateTicket(field: string, value: any) {
    this.isUpdating = true;
    const updateData: any = {};
    updateData[field] = value;
    this.supportService.updateTicket(this.ticket()!._id, updateData).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        toast.success(`${field} updated`);
        this.isUpdating = false;
      },
      error: () => {
        toast.error(`Failed to update ${field}`);
        this.isUpdating = false;
      }
    });
  }

  canEdit(): boolean {
    const role = this.currentUser()?.role;
    return role === 'Admin' || role === 'Banker';
  }

  canReply(): boolean {
    const role = this.currentUser()?.role;
    const ticket = this.ticket();
    if (!ticket) return false;
    if (role === 'Customer') {
      return ticket.userId?._id === this.currentUser()?._id;
    }
    return true;
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning text-dark';
      case 'low': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'open': return 'bg-success';
      case 'in-progress': return 'bg-primary';
      case 'closed': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  goBack() {
    this.router.navigate(['/support-tickets']);
  }
}