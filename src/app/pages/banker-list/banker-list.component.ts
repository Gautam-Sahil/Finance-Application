import { Component, OnInit, inject } from '@angular/core';
import { MasterService } from '../../service/master.service';
import { CommonModule, DatePipe } from '@angular/common';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-banker-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './banker-list.component.html',
  styleUrl: './banker-list.component.css'
})
export class BankerListComponent implements OnInit {
  masterService = inject(MasterService);
  userList: any[] = [];

  ngOnInit(): void {
    this.loadUsers();
  }

loadUsers() {
    this.masterService.getAllUsers().subscribe({
      next: (res: any) => {
        this.userList = res;
      },
      error: () => {
        toast.error('Failed to load users');
      }
    });
  }

 deleteUser(id: string) {
    toast(
      'Confirm deletion',
      {
        description: 'Are you sure you want to remove this user?',
        action: {
          label: 'Delete',
          onClick: () => {
            this.masterService.onDeleteUser(id).subscribe({
              next: () => {
                toast.success('User deleted successfully');
                this.loadUsers(); // refresh table
              },
              error: (err) => {
                toast.error('Delete failed', {
                  description: err.message || 'Something went wrong'
                });
              }
            });
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    );
  }


}