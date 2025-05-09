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
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { SpaceData } from '../parent-i-share/parent-i-share.component';
import { Comment } from '../parent-i-share/parent-i-share.component';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IShareFirestoreService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private storage: Storage,
    private navigationService: NavigationService,
    private router: Router
  ) {}

  // 情報共有スペースの取得
  getIShareSpaces(): Observable<SpaceData[]> {
    const collectionPath = this.getCollectionPath();
    try {
      const collectionRef = collection(this.firestore, collectionPath);
      const q = query(collectionRef, orderBy('createdAt', 'asc'));
      console.log('Query for spaces:', q);
      return collectionData(q, { idField: 'dbid' }) as Observable<SpaceData[]>;
    } catch (error) {
      console.error('情報共有スペース取得エラー:', error);
      return new Observable<SpaceData[]>();
    }
  }

  // 新しい情報共有スペースの追加
  async addIShareSpace(space: Omit<SpaceData, 'dbid'>) {
    const collectionPath = this.getCollectionPath();
    try {
      const collectionRef = collection(this.firestore, collectionPath);
      const docRef = await addDoc(collectionRef, space);
      return docRef.id;
    } catch (error) {
      console.error('情報共有スペース追加エラー:', error);
      throw error;
    }
  }

  // 情報共有スペースの更新
  async updateIShareSpace(spaceId: string, data: Partial<SpaceData>) {
    const collectionPath = this.getCollectionPath();
    try {
      const docRef = doc(this.firestore, collectionPath, spaceId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('情報共有スペース更新エラー:', error);
      throw error;
    }
  }

  // 情報共有スペースの削除
  async deleteIShareSpace(spaceId: string) {
    const collectionPath = this.getCollectionPath();
    try {
      const docRef = doc(this.firestore, collectionPath, spaceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('情報共有スペース削除エラー:', error);
      throw error;
    }
  }

  // コメントのコレクションパス
  private getCommentsCollectionPath(dbid: string): string {
    const collectionPath = this.getCollectionPath();
    return `${collectionPath}/${dbid}/comments`;
  }

  // コメントの追加
  async addComment(spaceId: string, comment: any) {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    await addDoc(commentsRef, comment);
  }

  // コメントの取得
  getComments(spaceId: string):Observable<Comment[]> {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    const q = query(commentsRef, orderBy('date', 'asc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(comments => comments.map(comment => ({
        ...comment,
        date: comment['date'] instanceof Date ? comment['date'] : new Date(comment['date'].seconds * 1000),
        editedAt: comment['editedAt'] ? 
          (comment['editedAt'] instanceof Date ? 
            comment['editedAt'] : new Date(comment['editedAt'].seconds * 1000)) : 
          null
      })))
    ) as Observable<Comment[]>;
  }

  // コメントの削除
  async deleteComment(spaceId: string, commentId: string) {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    const docRef = doc(commentsRef, commentId);
    await deleteDoc(docRef);
  }

  // コメントの更新
  async updateComment(spaceId: string, commentId: string, comment: any) {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    const docRef = doc(commentsRef, commentId);
    await updateDoc(docRef, comment);
  }

  // コメントの編集
  async editComment(spaceId: string, commentId: string, text: string, editedBy: string) {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    const docRef = doc(commentsRef, commentId);
    await updateDoc(docRef, {
      text: text,
      edited: true,
      editedBy: editedBy,
      editedAt: new Date()
    });
  }

  getCollectionPath() {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;

    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/i-share`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/i-share`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    return collectionPath;
  };

  goDashboad(): void {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/private`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/project-base`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    this.router.navigate([collectionPath]);
  }

  goIShare(spaceId: string): void {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/i-share/${spaceId}`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/i-share/${spaceId}`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    this.router.navigate([collectionPath]);
  }

  goParentIShare(): void {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/parent-i-share`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/parent-i-share`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    this.router.navigate([collectionPath]);
  }
}

@Injectable({ providedIn: 'root' })
export class FileStorageService {
  constructor(
    private storage: Storage,
    private auth: Auth,
    private navigationService: NavigationService,
    private router: Router
  ) {}

  // ファイル保存先のパス
  getfileStoragePath(fileName: string) {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;

    // uuidでユニークなIDを生成
    const uniqueId = uuidv4();
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/i-share/${uniqueId}_${fileName}`; //kensyu10097.firebasestorage.app/を一時的に取っている
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/i-share/${uniqueId}_${fileName}`; //kensyu10097.firebasestorage.app/を一時的に取っている
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    return collectionPath;
  }

  // ファイルのアップロード
  async uploadFile(file: File, fileName: string): Promise<string> {
    const path = this.getfileStoragePath(fileName);
    const storageRef = ref(this.storage, path);
    let contentType = file.type;
    if (contentType === 'text/plain') {
      contentType += ';charset=utf-8';
    };
    const metadata = { contentType: contentType };
    await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(storageRef);
  }

  // ファイルのダウンロードURLの取得
  async getFileUrl(fileUrl: string): Promise<string> {
    const storageRef = ref(this.storage, fileUrl);
    return await getDownloadURL(storageRef);
  }
  
  // ファイルの削除
  async deleteFile(fileUrl: string): Promise<void> {
    const storageRef = ref(this.storage, fileUrl);
    await deleteObject(storageRef);
  }
}
