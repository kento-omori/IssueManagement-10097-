import { Component, OnInit } from '@angular/core';
import { Todo } from '../todo/todo.interface';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface WeekNotification extends Todo {
  lastDays?: number;
}

interface ExpiredNotification extends Todo {
  expiredDays?: number;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit {
  todos: Todo[] = [];
  notification: Todo[] = [];
  todayNotification: Todo[] = [];
  weekNotification: WeekNotification[] = [];
  expiredNotification: ExpiredNotification[] = [];
  lastDays: number = 0;

  constructor(private todoFirestoreService: TodoFirestoreService) {}

  ngOnInit(): void {
    this.todoFirestoreService.getTodos().subscribe((todos) => {
      // progressを100倍して新しい配列を作成
      this.notification = todos.map(todo => ({
        ...todo,
        progress: (todo.progress || 0) * 100
      }));
      
      this.getTodayNotification();
      this.getWeekNotification();
      this.getExpiredNotification();
    });
  }

  // 今日が期限のタスクを抽出
  getTodayNotification() {
    this.todayNotification = this.notification.filter(todo =>
      todo.status !== '完了'
      && todo.end_date === new Date().toISOString().split('T')[0]);
  }

  // 今週が期限のタスクを抽出
  getWeekNotification() {
    this.weekNotification = this.notification.filter(todo =>
      todo.status !== '完了'
      && todo.end_date >= new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] 
      && todo.end_date <= new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]);
    // 残り日数
    this.weekNotification = this.weekNotification.map(todo => {
      const endDate = new Date(todo.end_date);
      const today = new Date();
      const lastDays = endDate.getDate() - today.getDate();
      return {
        ...todo,
        lastDays: lastDays
      };
    });
  }

  // 期限切れのタスクを抽出
  getExpiredNotification() {
    this.expiredNotification = this.notification.filter(todo =>
      todo.status !== '完了'
      && todo.end_date < new Date().toISOString().split('T')[0]);
    // 経過日数
    this.expiredNotification = this.expiredNotification.map(todo => {
      const endDate = new Date(todo.end_date);
      const today = new Date();
      const expiredDays = today.getDate() - endDate.getDate();
      return {
        ...todo,
        expiredDays: expiredDays
      };
    });
  }
}
