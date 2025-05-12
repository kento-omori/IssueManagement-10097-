import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagingService } from '../services/messaging.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-notification-permission',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-permission.component.html',
  styleUrls: ['./notification-permission.component.css']
})
export class NotificationPermissionComponent implements OnInit {
  @Input() permissionGranted = false;
  @Input() hasRequested = false;
  @Output() permissionRequested = new EventEmitter<void>();
  @Output() permissionRevoked = new EventEmitter<void>();
  isLoading = false;  // ローディング状態を追加

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkPermission();
  }

  private checkPermission() {
    this.permissionGranted = this.isPermissionGranted();
    this.hasRequested = Notification.permission !== 'default';
  }

  isPermissionGranted(): boolean {
    return Notification.permission === 'granted';
  }

  async requestPermission() {
    this.isLoading = true;  // ローディング開始
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        console.error('ユーザーIDが取得できません');
        return;
      }
      const token = await this.messagingService.requestPermissionAndSaveToken(userId);
      if (token) {
        this.permissionGranted = true;
        this.hasRequested = true;
        this.permissionRequested.emit();
      } else {
        // FCMトークン取得に失敗した場合
        this.permissionGranted = false;
        this.hasRequested = false;
      }
    } catch (error) {
      console.error('通知の許可に失敗しました:', error);
      this.permissionGranted = false;
      this.hasRequested = false;
    } finally {
      this.isLoading = false;  // ローディング終了
    }
  }

  async revokePermission() {
    this.isLoading = true;  // ローディング開始
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        console.error('ユーザーIDが取得できません');
        return;
      }
      await this.messagingService.revokePermission(userId);
      // 通知の許可状態をリセット（ブラウザの設定をリセット）
      if ('permissions' in navigator) {
        try {
          await (navigator as any).permissions.revoke({ name: 'notifications' });
        } catch (revokeError) {
          console.error('通知の許可状態のリセットに失敗しました:', revokeError);
        }
      }
      this.permissionGranted = false;
      this.hasRequested = true;  // ユーザーが明示的に無効化した場合はtrueのまま
      this.permissionRevoked.emit();
    } catch (error) {
      console.error('通知の無効化に失敗しました:', error);
      this.permissionGranted = false;
      this.hasRequested = false;  // エラー時のみfalseに設定
    } finally {
      this.isLoading = false;  // ローディング終了
    }
  }
}
