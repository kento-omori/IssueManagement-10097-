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
  @Output() closed = new EventEmitter<void>();
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService
  ) {}

  // 初期化
  ngOnInit() {
    this.checkPermission();
  };

  // 通知許可状態の確認
  private checkPermission() {
    this.permissionGranted = this.isPermissionGranted();
    this.hasRequested = Notification.permission !== 'default';
  };

  // 通知許可状態の確認
  isPermissionGranted(): boolean {
    return Notification.permission === 'granted';
  }

  // 通知許可の要求
  async requestPermission() {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        this.errorMessage = 'ユーザーIDが取得できません';
        return;
      };
      const permissionPromise = Notification.requestPermission();
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('通知許可の応答がありません')), 5000)
      );
      const permission = await Promise.race([permissionPromise, timeoutPromise]);

      if (permission !== 'granted') {
        this.permissionGranted = false;
        this.hasRequested = true;
        this.errorMessage = '通知許可が得られませんでした。';
        return;
      }

      const token = await this.messagingService.requestPermissionAndSaveToken(userId);
      if (token) {
        this.permissionGranted = true;
        this.hasRequested = true;
        this.permissionRequested.emit();
      } else {
        this.permissionGranted = false;
        this.hasRequested = true;
        this.errorMessage = 'FCMトークンの取得に失敗しました。';
      }
    } catch (error: any) {
      this.permissionGranted = false;
      this.hasRequested = true;
      this.errorMessage = '通知が許可されませんでした。ブラウザの設定から許可を選択してください。: ' + (error.message || error);
      if (error.message && error.message.includes('通知許可の応答がありません')) {
        setTimeout(() => {
          this.closed.emit();
        }, 5000);
      }
    } finally {
      this.isLoading = false;
    }
  }

  async revokePermission() {
    this.isLoading = true;
    this.errorMessage = null;
    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        this.errorMessage = 'ユーザーIDが取得できません';
        return;
      };
      await this.messagingService.revokePermission(userId);

      const permissionPromise = Notification.requestPermission();
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('通知許可の応答がありません')), 5000)
      );
      const permission = await Promise.race([permissionPromise, timeoutPromise]);

      if (permission === 'denied') {
        this.errorMessage = '通知をブロックしました。';
        return;
      }else if (permission === 'granted') {
        this.errorMessage = '通知を許可しました。';
        await this.messagingService.requestPermissionAndSaveToken(userId)
        return;
      };

      this.permissionGranted = false;
      this.hasRequested = true;
      this.permissionRevoked.emit();
    } catch (error: any) {
      this.permissionGranted = false;
      this.hasRequested = true;
      this.errorMessage = '通知許可の解除に失敗しました。ブラウザの設定からブロックを選択してください。: ' + (error.message || error);
      if (error.message && error.message.includes('通知許可の応答がありません')) {
        setTimeout(() => {
          this.closed.emit();
        }, 5000);
      }
    } finally {
      this.isLoading = false;
    }
  }

  closeDialog() {
    this.closed.emit();
  }
}
