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
  Timestamp,
  where,
  arrayUnion,
  arrayRemove,
  getDocs,
  deleteField
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { AuthService } from './auth.service';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';
import { UserService } from './user.service';
import { ChatMessage } from '../chating/chating.interface';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Storage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class ChatingFirestoreService {
  private readonly COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
    '#E74C3C', '#2ECC71', '#F1C40F', '#1ABC9C'
  ];

  private userColors: Map<string, string> = new Map();

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private authService: AuthService,
    private navigationService: NavigationService,
    private router: Router,
    private userService: UserService
  ) {
    this.loadUserColors();
  }

  private async loadUserColors() {
    const chatRef = collection(this.firestore, this.getChatCollectionPath());
    const snapshot = await getDocs(chatRef);
    
    // 既存のメッセージからユーザーと色のマッピングを取得
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data['userId'] && data['userColor']) {
        this.userColors.set(data['userId'], data['userColor']);
      }
    });
  }

  private getColorForUser(userId: string): string {
    // 既存のユーザーの色を返す
    if (this.userColors.has(userId)) {
      return this.userColors.get(userId)!;
    }

    // 新しいユーザーの場合、使用されていない色を探す
    const usedColors = new Set(this.userColors.values());
    const availableColors = this.COLORS.filter(color => !usedColors.has(color));
    
    // 使用可能な色がない場合は、ランダムに選択
    const color = availableColors.length > 0 
      ? availableColors[0] 
      : this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
    
    // ユーザーと色のマッピングを保存
    this.userColors.set(userId, color);
    return color;
  }

  private getChatCollectionPath(){
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    if (!projectId) {
      throw new Error('プロジェクトIDが必要です');
    }
    return `projects/${projectId}/chating`;
  }

  getMessages(): Observable<ChatMessage[]> {
    const chatRef = collection(this.firestore, this.getChatCollectionPath());
    const q = query(chatRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(messages => messages.map(message => ({
        ...message,
        createdAt: message['createdAt'] instanceof Date ? 
          message['createdAt'] : new Date(message['createdAt'].seconds * 1000),
        editedAt: message['editedAt'] ? 
          (message['editedAt'] instanceof Date ? 
            message['editedAt'] : new Date(message['editedAt'].seconds * 1000)) : 
          undefined, // errorになるので、undefinedにしておく→nullにしてもいい??Firestoreでえらーでるのでは？
        deletedAt: message['deletedAt'] ? 
          (message['deletedAt'] instanceof Date ? 
            message['deletedAt'] : new Date(message['deletedAt'].seconds * 1000)) : 
          undefined
      })))
    ) as Observable<ChatMessage[]>;
  }

  async addMessage(message: Omit<ChatMessage, 'id' | 'userColor'>): Promise<void> {
    const chatRef = collection(this.firestore, this.getChatCollectionPath());
    const userColor = this.getColorForUser(message.userId);
    const messageWithColor = {
      ...message,
      userColor,
      isDeleted: false
    };
    await addDoc(chatRef, messageWithColor);
  }

  async editMessage(messageId: string, text: string, fileInfo?: { fileUrl?: string | null; fileName?: string | null; fileType?: string | null }): Promise<void> {
    const messageRef = doc(this.firestore, this.getChatCollectionPath(), messageId);
    const updateData: any = {
      text,
      editedAt: new Date(),
    };
    if (fileInfo) {
      if ('fileUrl' in fileInfo) {
        updateData.fileUrl = (fileInfo.fileUrl === null || fileInfo.fileUrl === undefined || fileInfo.fileUrl === '') ? deleteField() : fileInfo.fileUrl;
      }
      if ('fileName' in fileInfo) {
        updateData.fileName = (fileInfo.fileName === null || fileInfo.fileName === undefined || fileInfo.fileName === '') ? deleteField() : fileInfo.fileName;
      }
      if ('fileType' in fileInfo) {
        updateData.fileType = (fileInfo.fileType === null || fileInfo.fileType === undefined || fileInfo.fileType === '') ? deleteField() : fileInfo.fileType;
      }
    }
    await updateDoc(messageRef, updateData);
  }

  async deleteMessage(messageId: string, deletedBy: string): Promise<void> {
    const messageRef = doc(this.firestore, this.getChatCollectionPath(), messageId);
    await updateDoc(messageRef, {
      isDeleted: true,
      deletedBy,
      deletedAt: new Date()
    });
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
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    const uniqueId = uuidv4();
    let collectionPath: string;
    if (url.startsWith('/projects') && projectId) {
      collectionPath = `kensyu10097.firebasestorage.app/projects/${projectId}/chating/${uniqueId}_${fileName}`;
    } else {
      throw new Error('projectIdが必要です');
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