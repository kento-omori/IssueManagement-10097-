import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatingComponent } from './chating.component';

describe('ChatingComponent', () => {
  let component: ChatingComponent;
  let fixture: ComponentFixture<ChatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
