import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  where,
  arrayUnion,
  arrayRemove
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { ProjectData } from '../project-home/project-home.component';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectFirestoreService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private authService: AuthService,
  ) {}

  projectData: ProjectData[] = [];

  // 特定のプロジェクトを取得 (セキュリティルールでアクセス制御)
  getProjects(): Observable<ProjectData[]> {
    try {
      const collectionRef = collection(this.firestore, 'projects');
      const q = query(collectionRef, orderBy('createdAt', 'asc'));
      return collectionData(q, { idField: 'pjid' }) as Observable<ProjectData[]>;
    } catch (error) { // Firestoreの権限エラーなどはここでcatchされる
      console.error('プロジェクトデータ取得エラー:', error);
      return new Observable<ProjectData[]>();
    }
  }

  // 自分がメンバーになっているプロジェクト一覧を取得
  getMyProjects(): Observable<ProjectData[]> {
    try {
        const userId = this.authService.getCurrentUserId();
        if (!userId) return of([]); // ユーザーIDがなければ空配列
        const collectionRef = collection(this.firestore, 'projects');
        const q = query(collectionRef, where('projectMembers', 'array-contains', userId));
        return collectionData(q, { idField: 'pjid' }) as Observable<ProjectData[]>;
    } catch (error) {
      console.error(`Error fetching user projects:`, error);
      return new Observable<ProjectData[]>();
    }
  }

  // 新しいプロジェクトを作成
  async createProject(project: Omit<ProjectData, 'pjid'>){
    const user = await this.authService.getCurrentUserId();
    if (!user) throw new Error('User not logged in.');
    const newProject: Omit<ProjectData, 'pjid'> = {
      title: project.title,
      description: project.description,
      createdAt: Timestamp.now(), // Timestampを使用
      projectMembers: [user], // 作成者自身をメンバーに追加
      admin: [user], // 管理者のユーザーID（メンバーの追加削除）
      owner: [user] // オーナーのユーザーID（プロジェクトの削除）
    };
    // Firestoreの型 <Project> を指定して追加
    return addDoc(collection(this.firestore, 'projects'), newProject);
  }

  // プロジェクトの削除
  async deleteProject(project: ProjectData): Promise<void> {
    if (!project.pjid) return Promise.reject('Project ID is missing.');
    const user = await this.authService.getCurrentUserId();
    if (!user) throw new Error('User not logged in.');
    if (!project.owner.some(ownerId => ownerId === user)) {
      return Promise.reject('You are not the owner of this project.'); // 呼び出し元でしたほうが良い？
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid);
    return deleteDoc(projectRef);
  }

  // プロジェクトにメンバーを追加 (権限チェックは主にセキュリティルールで行う)
  async addMember(project: ProjectData, userIdToAdd: string): Promise<void> {
     if (!project.pjid || !userIdToAdd) return Promise.reject('Invalid arguments.');
     if(project.projectMembers.includes(userIdToAdd)) 
        return Promise.reject('User already in the project.');
     const user = this.authService.getCurrentUserId();
     if (!user) return Promise.reject('User not logged in.');
     if (!project.admin.some(adminId => adminId === user)) {
       return Promise.reject('You are not the admin of this project.'); // 呼び出し元でしたほうが良い？
     };
     const projectRef = doc(this.firestore, 'projects', project.pjid!);
     // arrayUnionで指定したユーザーIDを projectMembers 配列に追加
     return updateDoc(projectRef, { projectMembers: arrayUnion(userIdToAdd) });
  }

  // プロジェクトからメンバーを削除 (権限チェックは主にセキュリティルールで行う)
  async removeMember(project: ProjectData, userIdToRemove: string): Promise<void> {
    if (!project.pjid || !userIdToRemove) return Promise.reject('Invalid arguments.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.admin.some(adminId => adminId === user)) {
      return Promise.reject('You are not the admin of this project.'); // 呼び出し元でしたほうが良い？
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid);
    // arrayRemoveで指定したユーザーIDを projectMembers 配列から削除
    return updateDoc(projectRef, { projectMembers: arrayRemove(userIdToRemove) });
  }

  // メンバーをプロジェクトの管理者にする
  async addAdmin(project: ProjectData, userIdToAdd: string): Promise<void> {
    if (!userIdToAdd) return Promise.reject('user ID is missing.');
    if(!project.projectMembers.includes(userIdToAdd)) 
       return Promise.reject('User is not in the project.');
    if(project.admin.includes(userIdToAdd)) 
        return Promise.reject('User already in the project.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.admin.some(adminId => adminId === user)) {
      return Promise.reject('You are not the admin of this project.'); // 呼び出し元でしたほうが良い？
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { admin: arrayUnion(userIdToAdd) });
  }

  // メンバーをプロジェクトのオーナーにする
  async addOwner(project: ProjectData, userIdToAdd: string): Promise<void> {
    if (!userIdToAdd) return Promise.reject('user ID is missing.');
    if(!project.projectMembers.includes(userIdToAdd)) 
        return Promise.reject('User is not in the project.');
    if(project.admin.includes(userIdToAdd)) 
        return Promise.reject('User already in the project.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.owner.some(ownerId => ownerId === user)) {
        return Promise.reject('You are not the owner of this project.'); // 呼び出し元でしたほうが良い？
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { owner: arrayUnion(userIdToAdd) });
  }
}
