import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, addDoc, getDocs, where, query, limit, deleteDoc, updateDoc, arrayRemove } from '@angular/fire/firestore';
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
  private firestore = inject(Firestore);

  constructor(
    private auth: Auth
  ) {}
  
  // ユーザープロフィールを作成/更新
  async createUserProfile(userProfile: UserProfile): Promise<void> {
    try {
      const userRef = doc(this.firestore, `users/${userProfile.uid}`);
      await setDoc(userRef, userProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('ユーザープロフィールの作成に失敗しました: ' + error);
    }
  }

  // ユーザープロフィールを取得
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      return data as UserProfile;
    }
    return null;
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

  // ユーザーがプロジェクトの管理者またはオーナーかチェック
  async isProjectAdminOrOwner(userId: string): Promise<boolean> {
    try {
      const projectsRef = collection(this.firestore, 'projects');
      const projectsQuery = query(projectsRef, 
        where('projectMembers', 'array-contains', userId)
      );
      const projectsSnapshot = await getDocs(projectsQuery);

      for (const projectDoc of projectsSnapshot.docs) {
        const projectData = projectDoc.data();
        // プロジェクトの管理者またはオーナーかチェック
        if (projectData['owner']?.includes(userId) || 
            projectData['admin']?.includes(userId)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('プロジェクト管理者チェックに失敗しました:', error);
      throw error;
    }
  }

  // ユーザーデータの削除
  async deleteUserData(userId: string): Promise<void> {
    try {
      // プロジェクトの管理者またはオーナーかチェック
      const isAdminOrOwner = await this.isProjectAdminOrOwner(userId);
      if (isAdminOrOwner) {
        throw new Error('プロジェクトの管理者またはオーナーはアカウントを削除できません。先にプロジェクトの管理者権限を移譲してください。');
      }

      // プロジェクト関連のデータを先に削除
      const projectsRef = collection(this.firestore, 'projects');
      const projectsQuery = query(projectsRef, where('projectMembers', 'array-contains', userId));
      const projectsSnapshot = await getDocs(projectsQuery);

      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        // プロジェクトのメンバーリストからユーザーを削除
        const projectRef = doc(this.firestore, 'projects', projectId);
        // すべての関連配列からユーザーを削除
        await updateDoc(projectRef, {
          members: arrayRemove(userId),
          admin: arrayRemove(userId),
          owner: arrayRemove(userId),
          projectMembers: arrayRemove(userId)
        });
      }

      // ユーザーに関連するサブコレクションの削除
      const subCollections = [
        'fcmtoken',
        'todos',
        'tasklist',
        'gantt-chart',
        'parent-i-share',
        'i-share'
      ];

      for (const collectionName of subCollections) {
        const subCollectionRef = collection(this.firestore, 'users', userId, collectionName);
        const querySnapshot = await getDocs(subCollectionRef);
        
        // サブコレクション内の各ドキュメントを削除
        const deletePromises = querySnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);
      }

      // 最後にユーザーのメインドキュメントを削除
      await deleteDoc(doc(this.firestore, 'users', userId));

    } catch (error) {
      console.error('ユーザーデータの削除に失敗しました:', error);
      throw error;
    }
  }
}
