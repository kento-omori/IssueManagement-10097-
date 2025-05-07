import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { ProjectFirestoreService } from '../services/project-firestore.service';
import { NavigationService } from '../services/navigation.service';
import { Subject } from 'rxjs';

export interface ProjectData {
  pjid?: string; //firebaseデータベースのプロジェクトID
  title: string; //プロジェクトのタイトル
  description: string; //プロジェクトの説明
  createdAt: Timestamp;
  projectMembers: string[]; // PJメンバーのユーザーID
  admin: string[]; // 管理者のユーザーID（メンバーの追加削除）
  owner: string[]; // オーナーのユーザーID（プロジェクトの削除）
}

export interface ProjectMember {
  uid: string;
  displayName: string | null;
  email: string | null;
  isAdmin: boolean;
  isOwner: boolean;
}

@Component({
  selector: 'app-project-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-home.component.html',
  styleUrl: './project-home.component.css'
})
export class ProjectHomeComponent implements OnInit, OnDestroy {
  projects: ProjectData[] = [];
  newProjectTitle: string = '';
  newProjectDescription: string = '';
  destroy$ = new Subject<void>();

  @ViewChild('projectForm') projectForm!: NgForm;

  constructor(
    private projectFirestoreService: ProjectFirestoreService,
    private navigationService: NavigationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.navigationService.selectedUserId$.subscribe(userId => {
      if (userId) {
        this.projectFirestoreService.getMyProjects().subscribe((projects) => {
          this.projects = projects.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        });
      }
    });
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 新しいプロジェクトを追加するメソッド
  addProject(): void {
    const newProject: ProjectData = {
      title: this.newProjectTitle,
      description: this.newProjectDescription,
      createdAt: Timestamp.now(),
      projectMembers: [],
      admin: [],
      owner: [],
    };
    this.projects.push(newProject);
    this.projectFirestoreService.createProject(newProject);
    this.projectForm.resetForm();      // フォームをリセット
  }

  // ホームページに遷移するメソッド
  goHome() {
    this.navigationService.selectedUserId$.subscribe(userId => {
      if (userId) {
        this.router.navigate(['users', userId, 'home']);
      }
    }).unsubscribe(); // メモリリーク防止のため即時unsubscribe
  }

  goProjectBase(projectId: string) {
    this.navigationService.setSelectedProjectId(projectId);
    this.router.navigate(['projects', projectId, 'project-base']);
  }
}
