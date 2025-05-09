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
  arrayRemove,
  getDocs
} from '@angular/fire/firestore';
import { Observable, of, firstValueFrom } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { ProjectData, ProjectMember } from '../project-home/project-home.component';
import { AuthService } from './auth.service';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { User } from '@angular/fire/auth';
import { UserService } from './user.service';
@Injectable({
  providedIn: 'root'
})
export class ProjectFirestoreService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private authService: AuthService,
    private navigationService: NavigationService,
    private router: Router,
    private userService: UserService
  ) {}

  projectData: ProjectData[] = [];
  projectMembers: ProjectMember[] = [];

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

  // メンバーをプロジェクトの管理者にする
  async addAdmin(projectId: string, userIdToAdd: string): Promise<void> {
    if (!userIdToAdd) return Promise.reject('user ID is missing.'); //ユーザーIDがない場合→はじく
    const project = await firstValueFrom(this.getProjectById(projectId));
    if (!project) return Promise.reject('Project not found.'); //プロジェクトがない場合→はじく
    if(!project.projectMembers.includes(userIdToAdd)) 
       return Promise.reject('User is not in the project.'); //メンバーになっていない場合→はじく
    if(project.admin.includes(userIdToAdd)) 
        return Promise.reject('User already in the project.'); //すでに管理者になっている場合→はじく
    const user = this.authService.getCurrentUserId(); // ログインしているユーザーIDを取得
    if (!user) return Promise.reject('User not logged in.'); // ログインしていない場合→はじく
    if (!project.admin.some(adminId => adminId === user)) {
      return Promise.reject('You are not the admin of this project.'); // 管理者権限がなければはじく
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { admin: arrayUnion(userIdToAdd) }); // 管理者権限を追加
  }

  // メンバーをプロジェクトのオーナーにする
  async addOwner(projectId: string, userIdToAdd: string): Promise<void> {
    if (!userIdToAdd) return Promise.reject('user ID is missing.');
    const project = await firstValueFrom(this.getProjectById(projectId));
    if (!project) return Promise.reject('Project not found.');
    if(!project.projectMembers.includes(userIdToAdd)) 
        return Promise.reject('User is not in the project.');
    if(project.owner.includes(userIdToAdd)) 
        return Promise.reject('User already in the project.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.owner.some(ownerId => ownerId === user)) {
        return Promise.reject('You are not the owner of this project.');
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { owner: arrayUnion(userIdToAdd) });
  }

  goTodo(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    this.router.navigate([`projects/${projectId}/todo`]);
  }

  goGanttChart(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    this.router.navigate([`projects/${projectId}/gantt-chart`]);
  }

  goParentIShare(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    this.router.navigate([`projects/${projectId}/parent-i-share`]);
  }
  
  goChat(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    this.router.navigate([`projects/${projectId}/chat`]);
  }

  goDashboad(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    this.router.navigate([`projects/${projectId}/project-base`]);
  }

  goMember(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    this.router.navigate([`projects/${projectId}/member`]);
  }

  goProjectHome(): void {
    this.router.navigate([`projects`]);
  }

  // プロジェクトのメンバー情報（admin/owner判定付き）を取得
  getProjectMemberDetails(pjid: string) {
    return this.getProjectById(pjid).pipe(
      switchMap((project: ProjectData | undefined) => {
        if (!project) return of([]);
        const memberIds = project.projectMembers;
        return this.getUsersByIds(memberIds).pipe(
          map(users => users.map(user => ({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            isAdmin: project.admin.includes(user.uid),
            isOwner: project.owner.includes(user.uid)
          })))
        );
      })
    );
  }

  // プロジェクトIDからプロジェクトデータを取得
  getProjectById(pjid: string): Observable<ProjectData | undefined> {
    return this.getProjects().pipe(
      map(projects => projects.find(p => p.pjid === pjid))
    );
  }

  // ユーザID一覧からユーザ情報を取得
  getUsersByIds(userIds: string[]): Observable<User[]> {
    const collectionRef = collection(this.firestore, 'users');
    const q = query(collectionRef, where('uid', 'in', userIds));
    return collectionData(q, { idField: 'uid' }) as Observable<User[]>;
  }

  // プロジェクトにメンバーを追加
  async addMember(projectId: string, userIdToAdd: string): Promise<void> {
    if (!projectId || !userIdToAdd) return Promise.reject('Invalid arguments.');
    const project = await firstValueFrom(this.getProjectById(projectId));
    if (!project) return Promise.reject('Project not found.');
    if(project.projectMembers.includes(userIdToAdd)) 
       return Promise.reject('User already in the project.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.admin.some(adminId => adminId === user)) {
      return Promise.reject('You are not the admin of this project.');
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { projectMembers: arrayUnion(userIdToAdd) });    // arrayUnionで指定したユーザーIDを projectMembers 配列に追加
 }

  // 管理者権限を削除
  async removeAdmin(projectId: string, userIdToRemove: string): Promise<void> {
    if (!userIdToRemove) return Promise.reject('user ID is missing.');
    const project = await firstValueFrom(this.getProjectById(projectId));
    if (!project) return Promise.reject('Project not found.');
    if(!project.admin.includes(userIdToRemove)) 
        return Promise.reject('User is not an admin.');
    const user = this.authService.getCurrentUserId(); // ログインしているユーザーIDを取得
    if (!user) return Promise.reject('User not logged in.'); // ログインしていない場合→はじく
    if (!project.admin.some(adminId => adminId === user)) {
      return Promise.reject('You are not the admin of this project.'); // 管理者権限がなければはじく
    };
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { admin: arrayRemove(userIdToRemove) }); // 管理者権限を削除
  }

  // オーナー権限を削除
  async removeOwner(projectId: string, userIdToRemove: string): Promise<void> {
    if (!userIdToRemove) return Promise.reject('user ID is missing.');
    const project = await firstValueFrom(this.getProjectById(projectId));
    if (!project) return Promise.reject('Project not found.');
    if (!project.owner.includes(userIdToRemove))
      return Promise.reject('User is not an owner.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.owner.some(ownerId => ownerId === user)) {
      return Promise.reject('You are not the owner of this project.');
    }
    const projectRef = doc(this.firestore, 'projects', project.pjid!);
    return updateDoc(projectRef, { owner: arrayRemove(userIdToRemove) });
  }

  // メンバーをプロジェクトから削除（projectId, userId指定）
  async removeMemberById(projectId: string, userIdToRemove: string): Promise<void> {
    const project = await firstValueFrom(this.getProjectById(projectId));
    if (!project) return Promise.reject('Project not found.');
    return this.removeMember(project, userIdToRemove);
  }
  
  // プロジェクトからメンバーを削除 (権限チェックは主にセキュリティルールで行う)
  async removeMember(project: ProjectData, userIdToRemove: string): Promise<void> {
    if (!project.pjid || !userIdToRemove) return Promise.reject('Invalid arguments.');
    const user = this.authService.getCurrentUserId();
    if (!user) return Promise.reject('User not logged in.');
    if (!project.admin.some(adminId => adminId === user)) {
      return Promise.reject('You are not the admin of this project.');
    }
    const projectRef = doc(this.firestore, 'projects', project.pjid);
    // projectMembers, admin, owner から指定したユーザーIDを削除
    return updateDoc(projectRef, {
      projectMembers: arrayRemove(userIdToRemove),
      admin: arrayRemove(userIdToRemove),
      owner: arrayRemove(userIdToRemove)
    });
  }
}
