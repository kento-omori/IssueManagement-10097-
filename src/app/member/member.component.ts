import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectFirestoreService } from '../services/project-firestore.service';
import { NavigationService } from '../services/navigation.service';
import { ProjectData, ProjectMember } from '../project-home/project-home.component';
import { UserService } from '../services/user.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-member',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member.component.html',
  styleUrl: './member.component.css'
})
export class MemberComponent implements OnInit, OnDestroy {
  project: ProjectData[] = [];
  projectMembers: ProjectMember[] = [];
  searchInput: string = '';
  searchedUsers: any[] = [];
  selectedUser: any = null;
  searchMessage: string = '';
  addMemberMessage: string = '';
  addAdminMessage: string = '';
  addOwnerMessage: string = '';
  isSuccess: boolean = false;
  isAdding: boolean = false;
  isCurrentUserAdmin: boolean = false;
  isCurrentUserOwner: boolean = false;
  showMemberListForAdmin: boolean = false;
  selectedAdminUser: any = null;
  adminInputValue: string = '';
  showMemberListForOwner: boolean = false;
  selectedOwnerUser: any = null;
  ownerInputValue: string = '';
  showMemberListForRemove: boolean = false;
  selectedRemoveUser: any = null;
  removeInputValue: string = '';
  removeMemberMessage: string = '';
  deleteProjectMessage: string = '';
  isDeletingProject: boolean = false;
  private memberSubscription: Subscription | null = null;

  constructor(
    private projectFirestoreService: ProjectFirestoreService,
    private navigationService: NavigationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (projectId) {
      this.memberSubscription = this.projectFirestoreService.getProjectMemberDetails(projectId).subscribe({
        next: (memberDetails) => {
          this.projectMembers = memberDetails;
          // 現在のユーザーがメンバーでなくなった場合、プロジェクト一覧に遷移
          const currentUserId = this.navigationService.selectedUserIdSource.getValue();
          if (currentUserId && !memberDetails.some(member => member.uid === currentUserId)) {
            console.log('メンバーから削除されました。プロジェクト一覧に遷移します。');
            this.projectFirestoreService.goProjectHome();
          }
        },
        error: (error) => {
          console.error('メンバー情報の取得に失敗しました:', error);
          // エラーが発生した場合もプロジェクト一覧に遷移
          this.projectFirestoreService.goProjectHome();
        }
      });
    }
    // 管理者・オーナー権限チェック
    this.checkAdminAndOwner(projectId!);
  }

  ngOnDestroy(): void {
    if (this.memberSubscription) {
      this.memberSubscription.unsubscribe();
    }
  }

  // ログインしているユーザーが管理者・オーナーかどうかを判定
  async checkAdminAndOwner(projectId: string): Promise<void> {
    const currentUserId = this.navigationService.selectedUserIdSource.getValue();
    if (!currentUserId) {
      this.isCurrentUserAdmin = false;
      this.isCurrentUserOwner = false;
      return;
    }
    const project = await firstValueFrom(this.projectFirestoreService.getProjectById(projectId));
    this.isCurrentUserAdmin = !!(project && project.admin && project.admin.includes(currentUserId));
    this.isCurrentUserOwner = !!(project && project.owner && project.owner.includes(currentUserId));
  }

  // ダッシュボードに遷移
  goDashboad(): void {
    this.projectFirestoreService.goDashboad();
  }

  goProjectHome(): void {
    this.projectFirestoreService.goProjectHome();
  }

  // ユーザーを検索
  async searchUser(): Promise<void> {
    this.searchedUsers = [];
    this.selectedUser = null;
    this.searchMessage = '';
    this.addMemberMessage = '';
    if (!this.searchInput) {
      this.searchMessage = '検索条件を入力してください。';
      return;
    }
    try {
      let users = [];
      if (this.searchInput.includes('@')) {
        users = await this.userService.searchUser(this.searchInput, '', '');
      } else {
        users = await this.userService.searchUser('', '', this.searchInput);
        if (!users || users.length === 0) {
          users = await this.userService.searchUser('', this.searchInput, '');
        }
      }
      if (users && users.length > 0) {
        this.searchedUsers = users;
        this.searchMessage = '';
      } else {
        this.searchMessage = '該当するユーザーが見つかりませんでした。';
      }
    } catch (error) {
      this.searchMessage = '検索中にエラーが発生しました。';
    }
  }

  selectUser(user: any) {
    this.selectedUser = user;
  }

