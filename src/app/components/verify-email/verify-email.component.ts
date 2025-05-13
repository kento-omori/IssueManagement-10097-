import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <div class="alert" [ngClass]="{'alert-info': !isVerified, 'alert-success': isVerified}">
        <h4>{{ isVerified ? 'メール確認が完了しました' : 'メール確認が必要です' }}</h4>
        <p *ngIf="!isVerified">
          登録したメールアドレスに確認メールを送信しました。<br>
          メール内のリンクをクリックして、登録を完了してください。<br>
          自動的に確認を行います。しばらくお待ちください。<br>
          <small class="text-muted">
            ※この画面を閉じた場合や、5分以上経過した場合は、<br>
            　ログイン画面から通常通りログインできます（メール確認が完了していれば）
          </small>
        </p>
        <p *ngIf="isVerified">
          メール確認が完了しました。ホーム画面に移動します。
        </p>
        <div *ngIf="errorMessage" class="alert alert-danger mt-3">
          {{ errorMessage }}
        </div>
        <button class="btn btn-primary" (click)="checkVerification()" [disabled]="isChecking">
          {{ isChecking ? '確認中...' : '確認する' }}
        </button>
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  isVerified = false;
  isChecking = false;
  errorMessage = '';
  private checkInterval: any;
  private maxAttempts = 30; // 最大30回（5分間）確認を試みる
  private currentAttempt = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    // 初回の確認を実行
    this.checkVerification();
    
    // 10秒ごとに確認を実行
    this.checkInterval = setInterval(() => {
      if (!this.isVerified && this.currentAttempt < this.maxAttempts) {
        this.currentAttempt++;
        this.checkVerification();
      } else if (this.currentAttempt >= this.maxAttempts) {
        clearInterval(this.checkInterval);
        this.errorMessage = '確認がタイムアウトしました。「確認する」ボタンをクリックしてください。';
      }
    }, 10000); // 10秒ごとに確認
  }

  ngOnDestroy() {
    // コンポーネントが破棄される際にインターバルをクリア
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  async checkVerification() {
    if (this.isChecking) return; // 既に確認中の場合は処理をスキップ
    
    this.isChecking = true;
    this.errorMessage = '';

    try {
      console.log('メール確認チェックを開始します');
      const isVerified = await this.authService.checkEmailVerification();
      console.log('メール確認状態:', isVerified);

      if (isVerified) {
        this.isVerified = true;
        const user = this.authService.getCurrentUser();
        
        if (!user) {
          console.error('ユーザー情報の取得に失敗しました');
          this.errorMessage = 'ログインに失敗しました。ログイン画面から再度ログインしてください。';
          return;
        }

        // ユーザープロフィールを保存
        const userProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || '',
          createdAt: new Date()
        };
        
        await this.userService.createUserProfile(userProfile);
        console.log('ユーザープロフィールの保存が完了しました');
        
        // インターバルをクリア
        if (this.checkInterval) {
          clearInterval(this.checkInterval);
        }
        
        // ユーザーのホーム画面に遷移
        console.log('ホーム画面への遷移を試みます');
        try {
          const navigationResult = await this.router.navigate(['users', user.uid, 'home']);
          
          if (!navigationResult) {
            throw new Error('画面遷移に失敗しました');
          }
        } catch (navError) {
          console.error('画面遷移エラー:', navError);
          this.errorMessage = '画面遷移に失敗しました。手動でホーム画面に移動してください。';
        }
      }
    } catch (error: any) {
      console.error('メール確認チェック中にエラーが発生しました:', error);
      if (error.message === 'インターネット接続を確認してください。') {
        this.errorMessage = 'インターネット接続を確認してください。接続を確認後、もう一度お試しください。';
      } else {
        this.errorMessage = error.message || 'エラーが発生しました。もう一度お試しください。';
      }
    } finally {
      this.isChecking = false;
    }
  }
}