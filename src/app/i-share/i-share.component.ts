import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SpaceData, Comment } from '../parent-i-share/parent-i-share.component';
import { IShareFirestoreService, FileStorageService } from '../services/ishare-firestore.service';

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
  showPopover: boolean = false;


  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private ishareFirestoreService: IShareFirestoreService,
    private fileStorageService: FileStorageService
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
    if (this.fileUrl) {
      await this.fileStorageService.deleteFile(this.fileUrl);
      this.fileUrl = null;
    };
    this.showPopover = false;
  }

  // コメント送信時の処理
  async onSend() {
    console.log(this.commentText);
    if (!this.commentText.trim() || !this.space?.dbid) return;
    let fileUrl = this.fileUrl;
    if (this.fileData) {
      fileUrl = await this.fileStorageService.uploadFile(this.fileData, this.fileName || '');
    }
    const now = new Date();
    const dateStr = now.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const commentData = {
      user: this.userName,
      date: dateStr,
      text: this.commentText,
      fileName: this.fileName || null,
      fileUrl: fileUrl || null,
    };
    // 編集
    if (this.editingCommentId) {
      this.comments.push(commentData);
      await this.ishareFirestoreService.updateComment(this.space.dbid, this.editingCommentId, commentData);
      this.editingCommentId = null;
    // 新規
    } else {
      this.comments.push(commentData);
      await this.ishareFirestoreService.addComment(this.space.dbid, commentData);
    }
    this.commentText = '';
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;
    this.showPopover = false;
    console.log(this.commentText);
  }

  // スペースを閉じる処理
  goParentIShare(): void {
    this.ishareFirestoreService.goParentIShare();
  }

  // 初期化
  ngOnInit() {
    const dbid = this.route.snapshot.paramMap.get('dbid');
    console.log(dbid);
    if (!dbid) return;
    this.ishareFirestoreService.getIShareSpaces().subscribe((spaces) => {
      this.space = spaces.find(space => space.dbid === dbid) || null;
      console.log(this.space);
    });
    this.ishareFirestoreService.getComments(dbid).subscribe(
      (comments: Comment[]) => {
        this.comments = comments;
        console.log(this.comments);
      },
      (error) => {
        console.error('コメント取得エラー:', error);
      }
    );
  }

  // コメント削除時の処理
  async onDeleteComment(comment: any) {
    if (!this.space?.dbid || !comment.id) return;
    if (comment.fileUrl) {
      await this.fileStorageService.deleteFile(comment.fileUrl);
    }
    this.comments.splice(this.comments.indexOf(comment), 1);
    await this.ishareFirestoreService.deleteComment(this.space.dbid, comment.id);
  }

  // コメント編集時の処理
  onEditComment(comment: any) {
    this.editingCommentId = comment.id;
    this.commentText = comment.text;
    this.fileName = comment.fileName || null;
    this.fileUrl = comment.fileUrl || null;
  }
}
