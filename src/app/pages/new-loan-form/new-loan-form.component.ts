import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MasterService } from '../../service/master.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-new-loan-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, CommonModule],
  templateUrl: './new-loan-form.component.html',
  styleUrls: ['./new-loan-form.component.css']
})
export class NewLoanFormComponent implements OnInit {

  // 🔹 injections
  private fb = inject(FormBuilder);
  private masterService = inject(MasterService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  selectedFile: File | null = null;

  // 🔹 form & state
  loanForm!: FormGroup;
  applicationId: string | null = null;

  // 🔹 lifecycle
  ngOnInit(): void {
    this.initializeForm();

    // 👉 read query param (?id=xxxx)
    this.applicationId = this.route.snapshot.queryParamMap.get('id');

    if (this.applicationId) {
      this.fetchApplicationData(this.applicationId);
    }
  }

  // =========================
  // FORM SETUP
  // =========================

  initializeForm() {
    this.loanForm = this.fb.group({
      fullName: ['', [  Validators.minLength(3)]],
      email: ['', [  Validators.email]],
      mobileNumber: ['', [  Validators.pattern('^[0-9]{10}$')]],
      dateOfBirth: ['',   ],
      panCard: ['', [  Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]],
      salary: ['', [  Validators.min(0)]],
      employmentStatus: ['',   ],
      applicationStatus: ['pending',   ],
      creditScore: ['', [  Validators.min(300), Validators.max(900)]],
      assets: ['',   ],
      address: ['',   ],
      city: ['',   ],
      state: ['',   ],
      zipCode: ['', [  Validators.pattern('^[0-9]{5,6}$')]],
      docPath: [''],
      loans: this.fb.array([])
    });
  }

  // =========================
  // GETTERS
  // =========================

  get loans(): FormArray {
    return this.loanForm.get('loans') as FormArray;
  }

  getControl(name: string) {
    return this.loanForm.get(name);
  }

  // =========================
  // LOAN FORM ARRAY
  // =========================

  createLoanGroup(bank: string, amount: number, emi: number): FormGroup {
    return this.fb.group({
      bankName: [bank,   ],
      loanAmount: [amount, [  Validators.min(1000)]],
      emi: [emi, [  Validators.min(500)]]
    });
  }

  addLoan(bank: HTMLInputElement, amount: HTMLInputElement, emi: HTMLInputElement) {
    if (bank.value && Number(amount.value) >= 1000 && Number(emi.value) >= 500) {
      this.loans.push(
        this.createLoanGroup(bank.value, Number(amount.value), Number(emi.value))
      );
      bank.value = '';
      amount.value = '';
      emi.value = '';
    } else {
     toast.info('Please enter valid loan details');
    }
  }

  removeLoan(index: number) {
    this.loans.removeAt(index);
  }

  onFileSelected(event: any) {
  this.selectedFile = event.target.files[0];
}


// 2. Update the upload() method to update the form's docPath
upload() {
  if (!this.selectedFile || !this.applicationId) {
    toast.error('Missing File', { description: 'Please select a file first.' });
    return;
  }

  this.masterService.uploadDocument(this.applicationId, this.selectedFile).subscribe({
    next: (res: any) => {
      // 🟢 Update the form value so the "View PDF" button shows up immediately
      this.loanForm.get('docPath')?.setValue(res.path);
      toast.success('Document Uploaded Successfully!');
    },
    error: (err) => toast.error('Upload failed')
  });
}

  // =========================
  // EDIT MODE
  // =========================

fetchApplicationData(id: string) {
  this.masterService.getLoanById(id).subscribe({
    next: (res: any) => {
      this.applicationId = res._id; 

      // Ensure docPath exists in the form
      this.loanForm.patchValue({
        ...res,
        docPath: res.docPath || ''
      });

      // Patch loans array
      this.loans.clear();
      if (res.loans) {
        res.loans.forEach((loan: any) => {
          this.loans.push(this.createLoanGroup(loan.bankName, loan.loanAmount, loan.emi));
        });
      }
    },
    error: (err) => toast.warning('Failed to load application data')
  });
}

  // =========================
  // SUBMIT (SAVE / UPDATE)
  // =========================

  submit() {
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
   toast.warning('Incomplete Form', {
      description: 'Please fill in all required fields.'
    });
      return;
    }

    if (this.applicationId) {
      // 🔁 UPDATE
      this.masterService.onUpdateLoan(this.applicationId, this.loanForm.value)
        .subscribe({
          next: () => {
            toast.success('Application saved sussfully'),
            this.router.navigateByUrl('/loan-application-list');
          },
          error: (err) => {
            console.error(err);
           toast.error('Server connection failed')
          }
        });

    } else {
      // 💾 SAVE
      this.masterService.onSaveLoan(this.loanForm.value)
        .subscribe({
          next: () => {
           toast.success('Application succussefully'),
            this.loanForm.reset({ applicationStatus: 'pending' });
            this.loans.clear();
          },
          error: (err) => {
            console.error(err);
           toast.error('Failed to save');
          }
        });
        console.log("Current Application ID being sent to server:", this.applicationId);
    }
  }

onDelete() {
  if (!this.applicationId) {
    toast.info("No application selected to delete.");
    return;
  }

  toast(
    'Are you sure?',
    {
      description: 'This action will permanently delete the application.',
      action: {
        label: 'Delete',
        onClick: () => {
          this.masterService.onDeleteLoan(this.applicationId!).subscribe({
            next: () => {
              toast.success('Deleted', {
                description: 'The record was removed successfully'
              });
              this.router.navigateByUrl('/loan-application-list');
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