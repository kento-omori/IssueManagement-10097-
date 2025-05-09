import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NotificationData } from '../services/messaging.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-popup">
      <div *ngFor="let n of notifications" class="notification-item" [class.unread]="!n.read">
        <div class="fw-bold">{{ n.title }}</div>
        <div>{{ n.body }}</div>
        <div class="small text-secondary">{{ n.receivedAt | date:'yyyy/MM/dd HH:mm:ss' }}</div>
      </div>
      <button class="btn btn-link" (click)="markAllAsRead.emit()">すべて既読にする</button>
    </div>
  `,
  styles: [`
    .notification-popup { min-width: 300px; max-height: 400px; overflow-y: auto; background: #fff; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 1em; position: absolute; right: 0; top: 2.5em; z-index: 1000; }
    .notification-item { border-bottom: 1px solid #eee; padding: 0.5em 0; }
    .notification-item.unread { background: #e3f2fd; }
  `]
})
export class NotificationListComponent {
  @Input() notifications: NotificationData[] = [];
  @Output() markAllAsRead = new EventEmitter<void>();
}
