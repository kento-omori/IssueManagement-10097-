import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, sendPasswordResetEmail, sendEmailVerification,updateProfile, User, deleteUser } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { NgZone } from '@angular/core';
import { NavigationService } from './navigation.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  
  // ログイン状態の監視
  private auth = inject(Auth);
  private router = inject(Router);
  private userService = inject(UserService);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  authState$ = this.currentUserSubject.asObservable();

  constructor(
    private ngZone: NgZone,
    private navigationService: NavigationService
  ) {
    this.auth.onAuthStateChanged(user => {
      this.currentUserSubject.next(user);
    });
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
      if (!userProfile) {
        throw new Error('ユーザープロフィールの取得に失敗しました');
      }
      // NgZone内でナビゲーションを実行
      return new Promise<void>((resolve, reject) => {
        this.ngZone.run(async () => {
          try {
            await this.router.navigate(['users', userProfile.uid, 'home']);
            this.navigationService.setSelectedUserId(userProfile.uid);
            resolve();
          } catch (error) {
            console.error('Navigation error:', error);
            reject(new Error('ナビゲーションに失敗しました: ' + error));
          }
        });
      });
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
      const userProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        createdAt: new Date()
      };
      
      await this.userService.createUserProfile(userProfile);

      // メール確認を送信
      await sendEmailVerification(user);
      
      this.router.navigate(['/verify-email']);
      return userCredential;
    } catch (error) {
      console.error('Registration error:', error);
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

  // アカウント削除
  async deleteAccount(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }
      // ユーザーIDを保存（削除後に使用するため）
      const userId = user.uid;

      // Firestoreのユーザーデータを削除
      await this.userService.deleteUserData(userId);

      // Firebase Authenticationのアカウントを削除
      await deleteUser(user);

      // ログアウト処理
      await signOut(this.auth);

      // ログイン画面にリダイレクト
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('アカウント削除に失敗しました:', error);
      throw error;
    }
  }
} 