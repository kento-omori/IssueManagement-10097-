import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h3 class="mb-0">ログイン</h3>
            </div>
            <div class="card-body">
              <form (ngSubmit)="onSubmit()">
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
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-primary">ログイン</button>
                  <button type="button" class="btn btn-secondary" (click)="navigateToRegister()">
                    新規登録はこちら
                  </button>
                  <button type="button" class="btn btn-link" (click)="resetPassword()">
                    パスワードを忘れた方はこちら
                  </button>
                </div>
                <div *ngIf="error" class="alert alert-danger mt-3">
                  {{error}}
                </div>
                <div *ngIf="successMessage" class="alert alert-success mt-3">
                  {{successMessage}}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';
  successMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    this.error = '';
    this.successMessage = '';
    try {
      await this.authService.login(this.email, this.password);
      console.log('ログイン成功');
    } catch (error) {
      this.error = 'ログインに失敗しました。メールアドレスとパスワードを確認してください。';
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  async resetPassword() {
    this.error = '';
    this.successMessage = '';
    
    if (!this.email) {
      this.error = 'パスワードリセットのためにメールアドレスを入力してください。';
      return;
    }

    try {
      await this.authService.resetPassword(this.email);
      this.successMessage = 'パスワードリセットのメールを送信しました。メールをご確認ください。';
    } catch (error) {
      this.error = 'パスワードリセットメールの送信に失敗しました。メールアドレスを確認してください。';
    }
  }
} 