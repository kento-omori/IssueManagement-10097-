import { TestBed } from '@angular/core/testing';

import { TasklistFirestoreService } from './tasklist-firestore.service';

describe('TasklistFirestoreService', () => {
  let service: TasklistFirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TasklistFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
