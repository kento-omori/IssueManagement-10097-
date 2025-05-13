import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2/options";
import admin from "firebase-admin";

admin.initializeApp();
setGlobalOptions({ 
  region: "asia-northeast1",
  memory: "256MiB",
  timeoutSeconds: 60
});

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
        (todoDataBefore && todoDataBefore.assignee === todoDataAfter.assignee && event.data?.before.exists)) { // 担当者が変わっていない場合は何もしない
      console.log('担当者の変更なし、またはタスク削除のため通知スキップ');
      return null;
    }

    const assignee = todoDataAfter.assignee;
    if (!assignee) {
      console.log('担当者が設定されていません。');
      return null;
    }

    // ユーザードキュメントからdisplayNameを取得
    const userQuery = await db.collection('users').where('displayName', '==', assignee).get();
    if (userQuery.empty) {
      console.log(`ユーザー ${assignee} さんが見つかりません。`);
      return null;
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    if (!userData) return null;

    // ログメッセージを修正
    console.log(`タスク「${todoDataAfter.text}」が${assignee}さんに割り当てられました。`);

    // 1. 担当者のFCMトークンを取得
    const tokensSnapshot = await db.collection('users').doc(userDoc.id).collection('fcmTokens').get();
    if (tokensSnapshot.empty) {
      console.log(`ユーザー ${assignee} さんのFCMトークンが見つかりません。`);
      return null;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(token => token);

    if (tokens.length === 0) {
      console.log(`ユーザー ${assignee} さんの有効なFCMトークンがありません。`);
      return null;
    }

    // 2. 通知メッセージを作成
    const projectId = event.params.projectId;  // ドキュメントパスからプロジェクトIDを取得
    const projectRef = admin.firestore().collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    const projectName = projectDoc.exists ? projectDoc.data()?.title : '不明なプロジェクト';

    const message = {
      tokens: tokens,
      notification: {
        title: '新しいタスクが割り当てられました！',
        body: `${assignee}さん、プロジェクト「${projectName}」のタスク「${todoDataAfter.text}」が割り当てられました。`
      }
    };

    // 3. トークン宛に通知を送信
    const tokensToRemove: string[] = [];
    try {
      const response = await messaging.sendEachForMulticast(message);
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
      await cleanupInvalidTokens(userDoc.id, tokensToRemove);
    } catch (error) {
      console.error('通知送信中にエラー:', error);
    }
    return null;
  }
);

/** 無効なトークンを削除する**/
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
    schedule: 'everyday 09:00',
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
      .where('status', '!=', '完了')
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
      const assignee = task.assignee;
      if (!assignee) continue;

      // プロジェクトIDを取得（ドキュメントパスから）
      const projectId = task.ref.parent.parent?.id;
      if (!projectId) continue;

      // プロジェクト名を取得
      const projectRef = admin.firestore().collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      const projectName = projectDoc.exists ? projectDoc.data()?.title : '不明なプロジェクト';

      const userQuery = await db.collection('users').where('displayName', '==', assignee).get();
      if (userQuery.empty) continue;

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      if (!userData) continue;
      const displayName = userData.displayName || '名前未設定';  // displayNameがない場合のフォールバック
      
      // FCMトークンの取得方法を修正
      const tokensSnapshot = await db.collection('users').doc(userDoc.id).collection('fcmTokens').get();
      if (tokensSnapshot.empty) {
        console.log(`ユーザー ${displayName} さんのFCMトークンが見つかりません。`);
        continue;
      }
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(token => token);
      if (tokens.length === 0) {
        console.log(`ユーザー ${displayName} さんの有効なFCMトークンがありません。`);
        continue;
      }

      const tokensToRemove: string[] = [];

      const reminderMessage = {
        tokens: tokens,
        notification: {
          title: 'タスクの期限が迫っています！',
          body: `${displayName}さん、プロジェクト「${projectName}」のタスク「${task.text}」の期限は翌日です。`
        }
      };

      try {
        console.log(`ユーザー ${displayName} さんのタスク「${task.text}」の期限前日通知を送信します。`);
        const response = await messaging.sendEachForMulticast(reminderMessage);
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
        await cleanupInvalidTokens(userDoc.id, tokensToRemove);
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
    schedule: 'everyday 09:00',
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
      .where('status', '!=', '完了')
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
      const assignee = task.assignee;
      if (!assignee) continue;

      // プロジェクトIDを取得（ドキュメントパスから）
      const projectId = task.ref.parent.parent?.id;
      if (!projectId) continue;

      // プロジェクト名を取得
      const projectRef = admin.firestore().collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      const projectName = projectDoc.exists ? projectDoc.data()?.title : '不明なプロジェクト';

      const userQuery = await db.collection('users').where('displayName', '==', assignee).get();
      if (userQuery.empty) continue;

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();
      if (!userData) continue;
      const displayName = userData.displayName || '名前未設定';  // displayNameがない場合のフォールバック
      
      // FCMトークンの取得方法を修正
      const tokensSnapshot = await db.collection('users').doc(userDoc.id).collection('fcmTokens').get();
      if (tokensSnapshot.empty) {
        console.log(`ユーザー ${displayName} さんのFCMトークンが見つかりません。`);
        continue;
      }
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(token => token);
      if (tokens.length === 0) {
        console.log(`ユーザー ${displayName} さんの有効なFCMトークンがありません。`);
        continue;
      }

      const tokensToRemove: string[] = [];

      const todayMessage = {
        tokens: tokens,
        notification: {
          title: 'タスクの期限が今日です！',
          body: `${displayName}さん、プロジェクト「${projectName}」のタスク「${task.text}」の期限は本日です。`
        }
      };

      try {
        console.log(`ユーザー ${displayName} さんのタスク「${task.text}」の期限当日通知を送信します。`);
        const response = await messaging.sendEachForMulticast(todayMessage);
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
        await cleanupInvalidTokens(userDoc.id, tokensToRemove);
      } catch (error) {
        console.error(`ユーザー ${displayName} さんへの通知送信中にエラー:`, error);
      }
    }
    console.log('今日が期限のタスク通知バッチ処理が完了しました。');
  }
);
