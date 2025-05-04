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
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { SpaceData } from '../parent-i-share/parent-i-share.component';
import { Storage, ref, uploadBytes, getDownloadURL, getMetadata, FullMetadata, deleteObject } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
@Injectable({
  providedIn: 'root'
})
export class IShareFirestoreService {
  constructor(private firestore: Firestore, private auth: Auth, private storage: Storage) {}

  // 情報共有スペースのコレクションパス
  get collectionPath() {
    const userId = this.auth.currentUser?.uid;
    if (!userId) throw new Error('ユーザーが認証されていません');
    return `users/${userId}/ishareSpaces`;
  }

  // 情報共有スペースの取得
  getIShareSpaces(): Observable<SpaceData[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionPath);
      const q = query(collectionRef, orderBy('createdAt', 'asc'));
      return collectionData(q, { idField: 'dbid' }) as Observable<SpaceData[]>;
    } catch (error) {
      console.error('情報共有スペース取得エラー:', error);
      return new Observable<SpaceData[]>();
    }
  }

  // 新しい情報共有スペースの追加
  async addIShareSpace(space: Omit<SpaceData, 'dbid'>) {
    try {
      const collectionRef = collection(this.firestore, this.collectionPath);
      const docRef = await addDoc(collectionRef, space);
      return docRef.id;
    } catch (error) {
      console.error('情報共有スペース追加エラー:', error);
      throw error;
    }
  }

  // 情報共有スペースの更新
  async updateIShareSpace(spaceId: string, data: Partial<SpaceData>) {
    try {
      const docRef = doc(this.firestore, this.collectionPath, spaceId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('情報共有スペース更新エラー:', error);
      throw error;
    }
  }

  // 情報共有スペースの削除
  async deleteIShareSpace(spaceId: string) {
    try {
      const docRef = doc(this.firestore, this.collectionPath, spaceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('情報共有スペース削除エラー:', error);
      throw error;
    }
  }

  // コメントのコレクションパス
  private getCommentsCollectionPath(dbid: string): string {
    return `${this.collectionPath}/${dbid}/comments`;
  }

  // コメントの追加
  async addComment(spaceId: string, comment: any) {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    await addDoc(commentsRef, comment);
  }

  // コメントの取得
  getComments(spaceId: string) {
    const commentsRef = collection(this.firestore, this.getCommentsCollectionPath(spaceId));
    const q = query(commentsRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' });
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
}



@Injectable({ providedIn: 'root' })
export class FileStorageService {
  constructor(private storage: Storage, private auth: Auth) {}

  // ファイル保存先のパス
  getfileStoragePath(fileName: string) {
    const userId = this.auth.currentUser?.uid;
    if (!userId) throw new Error('ユーザーが認証されていません');
    // uuidでユニークなIDを生成
    const uniqueId = uuidv4();
    return `kensyu10097.firebasestorage.app/${userId}/${uniqueId}_${fileName}`;
  }

  // ファイルのアップロード
  async uploadFile(file: File, fileName: string): Promise<string> {
    const path = this.getfileStoragePath(fileName);
    console.log(path);
    const storageRef = ref(this.storage, path);
    let contentType = file.type;
    if (contentType === 'text/plain') {
      contentType += ';charset=utf-8';
    };
    const metadata = { contentType: contentType };
    console.log(metadata);
    await uploadBytes(storageRef, file, metadata);
    console.log(storageRef);
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
