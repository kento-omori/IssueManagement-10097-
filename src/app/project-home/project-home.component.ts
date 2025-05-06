import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { ProjectFirestoreService } from '../services/project-firestore.service';

export interface ProjectData {
  pjid?: string; //firebaseデータベースのプロジェクトID
  title: string; //プロジェクトのタイトル
  description: string; //プロジェクトの説明
  createdAt: Timestamp;
  projectMembers: string[]; // PJメンバーのユーザーID
  admin: string[]; // 管理者のユーザーID（メンバーの追加削除）
  owner: string[]; // オーナーのユーザーID（プロジェクトの削除）
}

@Component({
  selector: 'app-project-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink],
  templateUrl: './project-home.component.html',
  styleUrl: './project-home.component.css'
})
export class ProjectHomeComponent implements OnInit {
  projects: ProjectData[] = [];
  newProjectTitle: string = '';
  newProjectDescription: string = '';

  @ViewChild('projectForm') projectForm!: NgForm;

  constructor(private projectFirestoreService: ProjectFirestoreService) { }

  ngOnInit(): void {
    this.projectFirestoreService.getProjects().subscribe((projects) => {
      this.projects = projects.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    });
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
}
