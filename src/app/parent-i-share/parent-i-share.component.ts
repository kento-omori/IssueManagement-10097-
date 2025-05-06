import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterOutlet, RouterLink } from '@angular/router';
import { IShareFirestoreService } from '../services/ishare-firestore.service';
import { Timestamp } from '@angular/fire/firestore';

// スペースデータの型
export interface SpaceData {
  dbid?: string; //firebaseデータベースID
  title: string; //情報共有スペースのタイトル
  description: string; //情報共有スペースの説明
  comments: Comment[];
  createdAt: Timestamp;
}

export interface Comment { //commentsの型
  user: string;
  date: string;
  text: string;
  fileName?: string | null;
  fileData?: File | null;
  fileUrl?: string | null;
}

@Component({
  selector: 'app-parent-i-share',
  standalone: true,
  imports: [ CommonModule, RouterLink,  FormsModule],
  templateUrl: './parent-i-share.component.html',
  styleUrl: './parent-i-share.component.css'
})
export class ParentIShareComponent implements OnInit {
  ishareSpaces: SpaceData[] = []; // firebaseから取得したデータを保持する配列
  newSpaceTitle: string = '';
  newSpaceDescription: string = '';
  @ViewChild('spaceForm') spaceForm!: NgForm;

  constructor(private ishareFirestoreService: IShareFirestoreService) { }

  ngOnInit(): void {
    this.ishareFirestoreService.getIShareSpaces().subscribe((spaces) => {
      this.ishareSpaces = spaces.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
    });
  }

  // 新しい情報共有スペースを追加するメソッド
  addSharingSpace(): void {
    const newSpace: SpaceData = {
      title: this.newSpaceTitle,
      description: this.newSpaceDescription,
      comments: [],
      createdAt: Timestamp.now(),
    };
    this.ishareSpaces.unshift(newSpace);
    this.ishareFirestoreService.addIShareSpace(newSpace);

    // フォームをリセット
    this.spaceForm.resetForm();
  }

  // 情報共有スペースを削除するメソッド
  deleteSharingSpace(spaceId: string): void {
    this.ishareFirestoreService.deleteIShareSpace(spaceId);
  }

}
