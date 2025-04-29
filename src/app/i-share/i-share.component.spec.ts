import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IShareComponent } from './i-share.component';

describe('IShareComponent', () => {
  let component: IShareComponent;
  let fixture: ComponentFixture<IShareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IShareComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IShareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
