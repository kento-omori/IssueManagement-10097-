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
  hasRequested = false;  // 通知の許可を要求したかどうか

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkPermission();
  }

  // 通知が許可されているか確認するロジック
  private checkPermission() {
    const permission = Notification.permission;
    this.hasRequested = permission !== 'default';
    this.permissionGranted = permission === 'granted';
    console.log('通知の許可状態:', permission);
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
      this.hasRequested = true;
      
      if (permission === 'granted') {
      await this.messagingService.requestPermissionAndSaveToken(userId);
      this.permissionGranted = true;
        console.log('通知が許可されました');
      } else {
        this.permissionGranted = false;
        console.log('通知が許可されませんでした:', permission);
        alert('通知の設定を変更するには、ブラウザで通知設定を行ってください：\n\n' +
              '1. ブラウザの設定から通知を許可してください\n' +
              '2. 設定を変更後、このページを再読み込みしてください');
      }
    } catch (error) {
      console.error('通知の許可に失敗しました:', error);
      this.permissionGranted = false;
      alert('通知の設定を変更するには、ブラウザで通知設定を行ってください：\n\n' +
            '1. ブラウザの設定から通知を許可してください\n' +
            '2. 設定を変更後、このページを再読み込みしてください');
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

      const currentPermission = Notification.permission;
      console.log('現在の通知の許可状態:', currentPermission);

      if (currentPermission === 'granted') {
        // 通知の設定を変更するようにユーザーに案内
        alert('通知の設定を変更するには、ブラウザで通知設定を行ってください：\n\n' +
              '1. ブラウザの設定を開く\n' +
              '2. 通知設定を「ブロック」に変更\n' +
              '3. 設定を変更後、このページを再読み込みしてください\n\n' +
              '※設定を変更しない場合、通知は引き続き受信されます');

        // トークンの削除は行わない（ブラウザの設定変更後に再読み込みで処理）
        console.log('通知設定の変更を待機中...');
      } else {
        console.log('通知は既に無効化されています');
      }

    } catch (error) {
      console.error('通知の無効化に失敗しました:', error);
    }
  }

  // ベルマークをクリックしたときの処理
  onNotificationClick(notification: NotificationData) {
    this.notificationClick.emit(notification);
  }

  // すべての通知を既読にする
  onMarkAllAsRead() {
    try {
      this.markAllAsRead.emit();
      console.log('markAllAsReadイベントを発火しました');
    } catch (error) {
      console.error('markAllAsReadイベントの発火に失敗しました:', error);
    }
  }
}
