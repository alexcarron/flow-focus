import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusPageComponent } from './focus-page.component';

describe('FocusPageComponent', () => {
  let component: FocusPageComponent;
  let fixture: ComponentFixture<FocusPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FocusPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FocusPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
