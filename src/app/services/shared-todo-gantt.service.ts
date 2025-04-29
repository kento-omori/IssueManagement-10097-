import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface GanttTask {
  id: number;
  managementNumber: number;
  text: string;
  category: string;
  start_date: string;
  end_date: string;
  assignee: string;
  status: string;
  priority: string;
}

@Injectable({
  providedIn: 'root'
})
export class SharedTodoGanttService {
  private tasksSubject = new BehaviorSubject<GanttTask[]>([]);
  tasks$ = this.tasksSubject.asObservable();

  setTasks(tasks: GanttTask[]) {
    this.tasksSubject.next(tasks);
    // 最大値を更新
  }
}

