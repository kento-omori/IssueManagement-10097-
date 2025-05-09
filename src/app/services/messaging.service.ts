import { Injectable } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Subject, BehaviorSubject } from 'rxjs';

// FCMトークン情報(users/{userId}/fcmTokens/となる、サブコレクション)
export interface FcmTokenInfo {
  permission: boolean;
  createdAt: Date;
  deviceInfo: string;
}

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  receivedAt: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
    
  private messageSubject = new Subject<any>();
  message$ = this.messageSubject.asObservable();

  private notificationsSubject = new BehaviorSubject<NotificationData[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private messaging: Messaging,
    private firestore: Firestore
  ) {
    onMessage(this.messaging, (payload) => {
      this.messageSubject.next(payload);
      const notification: NotificationData = {
        id: Date.now().toString(),
        title: payload.notification?.title ?? '通知',
        body: payload.notification?.body ?? '',
        receivedAt: new Date(),
        read: false
      };
      const current = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...current]);
    });
  }

  // 通知許可＋トークン取得＋Firestore保存
  async requestPermissionAndSaveToken(userId: string): Promise<string | null> {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(this.messaging, {
        vapidKey: 'BIU0QUJMZ6xnF8yk9lUUnBOBjJQAgOrqqpf_uHLFo9NoZ72d9lEt0N6t0uPssnIt8Lc5jF0xmBEOpFKq62fKmiQ' // Firebaseコンソールで取得
      });
      if (token) {
        // 端末情報（例：userAgent）も保存したい場合
        const deviceInfo = navigator.userAgent;
        await setDoc(
          doc(this.firestore, `users/${userId}/fcmTokens/${token}`),
          {
            permission: true,
            createdAt: new Date(),
            deviceInfo: deviceInfo
          }
        );
        return token;
      }
    } else {
      // 拒否された場合や通知解除時にpermissionをfalseに更新
      // ただし通常はトークン自体が取得できない　→　permission: falseで保存しない
      return null;
    }
    return null;
  }

  // 拒否時や通知解除時にpermissionをfalseに更新
  async setTokenPermission(userId: string, token: string, permission: boolean) {
    await setDoc(
      doc(this.firestore, `users/${userId}/fcmTokens/${token}`),
      { permission: permission },
      { merge: true }
    );
  }

  //役割：Webアプリが開いているときにFCM通知を受信し、任意の処理（コールバック）を実行する
  //用途：リアルタイム通知、画面上での通知表示など
  onMessage(callback: (payload: any) => void) {
    onMessage(this.messaging, callback);
  };

  markAllAsRead() {
    const updated = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
    this.notificationsSubject.next(updated);
  }

  markAsRead(id: string) {
    const updated = this.notificationsSubject.value.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.read).length;
  }
}