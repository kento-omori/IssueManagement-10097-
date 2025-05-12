import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Todo } from '../todo/todo.interface';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { NavigationService } from '../services/navigation.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

export interface Notification extends Todo {
  projectName?: string;
  pjid?: string | null;
}
interface WeekNotification extends Notification {
  lastDays?: number;
}
interface ExpiredNotification extends Notification {
  expiredDays?: number;
}

@Component({
  selector: 'app-home-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-notification.component.html',
  styleUrl: './home-notification.component.css'
})
export class HomeNotificationComponent implements OnInit {
    todos: Notification[] = [];
    notification: Notification[] = [];
    todayNotification: Notification[] = [];
    weekNotification: WeekNotification[] = [];
    expiredNotification: ExpiredNotification[] = [];
    lastDays: number = 0;
  
    constructor(
      private todoFirestoreService: TodoFirestoreService, 
      private navigationService: NavigationService,
      private userService: UserService,
      private router: Router
    ) {}
  
    ngOnInit(): void {
      const userId = this.navigationService.selectedUserIdSource.getValue();
      if (userId) {
        this.userService.getUserById(userId).then((userProfile) => {
          const userDisplayName = userProfile?.displayName || '';
          this.todoFirestoreService.getAllTodosForUserRealtime(userId, userDisplayName).subscribe({
            next: (todos: Todo[]) => {
        // progressを100倍して新しい配列を作成
        this.notification = todos.map(todo => ({
          ...todo,
          progress: (todo.progress || 0) * 100
        }));
            this.getTodayNotification();
            this.getWeekNotification();
            this.getExpiredNotification();
            }
          });
        });
      }
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

    goTodo(todo: Notification) {
      const userId = this.navigationService.selectedUserIdSource.getValue();
      if (todo.projectName === '個人ワークスペース') {
        // 個人TODO
        this.router.navigate([`/users/${userId}/todo`]);
      } else if (todo.pjid) {
        // プロジェクトTODO
        this.navigationService.setSelectedProjectId(todo.pjid);
        // 少し待ってから遷移
        setTimeout(() => {
          this.router.navigate([`/projects/${todo.pjid}/todo`]);
        }, 100);
      }
    }
}
