import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentReference,
  getDocs,
  getDoc,
  writeBatch,
  setDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Todo, GanttLink } from '../todo/todo.interface';

@Injectable({
  providedIn: 'root'
})
export class TodoFirestoreService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  private get collectionPath() {
    const userId = this.auth.currentUser?.uid;
    if (!userId) throw new Error('ユーザーが認証されていません');
    return `users/${userId}/todos`;
  }

  // Todoリストの取得
  getTodos(): Observable<Todo[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionPath);
      return collectionData(collectionRef, { idField: 'dbid' }) as Observable<Todo[]>; // dbidも取得しないと、CRUDするときにエラーが出る（ID取得できていないからコレクションパスがundefinedになる）
    } catch (error) {
      console.error('Todo取得エラー:', error);
      return new Observable<Todo[]>(); // 空のObservableを返す
    }
  }

  // 新しいTodoの追加
  async addTodo(todo: Omit<Todo,'dbid'>) {
    const collectionRef = collection(this.firestore, this.collectionPath);
    const docRef = await addDoc(collectionRef, {
      ...todo,
      // completed: false,
    });
    return docRef.id;
  }

  // Todoの更新
  async updateTodo(id: string, data: Partial<Todo>): Promise<void> {
    const todoRef = doc(this.firestore, this.collectionPath, id);
    await updateDoc(todoRef, data);
    // console.log('updateTodo', data.links);
  }

  // IDを指定してTodoを取得
  async getTodoById(id: string): Promise<Todo | null> {
    try {
      const todoRef = doc(this.firestore, this.collectionPath, id);
      const todoSnap = await getDoc(todoRef);
      
      if (todoSnap.exists()) {
        const data = todoSnap.data();
        return {
          id: parseInt(todoSnap.id),
          text: data['text'],
          category: data['category'],
          start_date: data['start_date'],
          end_date: data['end_date'],
          assignee: data['assignee'],
          status: data['status'],
          priority: data['priority'],
          progress: data['progress'],
          order: data['order'],
          links: data['links'] || []
        } as Todo;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting todo:', error);
      return null;
    }
  }

  // Todoの削除
  async deleteTodo(todoDbId: string) {
    try {
      const docRef = doc(this.firestore, this.collectionPath, todoDbId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Todo削除エラー:', error);
      throw error;
    }
  };

  // タスクの順番を更新（バッチ処理用）
  async batchUpdateOrder(updates: { dbid: string, order: number }[]) {
    const batch = writeBatch(this.firestore);
    updates.forEach(update => {
      const ref = doc(this.firestore, this.collectionPath, update.dbid);
      batch.update(ref, { order: update.order });
    });
    await batch.commit();
  }

  //  指定したタスク(dbid)のlinks配列にリンクを追加する
  async addLinkToTask(dbid: string, link: { id: string, source: string, target: string, type: string }) {
    const taskRef = doc(this.firestore, this.collectionPath, dbid);
    console.log('addLinkToTask taskRef:', taskRef.path);
    const taskSnap = await getDoc(taskRef);
    let links = [];
    if (taskSnap.exists()) {
      const data = taskSnap.data();
      links = Array.isArray(data['links']) ? data['links'] : [];
    }
    links.push(link);
    await setDoc(taskRef, { links }, { merge: true });
  }

  // 指定したタスク(dbid)のlinks配列からリンクを削除する
  async deleteLinkFromTask(dbid: string, linkId: string) {
    const taskRef = doc(this.firestore, this.collectionPath, dbid);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
      console.log('deleteLinkFromTask taskSnap:', taskSnap.data());
      const data = taskSnap.data();
      const links = Array.isArray(data['links']) ? data['links'] : [];
      const newLinks = links.filter((l: any) => String(l.id) !== String(linkId));
      await setDoc(taskRef, { links: newLinks }, { merge: true });
    }
  }
}