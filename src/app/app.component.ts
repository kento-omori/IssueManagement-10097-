import { Component } from '@angular/core';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NotificationListComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'issuemanagement';
  currentProjectName: string = '';
  notifications: NotificationData[] = [];
  unreadCount = 0;
  showNotificationPopup = false;
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
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  }

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
        userId = this.authService.getCurrentUserId(); // ここは実装に合わせて
      }
      if (userId) {
        this.navigationService.setSelectedUserId(userId);
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
      // 新着通知があればバナー表示
      if (list.length > 0 && !list[0].read) {
        this.showBanner = true;
        this.bannerNotification = list[0];
        setTimeout(() => {
          this.showBanner = false;
          this.bannerNotification = null;
        }, 3000);
      }
    });
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

  toggleNotificationPopup() {
    this.showNotificationPopup = !this.showNotificationPopup;
  }

  onMarkAllAsRead() {
    this.messagingService.markAllAsRead();
    this.showNotificationPopup = false;
  }
}
