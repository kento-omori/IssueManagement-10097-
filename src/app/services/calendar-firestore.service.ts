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
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { CalendarEvent } from '../calendar/calendar.component';

@Injectable({
  providedIn: 'root'
})
export class CalendarFirestoreService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  private get collectionPath() {
    const userId = this.auth.currentUser?.uid;
    if (!userId) throw new Error('ユーザーが認証されていません');
    return `users/${userId}/calendar`;
  }

  // カレンダーイベントの取得
  getCalendarEvents(): Observable<CalendarEvent[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionPath);
      return collectionData(collectionRef, { idField: 'id' }) as Observable<CalendarEvent[]>;
    } catch (error) {
      console.error('カレンダーイベント取得エラー:', error);
      return new Observable<CalendarEvent[]>();
    }
  }

  // 新しいカレンダーイベントの追加
  async addCalendarEvent(event: Omit<CalendarEvent, 'id'>) {
    try {
      const collectionRef = collection(this.firestore, this.collectionPath);
      const docRef = await addDoc(collectionRef, event);
      return docRef.id;
    } catch (error) {
      console.error('カレンダーイベント追加エラー:', error);
      throw error;
    }
  }

  // カレンダーイベントの更新
  async updateCalendarEvent(eventId: string, data: Partial<CalendarEvent>) {
    try {
      const docRef = doc(this.firestore, this.collectionPath, eventId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('カレンダーイベント更新エラー:', error);
      throw error;
    }
  }

  // カレンダーイベントの削除
  async deleteCalendarEvent(eventId: string) {
    try {
      const docRef = doc(this.firestore, this.collectionPath, eventId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('カレンダーイベント削除エラー:', error);
      throw error;
    }
  }
}
