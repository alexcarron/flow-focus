import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatetimePopupComponent } from './datetime-popup.component';

describe('DatetimePopupComponent', () => {
  let component: DatetimePopupComponent;
  let fixture: ComponentFixture<DatetimePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatetimePopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatetimePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
