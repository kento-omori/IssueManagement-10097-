import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Routes } from '@angular/router';
@Component({
  selector: 'app-i-share',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './i-share.component.html',
  styleUrl: './i-share.component.css'
})
export class IShareComponent {
  comments: { user: string, date: string, text: string, fileName?: string, fileUrl?: string }[] = [];
  commentText: string = '';
  fileName: string = '';
  fileData: File | null = null;
  showPopover: boolean = false;

  constructor(private authService: AuthService) {}

  // ユーザー名をAuthServiceから取得
  get userName(): string {
    // 例: displayNameがなければemailやuidを使う
    const user = this.authService.getCurrentUser();
    return user?.displayName || user?.email || user?.uid || '匿名ユーザー';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileName = input.files[0].name;
      this.fileData = input.files[0];
    } else {
      this.fileName = '';
      this.fileData = null;
    }
  }

  onFileRemove() {
    this.fileName = '';
    this.fileData = null;
    this.showPopover = false;
  }

  async onSend() {
    if (!this.commentText.trim()) return;

    let fileUrl: string | undefined = undefined;

    // ファイル添付がある場合はアップロード処理（例：Firebase Storageなど）
    if (this.fileData) {
      // ここは実際のストレージサービスに合わせて書き換えてください
      // 例: fileUrl = await this.uploadFile(this.fileData);
      // 今回はダミーでファイル名のみ保存
      fileUrl = this.fileName;
    }

    const now = new Date();
    const dateStr = now.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.comments.push({
      user: this.userName,
      date: dateStr,
      text: this.commentText,
      fileName: this.fileName,
      fileUrl: fileUrl
    });

    this.commentText = '';
    this.fileName = '';
    this.fileData = null;
    this.showPopover = false;
  }

  // 例: ファイルアップロード用のダミーメソッド
  // async uploadFile(file: File): Promise<string> {
  //   // Firebase Storage等にアップロードし、ダウンロードURLを返す
  //   return 'アップロード後のファイルURL';
  // }
}
