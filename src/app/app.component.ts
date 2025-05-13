import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet,RouterLink,RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NavigationService } from './services/navigation.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ProjectFirestoreService } from './services/project-firestore.service';
import { firstValueFrom } from 'rxjs';
import { MessagingService } from './services/messaging.service';
import { NotificationData } from './services/messaging.service';
import { NotificationListComponent } from './notification-list/notification-list.component';
import { NotificationPermissionComponent } from './notification-permission/notification-permission.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NotificationListComponent, NotificationPermissionComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, OnDestroy {
  title = 'issuemanagement';
  currentProjectName: string = '';
  notifications: NotificationData[] = [];
  unreadCount = 0;
  showNotificationPopup = false;
  showBanner = false;
  bannerNotification: NotificationData | null = null;
  private notificationSubscription: any;
  displayName: string = '';
  showNotificationDialog = false;
  hasRequested = false;
  
  constructor(
    public authService: AuthService,
    public navigationService: NavigationService,
    private router: Router,
    private route: ActivatedRoute,
    private projectFirestoreService: ProjectFirestoreService,
    private messagingService: MessagingService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    // ルーティングやサービスの状態に応じてプロジェクト名をセット
    this.setCurrentProjectName();
    // 通知の購読を即座に開始
    this.notificationSubscription = this.messagingService.notifications$.subscribe(list => {
      this.notifications = list;
      this.unreadCount = list.filter(n => !n.read).length;
      // 新着通知があればナビゲーション部分の下に表示（１０秒）
      if (list.length > 0 && !list[0].read) {
        this.showBanner = true;
        this.bannerNotification = list[0];
        setTimeout(() => {
          this.showBanner = false;
          this.bannerNotification = null;
        }, 5000);
      }
    });

    // 認証状態の変更を監視
    this.authService.onAuthStateChanged().subscribe(user => {
      if (user) {
        this.initializeNotifications();
        // 表示名を更新
        this.displayName = user.displayName || 'ゲスト';
      } else {
        this.displayName = 'ゲスト';
      }
    });
  }

  // 初期化
  async ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      let currentRoute = this.route.root;
      while (currentRoute.firstChild) {
        currentRoute = currentRoute.firstChild;
      }
      // userId
      let userId = currentRoute.snapshot.paramMap.get('userId');
      if (!userId) {
        // URLにuserIdがない場合はAuthServiceから取得→URLにuserIdやprojectIdがない場合
        userId = this.authService.getCurrentUserId();
      }
      if (userId) {
        this.navigationService.setSelectedUserId(userId);
        // ユーザーIDが取得できた時点で通知許可をチェック
        this.checkNotificationPermission();
      }
      // projectId
      const projectId = currentRoute.snapshot.paramMap.get('projectId');
      if (projectId) {
        this.navigationService.setSelectedProjectId(projectId);
      };
      // プロジェクト名や個人ワークスペース名を即座に反映
      this.setCurrentProjectName();
    });
  }

  private async initializeNotifications() {
    try {
      const registration = await this.registerServiceWorker();
      if (registration) {
        console.log('Service Worker登録成功:', registration);
        // Service Workerの登録が完了したら通知の設定を行う
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          // 通知の許可状態に応じて処理を分岐
          switch (Notification.permission) {
            case 'granted':
              console.log('通知が許可されています。トークンを保存します');
              await this.messagingService.requestPermissionAndSaveToken(userId);
              console.log('FCMトークンを保存しました');
              break;
            case 'denied':
              console.log('通知が拒否されています。トークンを削除します');
              await this.messagingService.revokePermission(userId);
              break;
            default:
              console.log('通知の許可状態が未設定です:', Notification.permission);
          }
        } else {
          console.log('ユーザーIDが取得できません');
        }
      } else {
        console.log('Service Workerの登録に失敗しました');
      }
    } catch (error) {
      console.error('通知の初期化に失敗しました:', error);
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        return await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
      } catch (error) {
        console.error('Service Worker登録失敗:', error);
        return null;
      }
    }
    return null;
  }

  // ログアウト
  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  }

  async goHome() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // メール確認状態をチェック
    try {
      const isVerified = await this.authService.checkEmailVerification();
      if (!isVerified) {
        this.router.navigate(['/login']);
        return;
      }
    } catch (error) {
      console.error('メール確認チェックエラー:', error);
      this.router.navigate(['/login']);
      return;
    }

    // メール確認が完了している場合のみホーム画面に遷移
    this.navigationService.selectedUserId$.subscribe(userId => {
      if (userId) {
        this.router.navigate(['users', userId, 'home']);
      }
    }).unsubscribe();
  }

  goPrivate() {
    this.navigationService.selectedUserId$.subscribe(userId => {
      if (userId) {
        this.router.navigate(['users', userId, 'private']);
      }
    }).unsubscribe();
  }

  goProjectHome() {
    this.router.navigate(['projects']);
  }

  // プロジェクト名や個人ワークスペース名を即座に反映
  async setCurrentProjectName() {
    // ActivatedRouteからURLパラメータを直接取得
    let currentRoute = this.route.root;
    let currentRouteFirst = currentRoute.firstChild;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    const projectId = currentRoute.snapshot.paramMap.get('projectId');
    if (!projectId) {
      if(currentRouteFirst?.snapshot.url[0].path === 'projects') {
        this.currentProjectName = 'プロジェクト一覧';
      } else if (currentRouteFirst?.snapshot.url[0].path === 'users') {
        this.currentProjectName = '個人ワークスペース';
      } else {
        this.currentProjectName = '';
      };
    } else {
      // Firestoreからプロジェクト名を取得
      const project = await firstValueFrom(this.projectFirestoreService.getProjectById(projectId));
      if (project) {
        this.currentProjectName = project.title;
      } else {
        this.currentProjectName = 'プロジェクトが見つかりません';
      }
    }
  }

  ngOnDestroy() {
    // 通知の購読を解除
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
      }
  }

  // 通知許可状態をチェックするメソッド
  private async checkNotificationPermission() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    console.log('hasRequested:', this.hasRequested);
    if (Notification.permission === 'default' && !this.hasRequested) {
      try {
        const hasChecked = await this.messagingService.hasCheckedPermission(userId);
        if (!hasChecked) {
          console.log('通知許可ポップアップを表示します');
          this.showNotificationDialog = true;
          this.cdr.detectChanges();
        }
      } catch (error) {
        console.error('通知許可チェックエラー:', error);
      }
    }
  }

  // 通知ポップアップ
  toggleNotificationPopup() {
    console.log('現在の通知許可状態:', Notification.permission);
    console.log('現在のshowNotificationPopup:', this.showNotificationPopup);
    
    // 通知ポップアップの表示状態を切り替え
    this.showNotificationPopup = !this.showNotificationPopup;
    
    // 通知許可が未設定の場合のみ許可ポップアップを表示
    if (Notification.permission === 'default' && this.showNotificationPopup) {
      console.log('通知許可が未設定のため、許可ポップアップを表示します');
      this.showNotificationDialog = true;
      this.cdr.detectChanges();
    } else {
      this.showNotificationDialog = false;
    }
    
    console.log('切り替え後のshowNotificationPopup:', this.showNotificationPopup);
  }

  // 通知許可ボタンが押されたときの処理
  async onPermissionRequested() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      await this.messagingService.savePermissionCheck(userId);
    }
    this.showNotificationDialog = false;
    this.showNotificationPopup = false;
  }

  // 通知拒否ボタンが押されたときの処理
  async onPermissionDeclined() {
    this.showNotificationDialog = false;
    this.showNotificationPopup = false;
    this.cdr.detectChanges();
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      await this.messagingService.savePermissionCheck(userId);
    }
  }

  onNotificationClick(notification: NotificationData) {
    this.messagingService.markAsRead(notification.id);
    this.showNotificationPopup = false;
  }

  onMarkAllAsRead() {
    this.messagingService.markAllAsRead();
    console.log('全ての通知を既読にしました');
    this.showNotificationPopup = false;
  }

  // アカウント削除の確認
  async confirmDeleteAccount() {
    const confirmed = window.confirm(
      'アカウントを削除すると、全てのデータが完全に削除されます：\n\n' +
      'この操作は取り消せません。\n' +
      '本当にアカウントを削除しますか？'
    );

    if (confirmed) {
      try {
        await this.authService.deleteAccount();
      } catch (error) {
        console.error('アカウント削除エラー:', error);
        if (error instanceof Error && error.message.includes('プロジェクトの管理者またはオーナー')) {
          alert('プロジェクトの管理者またはオーナーはアカウントを削除できません。\n先にプロジェクトの管理者権限を移譲してください。');
        } else {
          alert('アカウントの削除に失敗しました。もう一度お試しください。');
        }
      }
    }
  }

  // ユーザ名の変更
  async changeDisplayName() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      const newDisplayName = prompt('2文字以上20文字以下で新しいユーザー名を入力してください\n※ユーザー名変更後は、必ず更新ボタンを押してください\n　変更が反映されません');
      if (newDisplayName) {
        if (newDisplayName.length < 2) {
          this.toastr.error('ユーザー名は2文字以上で入力してください');
          return;
        }
        if (newDisplayName.length > 20) {
          this.toastr.error('ユーザー名は20文字以下で入力してください');
          return;
        }
        try {
          await this.authService.changeDisplayName(newDisplayName);
          // 現在のユーザー情報を取得して更新
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            this.displayName = newDisplayName;
            this.cdr.detectChanges();
          }
          this.toastr.success('ユーザー名を更新しました\nユーザー名変更後は、必ず更新ボタンを押してください');
        } catch (error) {
          console.error('ユーザー名の更新に失敗しました:', error);
          this.toastr.error('ユーザー名の更新に失敗しました');
        }
      }
    }
  }
  
  isAuthPage(): boolean {
    const currentRoute = this.router.url;
    return currentRoute === '/login' || 
           currentRoute === '/register' || 
           currentRoute === '/verify-email';
  }
  
  onNotificationDialogClosed() {
    this.hasRequested = true;
    this.showNotificationDialog = false;
  }
}
