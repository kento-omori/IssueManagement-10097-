import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { TodoComponent } from './todo/todo.component';
import { TasklistComponent } from './tasklist/tasklist.component';
import { TeamComponent } from './team/team.component';
import { PrivateComponent } from './private/private.component';
import { HomeComponent } from './home/home.component';
import { authGuard } from './guards/auth.guard';
import { GanttChartComponent } from './gantt-chart/gantt-chart.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ParentIShareComponent } from './parent-i-share/parent-i-share.component';
import { IShareComponent } from './i-share/i-share.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'private', component: PrivateComponent, canActivate: [authGuard] },
  { path: 'team', component: TeamComponent, canActivate: [authGuard] },
  { path: 'todo', component: TodoComponent, canActivate: [authGuard] },
  { path: 'tasklist', component: TasklistComponent, canActivate: [authGuard] },
  { path: 'gantt-chart', component: GanttChartComponent, canActivate: [authGuard] },
  { path: 'parent-i-share', component: ParentIShareComponent, canActivate: [authGuard] },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'i-share/:dbid', component: IShareComponent }
];
