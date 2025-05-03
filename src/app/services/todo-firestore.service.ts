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
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Todo } from '../todo/todo.interface';

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
    console.log('getTodos');
    try {
      console.log('getTodos try');
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
          order: data['order']         
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

  async batchUpdateOrder(updates: { dbid: string, order: number }[]) {
    const batch = writeBatch(this.firestore);
    updates.forEach(update => {
      const ref = doc(this.firestore, this.collectionPath, update.dbid);
      batch.update(ref, { order: update.order });
    });
    await batch.commit();
  }
}
