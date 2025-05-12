import { Component, OnInit } from '@angular/core';
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
          メール内のリンクをクリックして、登録を完了してください。
          この画面は一度しか表示されません。間違えて消した場合は、
          メール確認後、ログイン画面からログインしてください。
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
export class VerifyEmailComponent implements OnInit {
  isVerified = false;
  isChecking = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.checkVerification();
  }

  async checkVerification() {
    this.isChecking = true;
    this.errorMessage = '';

    try {
      const isVerified = await this.authService.checkEmailVerification();
      if (isVerified) {
        this.isVerified = true;
        const user = this.authService.getCurrentUser();
        
        if (!user) {
          throw new Error('ユーザー情報の取得に失敗しました');
        }

        // ユーザープロフィールを保存
        const userProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || '',
          createdAt: new Date()
        };
        
        await this.userService.createUserProfile(userProfile);
        console.log('ユーザープロフィールを保存しました');
        
        // ユーザーのホーム画面に遷移
        await this.router.navigate(['users', user.uid, 'home']);
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