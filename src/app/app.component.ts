import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NotificationListComponent, NotificationPermissionComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  title = 'issuemanagement';
  currentProjectName: string = '';
  notifications: NotificationData[] = [];
  unreadCount = 0;
  showNotificationPopup = false;
  showPermissionPopup = false;
  showBanner = false;
  bannerNotification: NotificationData | null = null;
  
  constructor(
    public authService: AuthService,
    public navigationService: NavigationService,
    private router: Router,
    private route: ActivatedRoute,
    private projectFirestoreService: ProjectFirestoreService,
    private messagingService: MessagingService
  ) {
    // ルーティングやサービスの状態に応じてプロジェクト名をセット
    this.setCurrentProjectName();
    // Service Workerの登録を待機してから通知の設定を行う
    this.initializeNotifications();
  }

  private async initializeNotifications() {
    try {
      const registration = await this.registerServiceWorker();
      if (registration) {
        console.log('Service Worker登録成功:', registration);
        // Service Workerの登録が完了したら通知の設定を行う
        const userId = this.authService.getCurrentUserId();
        if (userId) {
          await this.messagingService.requestPermissionAndSaveToken(userId);
        }
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

  // 初期化
  ngOnInit() {
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

    this.messagingService.notifications$.subscribe(list => {
      this.notifications = list;
      this.unreadCount = list.filter(n => !n.read).length;
      // 新着通知があればナビゲーション部分の下に表示（１０秒）
      if (list.length > 0 && !list[0].read) {
        this.showBanner = true;
        this.bannerNotification = list[0];
        setTimeout(() => {
          this.showBanner = false;
          this.bannerNotification = null;
        }, 10000);
      }
    });
  }

  // 通知許可状態をチェックするメソッド
  private async checkNotificationPermission() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    // 通知の許可状態をチェック
    if (Notification.permission === 'default') {
      try {
        // 通知許可の確認状態をチェック
        const hasChecked = await this.messagingService.hasCheckedPermission(userId);
        if (!hasChecked) {
          console.log('通知許可ポップアップを表示します');
          this.showPermissionPopup = true;
          this.showNotificationPopup = false;
        }
      } catch (error) {
        console.error('通知許可チェックエラー:', error);
      }
    }
  }

  goHome() {
    this.navigationService.selectedUserId$.subscribe(userId => {
      if (userId) {
        this.router.navigate(['users', userId, 'home']);
      }
    }).unsubscribe(); // メモリリーク防止のため即時unsubscribe
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

  // 通知ポップアップ
  toggleNotificationPopup() {
    // プッシュ通知の許可を初めてとるとき（登録してログインした時）
    if (Notification.permission === 'default') {
      this.showPermissionPopup = true;
      this.showNotificationPopup = false;
    } else {
      this.showNotificationPopup = !this.showNotificationPopup;
      this.showPermissionPopup = false;
    }
  }

  // 通知許可ボタンが押されたときの処理
  async onPermissionRequested() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      await this.messagingService.savePermissionCheck(userId);
    }
    this.showPermissionPopup = false;
    if (Notification.permission === 'granted') {
      this.showNotificationPopup = true;
    }
  }

  // 通知拒否ボタンが押されたときの処理
  async onPermissionDeclined() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      await this.messagingService.savePermissionCheck(userId);
    }
    this.showPermissionPopup = false;
  }

  onNotificationClick(notification: NotificationData) {
    this.messagingService.markAsRead(notification.id);
    this.showNotificationPopup = false;
  }

  onMarkAllAsRead() {
    this.messagingService.markAllAsRead();
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
  
}