  // メンバーを追加
  async onAddMemberSubmit(): Promise<void> {
    if (!this.selectedUser) return Promise.resolve();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId) return Promise.resolve();
    if (this.projectMembers.some(member => member.uid === this.selectedUser.uid)) {
      this.isSuccess = false;
      this.addMemberMessage = '※すでにこのプロジェクトのメンバーです';
      return;
    }
    try {
      this.isAdding = true;
      this.addMemberMessage = '';
      await this.projectFirestoreService.addMember(projectId, this.selectedUser.uid);
      this.isAdding = false;
      this.isSuccess = true;
      this.addMemberMessage = 'メンバーを追加しました。';
      this.selectedUser = null;
    } catch (error) {
      this.isAdding = false;
      this.isSuccess = false;
      this.addMemberMessage = '追加に失敗しました。';
    }
  }

  // 管理者リスト（ドロップダウン）を開く
  onAdminInputFocus() {
    this.addAdminMessage = '';
    this.showMemberListForAdmin = true;
  }

  // メンバーリスト（ドロップダウン）を閉じる
  onAdminInputBlur() {
    setTimeout(() => {
      this.showMemberListForAdmin = false;
    }, 200);
  }

  // ドロップリストから管理者を選択
  selectAdminUser(user: any) {
    this.selectedAdminUser = user;
    this.adminInputValue = `${user.displayName}（${user.email}）`;
    this.showMemberListForAdmin = false;
  }

  // 管理者を追加
  async onAddAdminSubmit(): Promise<void> {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId || !this.selectedAdminUser) return;
    if (!this.isCurrentUserAdmin) {
      this.addAdminMessage = '※管理者権限が必要です';
      return;
    }
    // すでに管理者かどうかをチェック
    if (this.selectedAdminUser.isAdmin) {
      this.addAdminMessage = '※すでにこのプロジェクトの管理者です';
      return;
    }
    try {
      this.isAdding = true;
      this.addAdminMessage = '';
      await this.projectFirestoreService.addAdmin(projectId, this.selectedAdminUser.uid);
      this.isAdding = false;
      this.isSuccess = true;
      this.addAdminMessage = '管理者権限を追加しました。';
      this.selectedAdminUser = null;
      this.adminInputValue = '';
    } catch (error) {
      this.isAdding = false;
      this.isSuccess = false;
      this.addAdminMessage = '追加に失敗しました。';
    }
  }

  // オーナーリスト（ドロップダウン）を開く
  onOwnerInputFocus() {
    this.addOwnerMessage = '';
    this.showMemberListForOwner = true;
  }

  // メンバーリスト（ドロップダウン）を閉じる
  onOwnerInputBlur() {
    setTimeout(() => {
      this.showMemberListForOwner = false;
    }, 200);
  }

  // ドロップリストからオーナーを選択
  selectOwnerUser(user: any) {
    this.selectedOwnerUser = user;
    this.ownerInputValue = `${user.displayName}（${user.email}）`;
    this.showMemberListForOwner = false;
  }

  // オーナーを追加
  async onAddOwnerSubmit(): Promise<void> {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId || !this.selectedOwnerUser) return;
    if (!this.isCurrentUserOwner) {
      this.addOwnerMessage = '※オーナー権限が必要です';
      return;
    }
    // すでにオーナーかどうかをチェック
    if (this.selectedOwnerUser.isOwner) {
      this.addOwnerMessage = '※すでにこのプロジェクトのオーナーです';
      return;
    }
    try {
      this.isAdding = true;
      this.addOwnerMessage = '';
      await this.projectFirestoreService.addOwner(projectId, this.selectedOwnerUser.uid);
      this.isAdding = false;
      this.isSuccess = true;
      this.addOwnerMessage = 'オーナー権限を追加しました。';
      this.selectedOwnerUser = null;
      this.ownerInputValue = '';
    } catch (error) {
      this.isAdding = false;
      this.isSuccess = false;
      this.addOwnerMessage = '追加に失敗しました。オーナー権限が必要です。';
      console.error('addOwner error:', error);
    }
  }

  // 管理者権限を削除
  async onRemoveAdminSubmit(): Promise<void> {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId || !this.selectedAdminUser) return;
    if (!this.isCurrentUserAdmin) {
      this.addAdminMessage = '※管理者権限が必要です';
      return;
    }
    // すでに管理者でない場合
    if (!this.selectedAdminUser.isAdmin) {
      this.addAdminMessage = '※このユーザーは管理者ではありません';
      return;
    }
    // 管理者が1人しかいない場合は削除不可
    if (this.adminCount === 1 && this.selectedAdminUser.isAdmin) {
      this.addAdminMessage = '※管理者が1人しかいないため削除できません';
      return;
    }
    try {
      this.isAdding = true;
      this.addAdminMessage = '';
      await this.projectFirestoreService.removeAdmin(projectId, this.selectedAdminUser.uid);
      this.isAdding = false;
      this.isSuccess = true;
      this.addAdminMessage = '管理者権限を削除しました。';
      this.selectedAdminUser = null;
      this.adminInputValue = '';
    } catch (error) {
      this.isAdding = false;
      this.isSuccess = false;
      this.addAdminMessage = '削除に失敗しました。';
    }
  }

  // オーナー権限を削除
  async onRemoveOwnerSubmit(): Promise<void> {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId || !this.selectedOwnerUser) return;
    if (!this.isCurrentUserOwner) {
      this.addOwnerMessage = '※オーナー権限が必要です';
      return;
    }
    // すでにオーナーでない場合
    if (!this.selectedOwnerUser.isOwner) {
      this.addOwnerMessage = '※このユーザーはオーナーではありません';
      return;
    }
    // オーナーが1人しかいない場合は削除不可
    if (this.ownerCount === 1 && this.selectedOwnerUser.isOwner) {
      this.addOwnerMessage = '※オーナーが1人しかいないため削除できません';
      return;
    }
    try {
      this.isAdding = true;
      this.addOwnerMessage = '';
      await this.projectFirestoreService.removeOwner(projectId, this.selectedOwnerUser.uid);
      this.isAdding = false;
      this.isSuccess = true;
      this.addOwnerMessage = 'オーナー権限を削除しました。';
      this.selectedOwnerUser = null;
      this.ownerInputValue = '';
    } catch (error) {
      this.isAdding = false;
      this.isSuccess = false;
      this.addOwnerMessage = '削除に失敗しました。';
    }
  }

  // メンバー削除用
  onRemoveInputFocus() {
    this.removeMemberMessage = '';
    this.showMemberListForRemove = true;
  }

  onRemoveInputBlur() {
    setTimeout(() => {
      this.showMemberListForRemove = false;
    }, 200);
  }

  selectRemoveUser(user: any) {
    this.selectedRemoveUser = user;
    this.removeInputValue = `${user.displayName}（${user.email}）`;
    this.showMemberListForRemove = false;
  }

  async onRemoveMemberSubmit(): Promise<void> {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId || !this.selectedRemoveUser) return;
    if (!this.isCurrentUserAdmin) {
      this.removeMemberMessage = '※管理者権限が必要です';
      return;
    }
    try {
      this.isAdding = true;
      this.removeMemberMessage = '';
      await this.projectFirestoreService.removeMemberById(projectId, this.selectedRemoveUser.uid);
      this.isAdding = false;
      this.isSuccess = true;
      this.removeMemberMessage = 'メンバーを削除しました。';
      this.selectedRemoveUser = null;
      this.removeInputValue = '';
    } catch (error) {
      this.isAdding = false;
      this.isSuccess = false;
      this.removeMemberMessage = '削除に失敗しました。';
    }
  }

  get adminCount(): number {
    return this.projectMembers.filter(m => m.isAdmin).length;
  }

  get ownerCount(): number {
    return this.projectMembers.filter(m => m.isOwner).length;
  }

  // プロジェクト削除用
  async onDeleteProject(): Promise<void> {
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId) return;
    if (!this.isCurrentUserOwner) {
      this.deleteProjectMessage = '※オーナー権限が必要です';
      return;
    }
    // 確認ダイアログ
    const confirmed = window.confirm('本当に削除しますか？この操作は元に戻せません。');
    if (!confirmed) return;
    try {
      this.isDeletingProject = true;
      this.deleteProjectMessage = '';
      const project = await firstValueFrom(this.projectFirestoreService.getProjectById(projectId));
      if (!project) {
        this.deleteProjectMessage = 'プロジェクトが見つかりませんでした。';
        this.isDeletingProject = false;
        return;
      }
      await this.projectFirestoreService.deleteProject(project);
      this.isDeletingProject = false;
      this.deleteProjectMessage = 'プロジェクトを削除しました。';
      // プロジェクトホームに遷移
      this.projectFirestoreService.goProjectHome();
    } catch (error) {
      this.isDeletingProject = false;
      this.deleteProjectMessage = '削除に失敗しました。';
    }
  }
}
