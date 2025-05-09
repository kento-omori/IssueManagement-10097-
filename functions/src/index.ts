import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2/options";
import admin from "firebase-admin";

admin.initializeApp();
setGlobalOptions({ region: "asia-northeast1" });

const db = admin.firestore();
const messaging = admin.messaging();

/**タスクが作成または更新され、担当者が設定された場合に通知を送信する**/

export const sendNotificationOnTaskAssigned = onDocumentWritten(
  "projects/{projectId}/todos/{todoId}",
  async (event) => {
    const todoId = event.params.todoId;
    const todoDataAfter = event.data?.after.exists ? event.data.after.data() : null;
    const todoDataBefore = event.data?.before.exists ? event.data.before.data() : null;

    console.log(`Todo ${todoId} changed. Before:`, todoDataBefore, "After:", todoDataAfter);

    // 新規作成時または担当者が変更された場合のみ処理
    if (!todoDataAfter || // タスクが削除された場合は何もしない
        (todoDataBefore && todoDataBefore.assigneeId === todoDataAfter.assigneeId && event.data?.before.exists)) { // 担当者が変わっていない場合は何もしない
      console.log('担当者の変更なし、またはタスク削除のため通知スキップ');
      return null;
    }

    const assigneeId = todoDataAfter.assigneeId;
    if (!assigneeId) {
      console.log('担当者が設定されていません。');
      return null;
    }

    // ユーザードキュメントからdisplayNameを取得
    const userDoc = await db.collection('users').doc(assigneeId).get();
    if (!userDoc.exists) {
      console.log(`ユーザー ${assigneeId} さんが見つかりません。`);
      return null;
    }

    const userData = userDoc.data();
    if (!userData) return null;
    const displayName = userData.displayName || '名前未設定';  // displayNameがない場合のフォールバック

    // ログメッセージを修正
    console.log(`タスク「${todoDataAfter.todoName}」が${displayName}さんに割り当てられました。`);

    // 1. 担当者のFCMトークンを取得
    const tokensSnapshot = await db.collection('users').doc(assigneeId).collection('fcmTokens').get();
    const tokens = tokensSnapshot.docs.map(doc => doc.id); // ドキュメントIDがトークンの場合

    if (!tokens || tokens.length === 0) {
      console.log(`ユーザー ${assigneeId} さんのFCMトークンが見つかりません。`);
      return null;
    }

    // 2. 通知メッセージを作成
    const payload = {
      notification: {
        title: '新しいタスクが割り当てられました！',
        body: `${displayName}さん、タスク「${todoDataAfter.todoName}」が割り当てられました。`,
        icon: 'public/text_kadai.png',
        click_action: 'projects/{projectId}/todos/{todoId}'
      }
      // data: { ... } // 必要ならここに追加
    };

    // 3. トークン宛に通知を送信
    const tokensToRemove: string[] = [];
    try {
      const multicastMessage = {
        tokens: tokens,
        notification: payload.notification
      };
      const response = await messaging.sendEachForMulticast(multicastMessage);
      console.log('通知を送信しました:', response);
      response.responses.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('通知送信失敗 (トークン:', tokens[index], '):', error);
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[index]);
          }
        }
      });
      await cleanupInvalidTokens(assigneeId, tokensToRemove);
    } catch (error) {
      console.error('通知送信中にエラー:', error);
    }
    return null;
  }
);

async function cleanupInvalidTokens(userId: string, tokensToRemove: string[]) {
  if (!tokensToRemove.length) return;
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
  });
  console.log('無効なトークンを削除しました:', tokensToRemove);
}



