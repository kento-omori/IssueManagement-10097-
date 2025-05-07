import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, addDoc, getDocs, where, query, limit } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { User } from '@angular/fire/auth';

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

  // メールアドレスでユーザーを検索
  async searchUserByEmail(email: string): Promise<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users'); // 'users' コレクションへの参照
    if (!email) { return [] };     // メールアドレスが空なら空配列を返す
    // Firestoreの 'users' コレクションから 'email' フィールドが一致するものを探すクエリ
    const q = query(usersCollection, where('email', '==', email.trim()), limit(1)); // 1件見つかればOK
    try {
      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      // ドキュメントのデータとIDをUserオブジェクトに変換
      querySnapshot.forEach((doc) => {
        users.push({ ...doc.data() } as UserProfile);
      });
      console.log('Found users by email:', users);
      return users;
    } catch (error) {
      console.error('Error searching user by email:', error);
      return []; // エラー時は空配列
    };
  };

  
  // 表示名でユーザーを検索(前方一致)
  async searchUsersByDisplayNamePrefix(displayNamePrefix: string): Promise<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    if (!displayNamePrefix) { return [] };
    console.log(`Searching for users with display name starting with: ${displayNamePrefix}`);
    // 'displayName' が指定された文字列で始まるユーザーを探す (簡易的な前方一致)
    // \uf8ff は非常に大きなUnicode文字で、前方一致検索のトリックとして使われる
    const q = query(usersCollection,
      where('displayName', '>=', displayNamePrefix.trim()),
      where('displayName', '<=', displayNamePrefix.trim() + '\uf8ff'),
      limit(10) // 結果が多すぎないように制限
    );
    try {
      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ ...doc.data() } as UserProfile);
      });
      console.log('Found users by displayName prefix:', users);
      return users;
    } catch (error) {
      console.error('Error searching users by displayName prefix:', error);
      return [];
    };
  };

  // ユーザーIDでユーザーを検索
  async getUserById(userId: string): Promise<UserProfile | null> {
    const userDocRef = doc(this.firestore, `users/${userId}`);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { ...docSnap.data() } as UserProfile;
    } else {
      return null;
    };
  };

  // ユーザーを検索(メールアドレス、表示名、ユーザーIDのいずれかを指定)
  async searchUser(email?: string, displayName?: string, userId?: string): Promise<UserProfile[]> {
    // ユーザーIDで検索
    if (userId && userId.trim() !== '') {
      const user = await this.getUserById(userId.trim());
      return user ? [user] : [];
    };
    // メールアドレスで検索
    if (email && email.trim() !== '') {
      return await this.searchUserByEmail(email.trim());
    };
    // 表示名で検索
    if (displayName && displayName.trim() !== '') {
      return await this.searchUsersByDisplayNamePrefix(displayName.trim());
    };
    // どれも指定されていない場合は空配列
    return [];
  };

}
