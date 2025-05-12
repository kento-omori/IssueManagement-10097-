import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  // template: `
  //   <!-- <div class="container mt-5">
  //     <div class="row justify-content-center">
  //       <div class="col-md-6">
  //         <div class="card">
  //           <div class="card-header bg-primary text-white">
  //             <h3 class="mb-0">ログイン</h3>
  //           </div>
  //           <div class="card-body">
  //             <form (ngSubmit)="onSubmit()">
  //               <div class="mb-3">
  //                 <label for="email" class="form-label">メールアドレス</label>
  //                 <input
  //                   type="email"
  //                   class="form-control"
  //                   id="email"
  //                   [(ngModel)]="email"
  //                   name="email"
  //                   required
  //                 >
  //               </div>
  //               <div class="mb-3">
  //                 <label for="password" class="form-label">パスワード</label>
  //                 <input
  //                   type="password"
  //                   class="form-control"
  //                   id="password"
  //                   [(ngModel)]="password"
  //                   name="password"
  //                   required
  //                 >
  //               </div>
  //               <div class="d-grid gap-2">
  //                 <button type="submit" class="btn btn-primary">ログイン</button>
  //                 <button type="button" class="btn btn-secondary" (click)="navigateToRegister()">
  //                   新規登録はこちら
  //                 </button>
  //                 <button type="button" class="btn btn-link" (click)="resetPassword()">
  //                   パスワードを忘れた方はこちら
  //                 </button>
  //               </div>
  //               <div *ngIf="error" class="alert alert-danger mt-3">
  //                 {{error}}
  //               </div>
  //               <div *ngIf="successMessage" class="alert alert-success mt-3">
  //                 {{successMessage}}
  //               </div>
  //             </form>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </div> -->
  // `
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  email: string = '';
  password: string = '';
  error: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
        Validators.pattern('^[a-zA-Z0-9]+$')
      ]]
    });
  }

  ngOnInit(): void {}

  async onSubmit() {
    if (this.loginForm.invalid) {
      if (this.loginForm.get('email')?.errors?.['required']) {
        this.toastr.error('メールアドレスを入力してください');
      } else if (this.loginForm.get('email')?.errors?.['email']) {
        this.toastr.error('有効なメールアドレスを入力してください');
      } else if (this.loginForm.get('password')?.errors?.['required']) {
        this.toastr.error('パスワードを入力してください');
      } else if (this.loginForm.get('password')?.errors?.['minlength']) {
        this.toastr.error('パスワードは6文字以上で入力してください');
      } else if (this.loginForm.get('password')?.errors?.['maxlength']) {
        this.toastr.error('パスワードは20文字以下で入力してください');
      } else if (this.loginForm.get('password')?.errors?.['pattern']) {
        this.toastr.error('パスワードは英数字のみで入力してください');
      }
      return;
    }

    this.isLoading = true;
    try {
      await this.authService.login(
        this.loginForm.value.email,
        this.loginForm.value.password
      );
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        this.toastr.error('メールアドレスまたはパスワードが正しくありません');
      } else if (error.code === 'auth/too-many-requests') {
        this.toastr.error('ログイン試行回数が多すぎます。しばらく時間をおいてから再度お試しください');
      } else if (error.code === 'auth/network-request-failed') {
        this.toastr.error('インターネット接続を確認してください');
      } else {
        this.toastr.error('ログインに失敗しました。もう一度お試しください');
      }
    } finally {
      this.isLoading = false;
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  async resetPassword() {
    this.error = '';
    this.successMessage = '';
    
    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.toastr.error('パスワードリセットのためにメールアドレスを入力してください。');
      return;
    }

    try {
      await this.authService.resetPassword(email);
      this.successMessage = 'パスワードリセットのメールを送信しました。メールをご確認ください。';
    } catch (error) {
      this.toastr.error('パスワードリセットメールの送信に失敗しました。メールアドレスを確認してください。');
    }
  }
} 