import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MasterService } from '../../service/master.service';
import { toast } from 'ngx-sonner';
import { environment } from '../../../environments/environment.prod';

@Component({
  selector: 'app-new-loan-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, CommonModule, FormsModule],
  templateUrl: './new-loan-form.component.html',
  styleUrls: ['./new-loan-form.component.css']
})
export class NewLoanFormComponent implements OnInit {
  // Services
  private fb = inject(FormBuilder);
  private masterService = inject(MasterService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected readonly serverUrl = environment.apiUrl.replace('/api', '');

  // Form
  loanForm!: FormGroup;
  applicationId: string | null = null;

  // Documents
  documents: any[] = [];
  selectedFiles: File[] = [];          // 🔸 for new applications – auto-upload on save
  isUploading = false;                // 🔸 to disable save while uploading

  // Review
  reviewHistory: any[] = [];
  isBankerOrAdmin = false;

  // Approval modals
  approvalRemarks = '';
  rejectionReason = '';
  private approveModal: any;
  private rejectModal: any;

  ngOnInit(): void {
    this.initializeForm();
    this.applicationId = this.route.snapshot.queryParamMap.get('id');
    if (this.applicationId) {
      this.fetchApplicationData(this.applicationId);
    }
    this.checkUserRole();
    this.loadReviewHistory();
  }

  // ============================================
  //  FORM INIT
  // ============================================
  initializeForm() {
    this.loanForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      dateOfBirth: [''],
      panCard: ['', [Validators.required, Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]],
      salary: ['', [Validators.required, Validators.min(0)]],
      employmentStatus: ['', Validators.required],
      applicationStatus: ['pending'],
      creditScore: ['', [Validators.min(300), Validators.max(900)]],
      assets: [''],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{5,6}$')]],
      docPath: [''],
      loans: this.fb.array([])
    });
  }

  get loans(): FormArray { return this.loanForm.get('loans') as FormArray; }
  getControl(name: string) { return this.loanForm.get(name); }

  // ============================================
  //  LOAN DETAILS (FormArray)
  // ============================================
  createLoanGroup(bank: string, amount: number, emi: number): FormGroup {
    return this.fb.group({
      bankName: [bank, Validators.required],
      loanAmount: [amount, [Validators.required, Validators.min(1000)]],
      emi: [emi, [Validators.required, Validators.min(500)]]
    });
  }

  addLoan(bank: HTMLInputElement, amount: HTMLInputElement, emi: HTMLInputElement) {
    if (bank.value && Number(amount.value) >= 1000 && Number(emi.value) >= 500) {
      this.loans.push(this.createLoanGroup(bank.value, Number(amount.value), Number(emi.value)));
      bank.value = ''; amount.value = ''; emi.value = '';
    } else {
      toast.info('Please enter valid loan details');
    }
  }

  removeLoan(index: number) { this.loans.removeAt(index); }

  // ============================================
  //  DOCUMENTS – NEW WORKFLOW
  // ============================================
  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    for (let i = 0; i < files.length; i++) {
      this.selectedFiles.push(files[i]);
    }
    // Optional: show preview list
    if (this.selectedFiles.length) {
      toast.info(`${this.selectedFiles.length} file(s) ready to upload on save`);
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  // Manual upload for EXISTING applications only
 uploadManual(fileInput: HTMLInputElement) {
  if (!this.applicationId) {
    toast.warning('Save the application first, then upload documents.');
    return;
  }
  const file = fileInput.files?.[0];
  if (!file) return;

  this.masterService.uploadDocument(this.applicationId!, file).subscribe({
    next: (res: any) => {
      // ✅ res.doc is the document object returned by server
      if (res.doc) {
        this.documents.push(res.doc);
        toast.success('Document uploaded');
      } else {
        // Fallback (should not happen now)
        toast.warning('Upload successful but document list may not update');
      }
      fileInput.value = '';
    },
    error: (err) => {
      console.error('Upload error:', err);
      toast.error('Upload failed', { description: err.error?.message || 'Server error' });
    }
  });
}
  // ============================================
  //  SUBMIT (SAVE / UPDATE) – WITH AUTO-UPLOAD
  // ============================================
  submit() {
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      toast.warning('Please fill all required fields');
      return;
    }

    if (this.applicationId) {
      // 🔁 UPDATE – no file upload here
      this.masterService.onUpdateLoan(this.applicationId, this.loanForm.value).subscribe({
        next: () => {
          toast.success('Application updated');
          this.router.navigateByUrl('/loan-application-list');
        },
        error: () => toast.error('Update failed')
      });
    } else {
      // 💾 NEW – Save application, then upload all selected files
      this.isUploading = true;
      this.masterService.onSaveLoan(this.loanForm.value).subscribe({
        next: (res: any) => {
          const newId = res.data._id;
          this.applicationId = newId;
          this.loanForm.patchValue({ applicationStatus: 'pending' });

          if (this.selectedFiles.length === 0) {
            toast.success('Application saved');
            this.router.navigateByUrl('/loan-application-list');
            return;
          }

          // Upload all selected files sequentially
          // Upload all selected files sequentially
let completed = 0;
this.selectedFiles.forEach((file, index) => {
  this.masterService.uploadDocument(newId, file).subscribe({
    next: (uploadRes: any) => {
      if (uploadRes.doc) {
        this.documents.push(uploadRes.doc);
      }
      completed++;
      if (completed === this.selectedFiles.length) {
        toast.success(`${completed} document(s) uploaded`);
        this.selectedFiles = [];
        this.isUploading = false;
        this.router.navigateByUrl('/loan-application-list');
      }
    },
    error: () => {
      toast.error(`Failed to upload ${file.name}`);
      completed++;
      if (completed === this.selectedFiles.length) {
        this.isUploading = false;
      }
    }
  });
});
        },
        error: () => {
          toast.error('Failed to save application');
          this.isUploading = false;
        }
      });
    }
  }

  // ============================================
  //  DELETE
  // ============================================
  onDelete() {
    if (!this.applicationId) return;
    toast('Permanently delete?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: () => {
          this.masterService.onDeleteLoan(this.applicationId!).subscribe({
            next: () => {
              toast.success('Deleted');
              this.router.navigateByUrl('/loan-application-list');
            },
            error: () => toast.error('Delete failed')
          });
        }
      },
      cancel: { label: 'Cancel' }
    });
  }

  // ============================================
  //  EDIT MODE – LOAD DATA
  // ============================================
  fetchApplicationData(id: string) {
    this.masterService.getLoanById(id).subscribe({
      next: (res: any) => {
        this.applicationId = res._id;
        this.loanForm.patchValue({ ...res, docPath: res.docPath || '' });
        this.documents = res.documents || [];
        this.reviewHistory = res.reviewHistory || [];

        this.loans.clear();
        if (res.loans) {
          res.loans.forEach((loan: any) => {
            this.loans.push(this.createLoanGroup(loan.bankName, loan.loanAmount, loan.emi));
          });
        }

        if (!this.isBankerOrAdmin && res.applicationStatus !== 'pending') {
          this.loanForm.disable();
        }
      },
      error: () => toast.warning('Failed to load application')
    });
  }

  // ============================================
  //  ROLE & PERMISSIONS
  // ============================================
  checkUserRole(): void {
    const userStr = localStorage.getItem('loanUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.isBankerOrAdmin = ['Admin', 'Banker'].includes(user.role);
    }
  }

  canUpload(): boolean {
    if (!this.applicationId) return false; // new app – use auto-upload only
    const status = this.loanForm.get('applicationStatus')?.value;
    return this.isBankerOrAdmin || status === 'pending';
  }

  // ============================================
  //  DOCUMENT VERIFICATION (Banker/Admin)
  // ============================================
  verifyDocument(docIndex: number) {
    if (!this.isBankerOrAdmin) {
      toast.error('Only bankers can verify documents');
      return;
    }
    this.masterService.verifyDocument(this.applicationId!, docIndex).subscribe({
      next: (res: any) => {
        this.documents[docIndex] = res.document;
        this.loadReviewHistory();
        toast.success('Document verified');
      },
      error: () => toast.error('Verification failed')
    });
  }

  // ============================================
  //  APPROVAL WORKFLOW (Banker/Admin)
  // ============================================
