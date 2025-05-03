import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IdManagerService {
  private currentIdSubject = new BehaviorSubject<number>(0);
  private lastAssignedId = 0;
  private deletedIds: Set<number> = new Set();
  currentId$ = this.currentIdSubject.asObservable();

  constructor() {}

  getCurrentId(): number {
    return this.lastAssignedId;
  }

  getNextId(): number {
    // 削除されたIDの中で最小のものがあれば、それを使用
    if (this.deletedIds.size > 0) {
      const nextId = Math.min(...Array.from(this.deletedIds));
      this.deletedIds.delete(nextId);
      this.currentIdSubject.next(nextId);
      return nextId;
    }
    // なければ新しいIDを生成
    this.lastAssignedId++;
    this.currentIdSubject.next(this.lastAssignedId);
    return this.lastAssignedId;
  }

  peekNextId(): number {
    // 削除されたIDの中で最小のものがあれば、それを返す
    if (this.deletedIds.size > 0) {
      return Math.min(...Array.from(this.deletedIds));
    }
    // なければ次の新しいID
    return this.lastAssignedId + 1;
  }

  setCurrentId(id: number) {
    if (id > this.lastAssignedId) {
      this.lastAssignedId = id;
      this.currentIdSubject.next(id);
    }
  }

  deleteId(id: number) {
    if (id <= this.lastAssignedId && !this.deletedIds.has(id)) {
      this.deletedIds.add(id);
      this.currentIdSubject.next(this.peekNextId());
    }
  }

} 