import { Component, OnInit, inject, AfterViewInit } from '@angular/core';
import { MasterService } from '../../service/master.service';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private masterService = inject(MasterService);
  
  summary = {
    totalApps: 0,
    totalUsers: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  };

  ngOnInit(): void {
    this.fetchStats();
  }

  fetchStats() {
    this.masterService.getDashboardStats().subscribe({
      next: (res: any) => {
        this.summary.totalApps = res.totalApps;
        this.summary.totalUsers = res.totalUsers;
        
        // Map aggregation results to summary object
        res.stats.forEach((s: any) => {
          if (s._id === 'approved') this.summary.approved = s.count;
          if (s._id === 'pending') this.summary.pending = s.count;
          if (s._id === 'rejected') this.summary.rejected = s.count;
        });

        this.createChart();
      }
    });
  }

  createChart() {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Pending', 'Rejected'],
        datasets: [{
          data: [this.summary.approved, this.summary.pending, this.summary.rejected],
          backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}