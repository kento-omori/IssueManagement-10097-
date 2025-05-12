import { Injectable, inject } from '@angular/core';
import { BehaviorSubject  } from 'rxjs';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';

// FCMトークン情報(users/{userId}/fcmtoken/token)　→　同じユーザでも、デバイスごとに保存する
export interface FcmTokenInfo {
  token: string;
  updatedAt: Date;
  permissionChecked: boolean;
  permissionCheckedAt?: Date;
}

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  receivedAt: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private firestore = inject(Firestore);
  private messaging: any;
  private notifications = new BehaviorSubject<NotificationData[]>([]);
  notifications$ = this.notifications.asObservable();

  constructor() {
    this.messaging = getMessaging();
    this.setupMessageListener();
    this.checkServiceWorkerRegistration();
  }

  // アプリが開いている状態で通知を受信した時の処理（バックグランドで受診した時はSWで処理）
  private setupMessageListener() {
    onMessage(this.messaging, (payload) => {
      const notification: NotificationData = {
        id: Date.now().toString(),
        title: payload.notification?.title || '通知',
        body: payload.notification?.body || '',
        receivedAt: new Date(),
        read: false
      };
      this.notifications.next([notification, ...this.notifications.value]);
    });
  }

  // 既存デバイスを検索（トークンがあるかどうか）
  private async findExistingDevice(userId: string, deviceInfo: any): Promise<string | null> {
    const tokensRef = collection(this.firestore, 'users', userId, 'fcmTokens');
    const q = query(tokensRef, 
      where('deviceInfo.userAgent', '==', deviceInfo.userAgent),
      where('deviceInfo.platform', '==', deviceInfo.platform)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty ? querySnapshot.docs[0].id : null;
  }

  // Service Workerの登録完了を待つ
  private async waitForServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      if ('serviceWorker' in navigator) {
        console.log('Service Worker APIが利用可能です');
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('Service Worker登録情報:', registration);
          if (registration.active) {
            console.log('Service Workerがアクティブです:', registration.active);
            return registration;
          }
          console.log('Service Workerがアクティブではありません。待機を開始します...');
          // Service Workerがactiveになるのを待つ
          return new Promise((resolve) => {
            registration.addEventListener('activate', (event) => {
              console.log('Service Workerがアクティブになりました:', event);
              resolve(registration);
            });
          });
        }
        console.log('Service Workerの登録が見つかりません');
      } else {
        console.log('Service Worker APIが利用できません');
      }
      return null;
    } catch (error) {
      console.error('Service Workerの待機に失敗しました:', error);
      return null;
    }
  }

  // Service Workerの登録状態を監視
  private async checkServiceWorkerRegistration() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker登録成功:', registration);
        
        // Service Workerの状態を監視
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Service Worker更新中:', newWorker);
          
          newWorker?.addEventListener('statechange', () => {
            console.log('Service Worker状態変更:', newWorker.state);
          });
        });
      }
    } catch (error) {
      console.error('Service Workerの登録に失敗しました:', error);
    }
  }

  // 通知許可＋トークン取得＋Firestore保存
  async requestPermissionAndSaveToken(userId: string): Promise<string | null> {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          // Service Workerの登録完了を待つ
          const registration = await this.waitForServiceWorker();
          if (!registration) {
            console.error('Service Workerの登録が見つかりません');
            // Service Workerが見つからない場合は通知の許可状態をリセット
            await this.resetNotificationPermission();
            return null;
          }

        const token = await getToken(this.messaging, {
          vapidKey: 'BIU0QUJMZ6xnF8yk9lUUnBOBjJQAgOrqqpf_uHLFo9NoZ72d9lEt0N6t0uPssnIt8Lc5jF0xmBEOpFKq62fKmiQ'
        });
        await this.saveTokenToFirestore(userId, token);
        return token;
        } catch (tokenError) {
          console.error('FCMトークンの取得に失敗しました:', tokenError);
          // FCMトークン取得に失敗した場合、通知の許可状態をリセット
          await this.revokePermission(userId);
          await this.resetNotificationPermission();
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('通知の許可に失敗しました:', error);
      return null;
    }
  }

  // Firestoreにトークンを保存するロジック
  private async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: this.getPlatformFromUserAgent(navigator.userAgent),
      language: navigator.language
    };

    // 既存デバイスを検索
    const existingDeviceId = await this.findExistingDevice(userId, deviceInfo);
    const deviceId = existingDeviceId || await this.generateDeviceId(deviceInfo);

    await setDoc(doc(this.firestore, 'users', userId, 'fcmTokens', deviceId), {
      token,
      deviceInfo,
      updatedAt: new Date(),
      permissionChecked: false // 次の確認でtrueにすることで、通知許可の確認をしたことをFirestoreに保存する
    });
  }

  // 通知拒否（通知を無効にするボタンを押したとき、その情報をFirestoreから削除）
  async revokePermission(userId: string): Promise<void> {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: this.getPlatformFromUserAgent(navigator.userAgent),
        language: navigator.language
      };
      const deviceId = await this.findExistingDevice(userId, deviceInfo);
      if (deviceId) {
        await deleteDoc(doc(this.firestore, 'users', userId, 'fcmTokens', deviceId));
      }
    } catch (error) {
      console.error('通知の無効化に失敗しました:', error);
      throw error;
    }
  }

  // デバイス情報から一意のIDを生成
  private async generateDeviceId(deviceInfo: any): Promise<string> {
    const deviceString = JSON.stringify(deviceInfo);
    const encoder = new TextEncoder();
    const data = encoder.encode(deviceString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 既読になった通知を数えるロジック
  markAsRead(notificationId: string) {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    this.notifications.next(updatedNotifications);
  }

  // 通知を全て既読にするロジック
  markAllAsRead() {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
    this.notifications.next(updatedNotifications);
  }

  // 未読の通知を数えるロジック
  getUnreadCount(): number {
    return this.notifications.value.filter(n => !n.read).length;
  }

  // 通知許可の確認状態をチェック
  async hasCheckedPermission(userId: string): Promise<boolean> {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: this.getPlatformFromUserAgent(navigator.userAgent),
        language: navigator.language
      };
      const deviceId = await this.findExistingDevice(userId, deviceInfo);
      if (!deviceId) return false;
      const docRef = doc(this.firestore, 'users', userId, 'fcmTokens', deviceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as FcmTokenInfo;
        return data.permissionChecked || false;
      }
      return false;
    } catch (error) {
      console.error('通知許可の確認状態の取得に失敗しました:', error);
      return false;
    }
  }

  // 通知許可の確認状態を保存
  async savePermissionCheck(userId: string): Promise<void> {
    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: this.getPlatformFromUserAgent(navigator.userAgent),
        language: navigator.language
      };
      const deviceId = await this.findExistingDevice(userId, deviceInfo);
      if (!deviceId) return;

      const docRef = doc(this.firestore, 'users', userId, 'fcmTokens', deviceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as FcmTokenInfo;
        await setDoc(docRef, {
          ...data,
          permissionChecked: true,
          permissionCheckedAt: new Date()
        });
      }
    } catch (error) {
      console.error('通知許可の確認状態の保存に失敗しました:', error);
    }
  }

  private getPlatformFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'MacOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'unknown';
  }

  // 通知許可の確認状態をリセット
  private async resetNotificationPermission(): Promise<void> {
    try {
      // 通知の許可状態をリセット（ブラウザの設定をリセット）
      if ('permissions' in navigator) {
        try {
          await (navigator as any).permissions.revoke({ name: 'notifications' });
        } catch (revokeError) {
          console.error('通知の許可状態のリセットに失敗しました:', revokeError);
        }
      }
      // 通知の許可状態をdefaultに戻す
      if ('Notification' in window) {
        try {
          await (Notification as any).requestPermission();
        } catch (error) {
          console.error('通知の許可状態のリセットに失敗しました:', error);
        }
      }
    } catch (error) {
      console.error('通知の許可状態のリセットに失敗しました:', error);
    }
  }
}