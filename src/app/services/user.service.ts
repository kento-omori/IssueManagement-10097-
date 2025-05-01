import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, addDoc, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}
  
  // ユーザープロフィールを作成/更新
  async createUserProfile(user: UserProfile): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, {
      ...user,
      createdAt: new Date()
    });
  }

  // ユーザープロフィールを取得
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() as UserProfile : null;
  }

  // 現在のユーザーIDを取得
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }
  
  // タスクリストをユーザーのサブコレクションに追加
  async addTaskToUser(task: any): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('ユーザーが認証されていません');

    const tasksRef = collection(this.firestore, `users/${userId}/tasklist`);
    const docRef = await addDoc(tasksRef, {
      ...task,
      createdAt: new Date()
    });
    return docRef.id;
  }

  // ユーザーのタスクリストを取得
  async getUserTasks(): Promise<any[]> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('ユーザーが認証されていません');

    const tasksRef = collection(this.firestore, `users/${userId}/tasklist`);
    const snapshot = await getDocs(tasksRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

//   // ユーザーのサブコレクションにタスクを追加
//   async addTeamToUser(uid: string, team: any): Promise<string> {
//     const teamsRef = collection(this.firestore, `users/${uid}/teams`);
//     const docRef = await addDoc(teamsRef, {
//       ...team,
//       createdAt: new Date()
//     });
//     return docRef.id;
//   }
}
