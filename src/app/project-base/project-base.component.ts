import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DashboadComponent } from '../dashboad/dashboad.component';
import { NotificationComponent } from '../notification/notification.component';
import { MemberComponent } from "../member/member.component";
import { ProjectFirestoreService } from '../services/project-firestore.service';
import { ProjectData } from '../project-home/project-home.component';

@Component({
  selector: 'app-project-base',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DashboadComponent, NotificationComponent, MemberComponent],
  templateUrl: './project-base.component.html',
  styleUrl: './project-base.component.css'
})
export class ProjectBaseComponent implements OnInit {

  constructor(
    private projectFirestoreService: ProjectFirestoreService,
    private router: Router
  ) {}

  projectData: ProjectData[] = [];

  ngOnInit(): void {
  };

  goTodo(): void {
    this.projectFirestoreService.goTodo();
  }

  goGanttChart(): void {
    this.projectFirestoreService.goGanttChart();
  }

  goParentIShare(): void {
    this.projectFirestoreService.goParentIShare();
  }

  // goChat(): void {
  //   this.projectFirestoreService.goChat();
  // }

  goMember(): void {
    this.projectFirestoreService.goMember();
  }
  
}
