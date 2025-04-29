import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, sendPasswordResetEmail, updateProfile, User } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ログイン状態の監視
  authState$;

  constructor(private auth: Auth, private router: Router) {
    this.authState$ = authState(this.auth);
  }

  // 現在のユーザーを取得
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // 現在のユーザーIDを取得
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  // メールアドレスとパスワードでログイン
  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  }

  // 新規ユーザー登録
  async register(email: string, password: string, displayName: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      // ユーザー名を設定
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('登録エラー:', error);
      throw error;
    }
  }

  // ログアウト
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  }

  // パスワードリセット
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
      throw error;
    }
  }
} 