/** 毎日午前9時に実行され、期限が翌日のタスクを担当者に通知する**/
export const sendDeadlineReminderNotifications = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1'
  },
  async (event) => {
    console.log('期限前日通知のバッチ処理を開始します。');

    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0); // 明日の午前0時
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59); // 明日の午後23時59分

    // 1. すべてのtodosサブコレクションから取得
    const todosSnapshot = await db.collectionGroup('todos')
      .where('end_date', '>=', admin.firestore.Timestamp.fromDate(tomorrowStart))
      .where('end_date', '<=', admin.firestore.Timestamp.fromDate(tomorrowEnd))
      .get();

    if (todosSnapshot.empty) {
      console.log('期限が翌日のタスクはありませんでした。');
      return;
    }

    const tasksToNotify: any[] = [];
    todosSnapshot.forEach(doc => {
      tasksToNotify.push({ id: doc.id, ...doc.data() });
    });

    console.log(`期限が翌日のタスクが ${tasksToNotify.length} 件見つかりました。`);

    // 2. 各タスクの担当者に通知を送信
    for (const task of tasksToNotify) {
      const assigneeId = task.assigneeId;
      if (!assigneeId) continue;

      const userDoc = await db.collection('users').doc(assigneeId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      if (!userData) continue;
      const displayName = userData.displayName || '名前未設定';  // displayNameがない場合のフォールバック
      const tokens = userData.fcmTokens;
      if (!tokens || tokens.length === 0) continue;

      const tokensToRemove: string[] = [];

      const payload = {
        notification: {
          title: 'タスクの期限が迫っています！',
          body: `${displayName}さん、タスク「${task.todoName}」の期限は翌日です。`,
        },
      };

      try {
        console.log(`ユーザー ${displayName} さんのタスク「${task.todoName}」の期限前日通知を送信します。`);
        const multicastMessage = {
          tokens: tokens,
          notification: payload.notification
        };
        const response = await messaging.sendEachForMulticast(multicastMessage);
        response.responses.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('通知送信失敗 (トークン:', tokens[index], '):', error);
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[index]);
            }
          }
        });
        await cleanupInvalidTokens(assigneeId, tokensToRemove);
      } catch (error) {
        console.error(`ユーザー ${displayName} への通知送信中にエラー:`, error);
      }
    }
    console.log('期限前日通知のバッチ処理が完了しました。');
  }
);

// 期限当日通知
export const sendTodayDeadlineNotifications = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1'
  },
  async (event) => {
    console.log('今日が期限のタスク通知バッチ処理を開始します。');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. 今日が期限のタスクを検索
    const snapshot = await db.collectionGroup('todos')
      .where('end_date', '>=', admin.firestore.Timestamp.fromDate(todayStart))
      .where('end_date', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
      .get();

    if (snapshot.empty) {
      console.log('今日が期限のタスクはありませんでした。');
      return;
    }

    const tasksToNotify: any[] = [];
    snapshot.forEach(doc => {
      tasksToNotify.push({ id: doc.id, ...doc.data() });
    });

    console.log(`今日が期限のタスクが ${tasksToNotify.length} 件見つかりました。`);

    // 2. 各タスクの担当者に通知を送信
    for (const task of tasksToNotify) {
      const assigneeId = task.assigneeId;
      if (!assigneeId) continue;

      const userDoc = await db.collection('users').doc(assigneeId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      if (!userData) continue;
      const displayName = userData.displayName || '名前未設定';  // displayNameがない場合のフォールバック
      const tokens = userData.fcmTokens;
      if (!tokens || tokens.length === 0) continue;

      const payload = {
        notification: {
          title: 'タスクの期限が今日です！',
          body: `${displayName}さん、タスク「${task.todoName}」の期限は本日です。`,
        }
      };

      const tokensToRemove: string[] = [];
      try {
        console.log(`ユーザー ${displayName} さんのタスク「${task.todoName}」の期限当日通知を送信します。`);
        const multicastMessage = {
          tokens: tokens,
          notification: payload.notification
        };
        const response = await messaging.sendEachForMulticast(multicastMessage);
        response.responses.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('通知送信失敗 (トークン:', tokens[index], '):', error);
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[index]);
            }
          }
        });
        await cleanupInvalidTokens(assigneeId, tokensToRemove);
      } catch (error) {
        console.error(`ユーザー ${displayName} さんへの通知送信中にエラー:`, error);
      }
    }
    console.log('今日が期限のタスク通知バッチ処理が完了しました。');
    return;
  }
);