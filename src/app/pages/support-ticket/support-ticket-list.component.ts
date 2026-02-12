import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../login/auth.service';
import { toast } from 'ngx-sonner';
import { SupportService, SupportTicket } from '../../service/support.service';

@Component({
  selector: 'app-support-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './support-ticket-list.component.html',
  styleUrls: ['./support-ticket-list.component.css']
})
export class SupportTicketListComponent implements OnInit {
  private supportService = inject(SupportService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // 1. Data Signal
  tickets = signal<SupportTicket[]>([]);
currentUser = this.authService.currentUserSignal;

  // 2. Filter Signals (Reactivity)
  statusFilter = signal('');
  priorityFilter = signal('');
  searchTerm = signal('');

  // 3. Computed Filtered List (This updates AUTOMATICALLY)
  filteredTickets = computed(() => {
    let data = this.tickets();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const term = this.searchTerm().toLowerCase();

    if (status) {
      data = data.filter(t => t.status === status);
    }
    if (priority) {
      data = data.filter(t => t.priority === priority);
    }
    if (term) {
      data = data.filter(t => 
        t.subject.toLowerCase().includes(term) || 
        t.message.toLowerCase().includes(term) ||
        t.userId?.fullName?.toLowerCase().includes(term)
      );
    }
    return data;
  });

  // 4. Computed Stats (Always accurate)
  openCount = computed(() => this.tickets().filter(t => t.status === 'open').length);
  inProgressCount = computed(() => this.tickets().filter(t => t.status === 'in-progress').length);
  closedCount = computed(() => this.tickets().filter(t => t.status === 'closed').length);

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets() {
    this.supportService.getTickets().subscribe({
      next: (res) => {
        console.log('Tickets Loaded:', res); // 🔍 Check Console
        this.tickets.set(res);
      },
      error: (err) => {
        console.error(err);
        toast.error('Failed to load tickets');
      }
    });
  }

  // Helper to update signals from HTML inputs
  updateSearch(event: any) {
    this.searchTerm.set(event.target.value);
  }

  updateStatus(event: any) {
    this.statusFilter.set(event.target.value);
  }

  updatePriority(event: any) {
    this.priorityFilter.set(event.target.value);
  }

  // --- Actions ---
  createNewTicket() {
    this.router.navigate(['/support-tickets/new']);
  }

  viewTicket(id: string) {
    this.router.navigate(['/support-tickets', id]);
  }

  deleteTicket(id: string, event: Event) {
    event.stopPropagation();
    if (this.currentUser()?.role !== 'Admin') return;
    
    toast('Delete ticket?', {
      action: {
        label: 'Delete',
        onClick: () => {
          this.supportService.deleteTicket(id).subscribe({
            next: () => {
              toast.success('Ticket deleted');
              this.loadTickets();
            },
            error: () => toast.error('Delete failed')
          });
        }
      }
    });
  }

  // --- UI Helpers ---
  canAssign(): boolean {
    const role = this.currentUser()?.role;
    return role === 'Admin' || role === 'Banker';
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
}