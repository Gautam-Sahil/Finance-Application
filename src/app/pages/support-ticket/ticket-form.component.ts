import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

import { toast } from 'ngx-sonner';
import { SupportService } from '../../service/support.service';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container py-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow">
            <div class="card-header bg-primary text-white">
              <h4 class="mb-0">
                <i class="bi bi-plus-circle me-2"></i>Create New Support Ticket
              </h4>
            </div>
            <div class="card-body">
              <form (ngSubmit)="submit()">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Subject</label>
                  <input type="text" class="form-control" [(ngModel)]="ticket.subject" name="subject" required>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">Priority</label>
                  <select class="form-select" [(ngModel)]="ticket.priority" name="priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">Message</label>
                  <textarea class="form-control" rows="6" [(ngModel)]="ticket.message" name="message" required></textarea>
                </div>
                <div class="d-flex gap-2">
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-send"></i> Submit Ticket
                  </button>
                  <button type="button" class="btn btn-outline-secondary" (click)="cancel()">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-header {
      background: linear-gradient(135deg, #1e3c72, #2a5298);
    }
  `]
})
export class TicketFormComponent implements OnInit {
  private supportService = inject(SupportService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ticket: any = {
    subject: '',
    priority: 'medium',
    message: ''
  };

  ngOnInit(): void {
    // If editing, you could load existing ticket here
  }

  submit() {
    if (!this.ticket.subject || !this.ticket.message) {
      toast.warning('Please fill in all fields');
      return;
    }

    this.supportService.createTicket(this.ticket).subscribe({
      next: (res) => {
        toast.success('Ticket created successfully');
        this.router.navigate(['/support-tickets', res._id]);
      },
      error: () => toast.error('Failed to create ticket')
    });
  }

  cancel() {
    this.router.navigate(['/support-tickets']);
  }
}