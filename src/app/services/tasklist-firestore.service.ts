import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,        // コレクション参照取得
  collectionData,    // コレクションデータ(Observable)取得
  doc,               // ドキュメント参照取得
  addDoc,            // ドキュメント追加 (Create)
  updateDoc,         // ドキュメント更新 (Update)
  deleteDoc,         // ドキュメント削除 (Delete)
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { TaskLists } from '../tasklist/tasklist.component';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class TasklistFirestoreService {
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  private get collectionPath() {
    const userId = this.auth.currentUser?.uid;
    if (!userId) {
      throw new Error('ユーザーが認証されていません');
    }
    return `users/${userId}/tasklist`;
  }

  // Taskリストの取得
  getTasks(): Observable<TaskLists[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionPath);
      return collectionData(collectionRef, { idField: 'id' }) as Observable<TaskLists[]>; // idも取得しないと、CRUDするときにエラーが出る（ID取得できていないからコレクションパスがundefinedになる）
    } catch (error) {
      console.error('タスク取得エラー:', error);
      return new Observable<TaskLists[]>(); // 空のObservableを返す
    }
  }

  // 新しいTaskの追加
  async addTask(title: string, date: string, time: string, memo: string) {
    const collectionRef = collection(this.firestore, this.collectionPath);
    const docRef = await addDoc(collectionRef, {
      title,
      date,
      time,
      memo,
      completed: false,
      order: 0,
    });
    return docRef.id;
  }

  // Taskの更新
  async updateTask(taskId: string, data: any) {
    const docRef = doc(this.firestore, this.collectionPath, taskId);
    await updateDoc(docRef, data);
  }

  // Taskの削除
  async deleteTask(taskId: string) {
    try {
      const docRef = doc(this.firestore, this.collectionPath, taskId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('タスク削除エラー:', error);
      throw error;
    }
  }
}
