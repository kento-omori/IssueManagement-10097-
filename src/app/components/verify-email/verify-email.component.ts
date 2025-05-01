import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <div class="alert alert-info">
        <h4>メール確認が必要です</h4>
        <p>登録したメールアドレスに確認メールを送信しました。</p>
        <p>メール内のリンクをクリックして、登録を完了してください。</p>
        <button class="btn btn-primary" (click)="checkVerification()">
          登録完了後、ボタンを押すとホーム画面に遷移します。
        </button>
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkVerification();
  }

  async checkVerification() {
    const isVerified = await this.authService.checkEmailVerification();
    if (isVerified) {
      // メール確認完了後、ホーム画面に遷移
      this.router.navigate(['/home']);
    }
  }
}