import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeNotificationComponent } from './home-notification.component';

describe('HomeNotificationComponent', () => {
  let component: HomeNotificationComponent;
  let fixture: ComponentFixture<HomeNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
