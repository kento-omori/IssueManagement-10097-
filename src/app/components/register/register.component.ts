import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h3 class="mb-0">新規登録</h3>
            </div>
            <div class="card-body">
              <form (ngSubmit)="onSubmit()" [formGroup]="registerForm">
                <div class="mb-3">
                  <label for="displayName" class="form-label">ユーザー名</label>
                  <input
                    type="text"
                    class="form-control"
                    id="displayName"
                    formControlName="displayName"
                    placeholder="（例）山田 太郎"
                    required
                  >
                  <div *ngIf="registerForm.get('displayName')?.errors?.['required'] && registerForm.get('displayName')?.touched" class="text-danger">
                    ユーザー名を入力してください。
                  </div>
                  <div *ngIf="registerForm.get('displayName')?.errors?.['minlength'] && registerForm.get('displayName')?.touched" class="text-danger">
                    ユーザー名は2文字以上で入力してください。
                  </div>
                  <div *ngIf="registerForm.get('displayName')?.errors?.['maxlength'] && registerForm.get('displayName')?.touched" class="text-danger">
                    ユーザー名は20文字以下で入力してください。
                  </div>
                </div>
                <div class="mb-3">
                  <label for="email" class="form-label">メールアドレス</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    formControlName="email"
                    placeholder="example@example.com"
                    required
                  >
                  <div *ngIf="registerForm.get('email')?.errors?.['required'] && registerForm.get('email')?.touched" class="text-danger">
                    メールアドレスを入力してください。
                  </div>
                  <div *ngIf="registerForm.get('email')?.errors?.['email'] && registerForm.get('email')?.touched" class="text-danger">
                    有効なメールアドレスを入力してください。
                  </div>
                </div>
                <div class="mb-3">
                  <label for="password" class="form-label">パスワード</label>
                  <input
                    type="password"
                    class="form-control"
                    id="password"
                    formControlName="password"
                    placeholder="パスワードは6文字以上20文字以下、かつ英数字のみで入力してください。"
                    required
                  >
                  <div *ngIf="registerForm.get('password')?.errors?.['required'] && registerForm.get('password')?.touched" class="text-danger">
                    パスワードを入力してください。
                  </div>
                  <div *ngIf="registerForm.get('password')?.errors?.['minlength'] && registerForm.get('password')?.touched" class="text-danger">
                    パスワードは6文字以上で入力してください。
                  </div>
                  <div *ngIf="registerForm.get('password')?.errors?.['maxlength'] && registerForm.get('password')?.touched" class="text-danger">
                    パスワードは20文字以下で入力してください。
                  </div>
                  <div *ngIf="registerForm.get('password')?.errors?.['pattern'] && registerForm.get('password')?.touched" class="text-danger">
                    パスワードは英数字のみで入力してください。
                  </div>
                </div>
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label">パスワード（確認）</label>
                  <input
                    type="password"
                    class="form-control"
                    id="confirmPassword"
                    formControlName="confirmPassword"
                    placeholder="パスワードは6文字以上20文字以下、かつ英数字のみで入力してください。"
                    required
                  >
                  <div *ngIf="registerForm.get('confirmPassword')?.errors?.['required'] && registerForm.get('confirmPassword')?.touched" class="text-danger">
                    パスワード（確認）を入力してください。
                  </div>
                </div>
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-success" [disabled]="!registerForm.valid">登録</button>
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
  error: string = '';
  registerForm: FormGroup;

  constructor(
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.registerForm = this.formBuilder.group({
      displayName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20)
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern('^[a-zA-Z0-9]+$')]],
      confirmPassword: ['', Validators.required]
    });
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      const { email, password, displayName, confirmPassword } = this.registerForm.value;
      
      if (password !== confirmPassword) {
        this.error = 'パスワードが一致しません。';
        return;
      }

      try {
        await this.authService.register(email, password, displayName);
      } catch (error: any) {
        console.error('Registration error:', error);
        this.error = error.message;
      }
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
} 