import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NotificationData } from '../services/messaging.service';
import { CommonModule } from '@angular/common';
import { MessagingService } from '../services/messaging.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css']
})
export class NotificationListComponent implements OnInit {
  @Input() notifications: NotificationData[] = [];
  @Output() notificationClick = new EventEmitter<NotificationData>();
  @Output() markAllAsRead = new EventEmitter<void>();
  permissionGranted = false;

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkPermission();
  }

  // 通知が許可されているかNgOnInItで確認するロジック
  private checkPermission() {
    this.permissionGranted = Notification.permission === 'granted';
  }

  // 通知許可（通知を有効にするボタンを押したとき発火）
  async requestPermission() {
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        console.error('ユーザーIDが取得できません');
        return;
      }

      // ブラウザの通知許可ダイアログを表示
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.messagingService.requestPermissionAndSaveToken(userId);
        this.permissionGranted = true;
        console.log('通知許可状態:', this.permissionGranted);
      } else {
        console.log('通知が許可されませんでした:', permission);
        this.permissionGranted = false;
        alert('通知の設定を変更するには、ブラウザの通知の設定を変更してください：\n\n' +
              '設定を変更後、ページを再読み込みしてください。');
      }
    } catch (error) {
      console.error('通知の許可に失敗しました:', error);
      this.permissionGranted = false;
      alert('通知の設定を変更するには、ブラウザの通知の設定を変更してください：\n\n' +
            '設定を変更後、ページを再読み込みしてください。');
    }
  }

  // 通知拒否（通知を無効にするボタンを押したとき発火）
  async revokePermission() {
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        console.error('ユーザーIDが取得できません');
        return;
      }

      // 通知の許可状態をリセット
      if ('permissions' in navigator && 'revoke' in (navigator as any).permissions) {
        try {
          await (navigator as any).permissions.revoke({ name: 'notifications' });
          console.log('通知の許可状態をリセットしました');
        } catch (revokeError) {
          console.error('通知の許可状態のリセットに失敗しました:', revokeError);
        }
      } else {
        console.log('このブラウザでは通知の許可状態のリセットがサポートされていません');
        alert('通知の設定を変更するには、ブラウザの通知の設定を変更してください：\n\n' +
              '設定を変更後、ページを再読み込みしてください。');
      }

      // 通知の許可状態をdefaultに戻す
      try {
        await Notification.requestPermission();
        console.log('通知の許可状態をdefaultに戻しました');
      } catch (error) {
        console.error('通知の許可状態のリセットに失敗しました:', error);
      }

      await this.messagingService.revokePermission(userId);
      this.permissionGranted = false;
      console.log('通知許可状態:', this.permissionGranted);
    } catch (error) {
      console.error('通知の無効化に失敗しました:', error);
    }
  }

  // ベルマークをクリックしたときの処理
  onNotificationClick(notification: NotificationData) {
    this.notificationClick.emit(notification);
  }
}
