import { Component } from '@angular/core';
import { MessagingService } from '../services/messaging.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-notification-permission',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-permission.component.html',
  styleUrl: './notification-permission.component.css'
})
export class NotificationPermissionComponent {
  permissionRequested = false;
  permissionGranted = false;
  userId: string | null = null;
  constructor(private messagingService: MessagingService, private userservice : UserService) {}

  async requestPermission() {
    this.permissionRequested = true;
    this.userId = this.userservice.getCurrentUserId();
    if (this.userId) {
      const token = await this.messagingService.requestPermissionAndSaveToken(this.userId);
      if (token) {
        this.permissionGranted = true;
        localStorage.setItem('fcmPermission', 'granted');
        // 必要ならサーバーにトークン送信
      } else {
        this.permissionGranted = false;
        console.log('通知許可が拒否されました');
      };
    };
};

  static isPermissionGranted(): boolean {
    return localStorage.getItem('fcmPermission') === 'granted';
  }
}
