import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewLoanFormComponent } from './new-loan-form.component';

describe('NewLoanFormComponent', () => {
  let component: NewLoanFormComponent;
  let fixture: ComponentFixture<NewLoanFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLoanFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewLoanFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
