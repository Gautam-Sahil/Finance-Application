import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanApplicationlistComponent } from './loan-applicationlist.component';

describe('LoanApplicationlistComponent', () => {
  let component: LoanApplicationlistComponent;
  let fixture: ComponentFixture<LoanApplicationlistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanApplicationlistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanApplicationlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
