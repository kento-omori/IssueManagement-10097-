import { TestBed } from '@angular/core/testing';

import { SharedTodoGanttService } from './shared-todo-gantt.service';

describe('SharedTodoGanttService', () => {
  let service: SharedTodoGanttService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharedTodoGanttService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
