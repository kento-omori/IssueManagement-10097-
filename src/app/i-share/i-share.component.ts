import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SpaceData, Comment } from '../parent-i-share/parent-i-share.component';
import { IShareFirestoreService, FileStorageService } from '../services/ishare-firestore.service';
import { NavigationService } from '../services/navigation.service';

@Component({
  selector: 'app-i-share',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './i-share.component.html',
  styleUrl: './i-share.component.css'
})
export class IShareComponent implements OnInit {
  
  space: SpaceData | null = null;
  comments: Comment[] = [];
  editingCommentId: string | null = null;
  commentText: string = '';
  fileName: string | null = null;
  fileData: File | null = null;
  fileUrl: string | null = null;
  originalFileUrl: string | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private ishareFirestoreService: IShareFirestoreService,
    private fileStorageService: FileStorageService,
    private navigationService: NavigationService
  ) {}

  // ユーザー名をAuthServiceから取得
  get userName(): string {
    const user = this.authService.getCurrentUser();
    return user?.displayName || user?.email || user?.uid || '匿名ユーザー';
  }

  // ファイル選択時の処理
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileName = input.files[0].name;
      this.fileData = input.files[0];
    } else {
      this.fileName = null;
      this.fileData = null;
    }
  }

  // ファイル削除時の処理
  async onFileRemove() {
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;
  }

  // コメント送信時の処理
  async onSend() {
    if (!this.commentText.trim() && !this.fileData) return;
    let fileUrl = this.fileUrl;
    if (this.fileData) {
      fileUrl = await this.fileStorageService.uploadFile(this.fileData, this.fileName || '');
    }
    const now = new Date();
    const commentData = {
      id: this.editingCommentId || '',  // 編集時は既存のID、新規時は空文字
      user: this.userName,
      date: now,
      text: this.commentText,
      fileName: this.fileName || null,
      fileUrl: fileUrl || null,
      isDeleted: false,
      deletedBy: null,
      edited: false,
      editedBy: null,
      editedAt: null
    };
    // 編集
    if (this.editingCommentId) {
      const originalComment = this.comments.find(c => c.id === this.editingCommentId);
      const editedCommentData = {
        ...commentData,
        date: originalComment?.date || now,  // 元のコメントの日付を維持
        edited: true,
        editedBy: this.userName,
        editedAt: now
      };
      await this.ishareFirestoreService.updateComment(this.space!.dbid!, this.editingCommentId, editedCommentData);
      this.editingCommentId = null;
    // 新規
    } else {
      this.comments.push(commentData);
      await this.ishareFirestoreService.addComment(this.space!.dbid!, commentData);
    }
    this.commentText = '';
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;

    // コメントリストを更新
    this.ishareFirestoreService.getComments(this.space!.dbid!).subscribe(
      (comments) => {
        this.comments = comments;
      }
    );
  }

  // スペースを閉じる処理
  goParentIShare(): void {
    this.ishareFirestoreService.goParentIShare();
  }

  // 初期化
  ngOnInit() {
    const dbid = this.route.snapshot.paramMap.get('dbid');
    if (!dbid) return;
    this.ishareFirestoreService.getIShareSpaces().subscribe((spaces) => {
      this.space = spaces.find(space => space.dbid === dbid) || null;
    });
    this.ishareFirestoreService.getComments(dbid).subscribe(
      (comments: Comment[]) => {
        this.comments = comments;
      },
      (error) => {
        console.error('コメント取得エラー:', error);
      }
    );
  }

  // コメント削除時の処理
  async onDeleteComment(comment: any) {
    if (!this.space?.dbid || !comment.id) return;
    if (comment.user !== this.userName) return; // 他人のコメントは削除不可
    if (comment.fileUrl) {
      await this.fileStorageService.deleteFile(comment.fileUrl);
    }
    // 論理削除
    comment.isDeleted = true;
    comment.deletedBy = this.userName;
    await this.ishareFirestoreService.updateComment(this.space.dbid, comment.id, {
      isDeleted: true,
      deletedBy: this.userName
    });
  }

  // コメント編集時の処理
  onEditComment(comment: any) {
    this.editingCommentId = comment.id;
    this.commentText = comment.text;
    this.fileName = comment.fileName || null;
    this.fileUrl = comment.fileUrl || null;
    this.originalFileUrl = comment.fileUrl || null;
  }

  // 編集取消時の処理
  onCancelEdit() {
    this.editingCommentId = null;
    this.commentText = '';
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = this.originalFileUrl;
    this.originalFileUrl = null;
  }

  // 編集保存時の処理
  async onSaveEdit() {
    if (!this.editingCommentId || !this.commentText.trim()) {
      return;
    }
    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('ユーザーが認証されていません');
      }

      let fileUrl = this.fileUrl;
      let fileChanged = false;

      // 新しいファイルが選択された場合
      if (this.fileData) {
        fileUrl = await this.fileStorageService.uploadFile(this.fileData, this.fileName || '');
        fileChanged = true;
      }

      // ファイルが変更され、元のファイルが存在する場合は削除
      if (fileChanged && this.originalFileUrl) {
        await this.fileStorageService.deleteFile(this.originalFileUrl);
      }
      // ファイルが削除され、元のファイルが存在する場合は削除
      if (!fileUrl && this.originalFileUrl && !fileChanged) {
        await this.fileStorageService.deleteFile(this.originalFileUrl);
      }

      const editedCommentData = {
        text: this.commentText,
        fileName: this.fileName || null,
        fileUrl: fileUrl || null,
        edited: true,
        editedBy: currentUser.displayName || currentUser.email || '',
        editedAt: new Date()
      };

      await this.ishareFirestoreService.updateComment(
        this.space!.dbid!,
        this.editingCommentId,
        editedCommentData
      );

      // コメントリストを更新
      this.ishareFirestoreService.getComments(this.space!.dbid!).subscribe(
        (comments) => {
          this.comments = comments;
        }
      );

      this.editingCommentId = null;
      this.commentText = '';
      this.fileName = null;
      this.fileData = null;
      this.fileUrl = null;
      this.originalFileUrl = null;
    } catch (error) {
      console.error('コメントの編集に失敗しました:', error);
      // エラー処理を追加
    }
  }
}
