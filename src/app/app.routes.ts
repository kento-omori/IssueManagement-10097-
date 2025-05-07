import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { TodoComponent } from './todo/todo.component';
import { TasklistComponent } from './tasklist/tasklist.component';
import { PrivateComponent } from './private/private.component';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { GanttChartComponent } from './gantt-chart/gantt-chart.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ParentIShareComponent } from './parent-i-share/parent-i-share.component';
import { IShareComponent } from './i-share/i-share.component';
import { DashboadComponent } from './dashboad/dashboad.component';
import { NotificationComponent } from './notification/notification.component';
import { ProjectHomeComponent } from './project-home/project-home.component';
import { ProjectBaseComponent } from './project-base/project-base.component';
import { MemberComponent } from './member/member.component';

export const routes: Routes = [
  // ログイン画面
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-email', component: VerifyEmailComponent },

  // ホーム画面
  { path: 'users/:userId/home', component: HomeComponent, canActivate: [authGuard] },
  //　プライベート（個人ワークスペース）
  { path: 'users/:userId/private', component: PrivateComponent, canActivate: [authGuard] },
  { path: 'users/:userId/dashboad', component: DashboadComponent, canActivate: [authGuard] },
  { path: 'users/:userId/notification', component: NotificationComponent, canActivate: [authGuard] },
  { path: 'users/:userId/tasklist', component: TasklistComponent, canActivate: [authGuard] },
  { path: 'users/:userId/todo', component: TodoComponent, canActivate: [authGuard] },
  { path: 'users/:userId/gantt-chart', component: GanttChartComponent, canActivate: [authGuard] },
  { path: 'users/:userId/parent-i-share', component: ParentIShareComponent, canActivate: [authGuard] },
  { path: 'users/:userId/i-share/:dbid', component: IShareComponent, canActivate: [authGuard] },

  // プロジェクト（共有ワークスペース）
  { path: 'projects', component: ProjectHomeComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/project-base', component: ProjectBaseComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/member', component: MemberComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/dashboad', component: DashboadComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/notification', component: NotificationComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/todo', component: TodoComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/gantt-chart', component: GanttChartComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/parent-i-share', component: ParentIShareComponent, canActivate: [authGuard] },
  { path: 'projects/:projectId/i-share/:dbid', component: IShareComponent, canActivate: [authGuard] },

  // 不明な場合
  { path: '**', redirectTo: '/login' },
];
