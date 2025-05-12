import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, authState, sendPasswordResetEmail, sendEmailVerification,updateProfile, User, deleteUser } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { NgZone } from '@angular/core';
import { NavigationService } from './navigation.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { doc, updateDoc } from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';

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
  private firestore = inject(Firestore);

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

      // メール確認を送信
      await sendEmailVerification(user);
      
      // メール確認が完了するまでログアウト
      await signOut(this.auth);
      
      this.router.navigate(['/verify-email']);
      return userCredential;
    } catch (error: any) {
      console.error('Registration error:', error);
      // Firebaseのエラーメッセージをより分かりやすく変換
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('このメールアドレスは既に使用されています。');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('有効なメールアドレスを入力してください。');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('パスワードは6文字以上20文字以下の英数字のみで入力してください。');
      }
      throw new Error('ユーザー登録に失敗しました。もう一度お試しください。');
    }
  }
 
  // メール確認状態を監視
  async checkEmailVerification(): Promise<boolean> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        console.log('ユーザーがログインしていません');
        return false;
      }

      try {
        // ユーザーの状態を再読み込み
        await user.reload();
      } catch (reloadError: any) {
        if (reloadError.code === 'auth/network-request-failed') {
          console.error('ネットワーク接続エラーが発生しました。インターネット接続を確認してください。');
          throw new Error('インターネット接続を確認してください。');
        }
        throw reloadError;
      }
      
      // メール確認状態を確認
      if (user.emailVerified) {
        console.log('メール確認が完了しています');
        return true;
      } else {
        console.log('メール確認が未完了です');
        return false;
      }
    } catch (error: any) {
      console.error('メール確認チェック中にエラーが発生しました:', error);
      if (error.code === 'auth/network-request-failed') {
        throw new Error('インターネット接続を確認してください。');
      }
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

  onAuthStateChanged() {
    return new Observable<User | null>((subscriber) => {
      return this.auth.onAuthStateChanged((user) => {
        subscriber.next(user);
      });
    });
  }

  // ユーザ名の変更
  async changeDisplayName(newDisplayName: string) {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }
    try {
      // Firebase Authのプロファイルを更新
      await updateProfile(user, { displayName: newDisplayName });
      
      // Firestoreのユーザープロファイルも更新
      const userDoc = doc(this.firestore, 'users', user.uid);
      await updateDoc(userDoc, {
        displayName: newDisplayName
      });
    } catch (error) {
      console.error('ユーザー名の更新に失敗しました:', error);
      throw error;
    }
  }
} 