openApprovalModal() {
  this.approvalRemarks = '';
  const modalElement = document.getElementById('approveModal');
  if (modalElement) {
    this.approveModal = new (window as any).bootstrap.Modal(modalElement);
    this.approveModal.show();
  }
}

  openRejectionModal() {
    this.rejectionReason = '';
    this.rejectModal = new (window as any).bootstrap.Modal(document.getElementById('rejectModal'));
    this.rejectModal.show();
  }

  approveApplication() {
    this.masterService.approveLoan(this.applicationId!, { remarks: this.approvalRemarks }).subscribe({
      next: () => {
        toast.success('Application approved');
        this.loanForm.patchValue({ applicationStatus: 'approved' });
        this.approveModal.hide();
        this.loadReviewHistory();
      },
      error: (err) => {
        console.error(err);
        toast.error('Approval failed', { description: err.error?.message });
      }
    });
  }

  rejectApplication() {
    if (!this.rejectionReason.trim()) {
      toast.warning('Rejection reason required');
      return;
    }
    this.masterService.rejectLoan(this.applicationId!, { reason: this.rejectionReason }).subscribe({
      next: () => {
        toast.success('Application rejected');
        this.loanForm.patchValue({ applicationStatus: 'rejected' });
        this.rejectModal.hide();
        this.loadReviewHistory();
      },
      error: (err) => {
        console.error(err);
        toast.error('Rejection failed', { description: err.error?.message });
      }
    });
  }

  requestRevision() {
    // Optional: implement later
  }

  // ============================================
  //  REVIEW HISTORY
  // ============================================
loadReviewHistory() {
  if (this.applicationId) {
    console.log('Loading review history for:', this.applicationId);
    this.masterService.getReviewHistory(this.applicationId).subscribe({
      next: (res) => {
        console.log('Review history received:', res);
        this.reviewHistory = res;
      },
      error: (err) => {
        console.error('Could not load review history', err);
      }
    });
  }
}
  // ============================================
  //  UI HELPERS
  // ============================================
  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success';
      case 'rejected': return 'bg-danger';
      case 'pending': return 'bg-warning text-dark';
      case 'done': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  }

  statusIconClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bi bi-check-circle';
      case 'rejected': return 'bi bi-x-circle';
      case 'pending': return 'bi bi-hourglass-split';
      case 'done': return 'bi bi-check2-all';
      default: return 'bi bi-question-circle';
    }
  }

  timelineIcon(action: string): string {
    switch (action) {
      case 'submitted': return 'bi bi-send';
      case 'doc_verified': return 'bi bi-check2';
      case 'approved': return 'bi bi-check-circle';
      case 'rejected': return 'bi bi-x-circle';
      case 'revision_requested': return 'bi bi-arrow-return-left';
      default: return 'bi bi-record';
    }
  }
}