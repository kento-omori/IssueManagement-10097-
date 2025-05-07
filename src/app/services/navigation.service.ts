import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  public selectedUserIdSource = new BehaviorSubject<string | null>(null);
  public selectedUserId$ = this.selectedUserIdSource.asObservable();

  public selectedProjectIdSource = new BehaviorSubject<string | null>(null);
  public selectedProjectId$ = this.selectedProjectIdSource.asObservable();

// 「選択中のユーザーID」や「選択中のプロジェクトID」など、
//  アプリ内の“状態”を保持・通知するサービスです。
  setSelectedUserId(userId: string) {
    this.selectedUserIdSource.next(userId);
    console.log('Selected user ID set to:', userId);
  };

  setSelectedProjectId(projectId: string | null) {
    this.selectedProjectIdSource.next(projectId);
    console.log('Selected project ID set to:', projectId);
  };

}