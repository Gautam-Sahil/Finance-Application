import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportTicketListComponent } from './support-ticket-list.component';



describe('SupportTicketComponent', () => {
  let component: SupportTicketListComponent;
  let fixture: ComponentFixture<SupportTicketListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupportTicketListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupportTicketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
