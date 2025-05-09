import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, sendPasswordResetEmail, sendEmailVerification,updateProfile, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { NgZone } from '@angular/core';
import { NavigationService } from './navigation.service';
@Injectable({
  providedIn: 'root'
})

export class AuthService {
  
  // ログイン状態の監視
  authState$;

  constructor(
    private auth: Auth,
    private router: Router,
    private userService: UserService,
    private ngZone: NgZone,
    private navigationService: NavigationService
  ) {
    this.authState$ = authState(this.auth);
    console.log('authState$:', this.authState$);
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
      console.log('Firebase login successful');
      
      // ユーザープロフィールを取得
      const userProfile = await this.userService.getUserProfile(userCredential.user.uid);
      console.log('User profile:', userProfile);

      if (!userProfile) {
        throw new Error('ユーザープロフィールの取得に失敗しました');
      }

      // NgZone内でナビゲーションを実行
      return new Promise<void>((resolve, reject) => {
        this.ngZone.run(async () => {
          try {
            console.log('Attempting navigation to /home');
            await this.router.navigate(['users', userProfile.uid, 'home']);
            this.navigationService.setSelectedUserId(userProfile.uid);
            console.log('Navigation successful');
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
      console.log('Starting user registration...');
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log('User created with uid:', user.uid);

      // ユーザー名を設定
      await updateProfile(user, {
        displayName: displayName
      });
      console.log('User profile updated with display name');

      // Firestoreにユーザープロフィールを保存
      const userProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        createdAt: new Date()
      };
      console.log('Creating user profile in Firestore:', userProfile);
      
      await this.userService.createUserProfile(userProfile);
      console.log('User profile created in Firestore');

      // メール確認を送信
      await sendEmailVerification(user);
      console.log('Verification email sent');
      
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
} 