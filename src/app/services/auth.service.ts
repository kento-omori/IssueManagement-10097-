import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, sendPasswordResetEmail, sendEmailVerification,updateProfile, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  
  // ログイン状態の監視
  authState$;

  constructor(
    private auth: Auth,
    private router: Router,
    private userService: UserService
  ) {
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
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      // ユーザープロフィールを取得
      const userProfile = await this.userService.getUserProfile(userCredential.user.uid);
      if (userProfile) {
        await this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  }

  // 新規ユーザー登録
  async register(email: string, password: string, displayName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // ユーザー名を設定
      await updateProfile(user, {
        displayName: displayName
      });

      // Firestoreにユーザープロフィールを保存
      await this.userService.createUserProfile({
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        createdAt: new Date()
      });

      // メール確認を送信
      await sendEmailVerification(user);
      this.router.navigate(['/verify-email']);
      return userCredential;
    } catch (error) {
      throw error;
    }
  }
 
  // メール確認状態を監視
  async checkEmailVerification(): Promise<boolean> {
    return new Promise((resolve) => {
      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          // ユーザーの確認状態を再取得
          await user.reload();
          resolve(user.emailVerified);
        } else {
          resolve(false);
        }
      });
    });
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