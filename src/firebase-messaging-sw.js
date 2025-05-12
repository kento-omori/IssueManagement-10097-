// Firebase SDKの読み込み
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebaseの設定
firebase.initializeApp({
  apiKey: "AIzaSyCwgWS2A4T-TtIN7mM1cdJeP6FoLYlvGBE",
  authDomain: "kensyu10097.firebaseapp.com",
  projectId: "kensyu10097",
  storageBucket: "kensyu10097.firebasestorage.app",
  messagingSenderId: "362602686023",
  appId: "1:362602686023:web:34584773113116a096f362",
  measurementId: "G-KJ7S5Z88Q6"
});

const messaging = firebase.messaging();

// バックグラウンドメッセージの処理
messaging.onBackgroundMessage((payload) => {
  console.log('バックグラウンドメッセージを受信:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // icon: '/assets/icons/icon-72x72.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// バックグラウンド通知の受信
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const notificationTitle = data.notification.title;
    const notificationOptions = {
      body: data.notification.body,
      // icon: '/assets/icons/icon-72x72.png'
    };
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});