import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectBaseComponent } from './project-base.component';

describe('ProjectBaseComponent', () => {
  let component: ProjectBaseComponent;
  let fixture: ComponentFixture<ProjectBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectBaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
