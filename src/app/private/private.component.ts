import { Component, OnInit } from '@angular/core';
import { DashboadComponent } from '../dashboad/dashboad.component';
import { NotificationComponent } from '../notification/notification.component';
import { Router } from '@angular/router';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-private',
  standalone: true,
  imports: [DashboadComponent,NotificationComponent],
  templateUrl: './private.component.html',
  styleUrl: './private.component.css'
})
export class PrivateComponent implements OnInit {

  constructor(private router: Router, private navigationService: NavigationService) {}

  userId: string | null = null;

  ngOnInit() {
    this.navigationService.selectedUserId$.subscribe(userId => {
      this.userId = userId;
    });
  }

  goTasklist() {
    this.router.navigate(['users', this.userId, 'tasklist']);
  }

  goTodo() {
    this.router.navigate(['users', this.userId, 'todo']);
  }

  goGanttChart() {
    this.router.navigate(['users', this.userId, 'gantt-chart']);
  }

  goParentInfoShare() {
    this.router.navigate(['users', this.userId, 'parent-i-share']);
  }
}
