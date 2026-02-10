import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankerListComponent } from './banker-list.component';

describe('BankerListComponent', () => {
  let component: BankerListComponent;
  let fixture: ComponentFixture<BankerListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankerListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
