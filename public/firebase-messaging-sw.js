import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js';
import { getMessaging } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-sw.js';

// あなたの Firebase プロジェクトの設定情報
const firebaseConfig = {
    apiKey: "AIzaSyCwgWS2A4T-TtIN7mM1cdJeP6FoLYlvGBE",
    authDomain: "kensyu10097.firebaseapp.com",
    projectId: "kensyu10097",
    storageBucket: "kensyu10097.firebasestorage.app",
    messagingSenderId: "362602686023",
    appId: "1:362602686023:web:34584773113116a096f362",
    measurementId: "G-KJ7S5Z88Q6"
  };

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// バックグラウンドでメッセージを受信したときの処理 (オプション)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // ここで通知のカスタマイズなどができますが、多くの場合、
  // payload.notification の情報に基づいてブラウザが自動で通知を表示します。
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon, // 通知に表示するアイコンのURL
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// バックグラウンド通知の受信
self.addEventListener('push', (event) => {
  // ここでカスタム通知処理も可能
});