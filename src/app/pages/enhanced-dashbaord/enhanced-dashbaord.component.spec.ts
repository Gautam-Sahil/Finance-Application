import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnhancedDashboardComponent } from './enhanced-dashbaord.component';


describe('EnhancedDashbaordComponent', () => {
  let component: EnhancedDashboardComponent;
  let fixture: ComponentFixture<EnhancedDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnhancedDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnhancedDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
