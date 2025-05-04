import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentIShareComponent } from './parent-i-share.component';

describe('ParentIShareComponent', () => {
  let component: ParentIShareComponent;
  let fixture: ComponentFixture<ParentIShareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentIShareComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParentIShareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
