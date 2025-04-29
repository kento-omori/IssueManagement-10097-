import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h3 class="mb-0">新規登録</h3>
            </div>
            <div class="card-body">
              <form (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label for="displayName" class="form-label">ユーザー名</label>
                  <input
                    type="text"
                    class="form-control"
                    id="displayName"
                    [(ngModel)]="displayName"
                    name="displayName"
                    required
                  >
                </div>
                <div class="mb-3">
                  <label for="email" class="form-label">メールアドレス</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    [(ngModel)]="email"
                    name="email"
                    required
                  >
                </div>
                <div class="mb-3">
                  <label for="password" class="form-label">パスワード</label>
                  <input
                    type="password"
                    class="form-control"
                    id="password"
                    [(ngModel)]="password"
                    name="password"
                    required
                  >
                </div>
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label">パスワード（確認）</label>
                  <input
                    type="password"
                    class="form-control"
                    id="confirmPassword"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    required
                  >
                </div>
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-success">登録</button>
                  <button type="button" class="btn btn-secondary" (click)="navigateToLogin()">
                    ログイン画面に戻る
                  </button>
                </div>
                <div *ngIf="error" class="alert alert-danger mt-3">
                  {{error}}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  displayName: string = '';
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (this.password !== this.confirmPassword) {
      this.error = 'パスワードが一致しません。';
      return;
    }

    if (!this.displayName.trim()) {
      this.error = 'ユーザー名を入力してください。';
      return;
    }

    try {
      await this.authService.register(this.email, this.password, this.displayName);
    } catch (error) {
      this.error = '登録に失敗しました。別のメールアドレスを使用するか、パスワードを変更してください。';
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
} 