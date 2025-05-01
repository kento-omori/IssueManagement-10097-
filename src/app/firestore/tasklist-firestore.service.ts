import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,        // コレクション参照取得
  collectionData,    // コレクションデータ(Observable)取得
  doc,               // ドキュメント参照取得
  addDoc,            // ドキュメント追加 (Create)
  updateDoc,         // ドキュメント更新 (Update)
  deleteDoc,         // ドキュメント削除 (Delete)
  DocumentReference, // ドキュメント参照の型
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { TaskLists } from '../tasklist/tasklist.component';

@Injectable({
  providedIn: 'root'
})
export class TasklistFirestoreService {
  private collectionName = "tasklist";

  constructor(private firestore: Firestore) {}

  // Taskリストの取得
  getTasks(): Observable<TaskLists[]> {
    const tasksCollection = collection(this.firestore, this.collectionName);
    return collectionData(tasksCollection, { idField: 'id' }) as Observable<TaskLists[]>;
  }

  // 新しいTaskの追加
  async addTask(title:string, date:string, time:string, memo:string): Promise<DocumentReference> {
    const task: Omit<TaskLists, 'id'> = {
      title,date,time,memo,completed:false,order:0
    };
    const tasksCollection = collection(this.firestore, this.collectionName);
    return addDoc(tasksCollection, task);
  };

  // Taskの更新
  async updateTask(id: string, updates: Partial<TaskLists>): Promise<void> {
    const taskRef = doc(this.firestore, this.collectionName, id);
    const updateData = {
    ...updates,
    };
    return updateDoc(taskRef, updateData);
  }

  // Taskの削除
  async deleteTask(id: string): Promise<void> {
    const taskRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(taskRef);
  }

}
