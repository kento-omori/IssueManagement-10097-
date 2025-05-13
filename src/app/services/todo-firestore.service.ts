import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
  setDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Todo } from '../todo/todo.interface';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';
import { combineLatest, map, switchMap, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TodoFirestoreService {
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private navigationService: NavigationService,
    private router: Router
  ) {}

  // Todoリストの取得
  getTodos(): Observable<Todo[]> {
    const collectionPath = this.getCollectionPath();
    const collectionRef = collection(this.firestore, collectionPath);
    return collectionData(collectionRef, { idField: 'dbid' }) as Observable<Todo[]>;
  }

  // 新しいTodoの追加
  async addTodo(todo: Omit<Todo,'dbid'>) {
    const collectionPath = this.getCollectionPath();
    const collectionRef = collection(this.firestore, collectionPath);
    const docRef = await addDoc(collectionRef, {
      ...todo,
      completed: false,
    });
    return docRef.id;
  }

  // Todoの更新
  async updateTodo(id: string, data: Partial<Todo>, pjid?: string): Promise<void> {
    const collectionPath = this.getCollectionPath(pjid);
    const todoRef = doc(this.firestore, collectionPath, id);
    await updateDoc(todoRef, data);
  }

  // IDを指定してTodoを取得
  async getTodoById(id: string): Promise<Todo | null> {
    const collectionPath = this.getCollectionPath();
    try {
      const todoRef = doc(this.firestore, collectionPath, id);
      const todoSnap = await getDoc(todoRef);
      
      if (todoSnap.exists()) {
        const data = todoSnap.data();
        return {
          id: parseInt(todoSnap.id),
          text: data['text'],
          category: data['category'],
          start_date: data['start_date'],
          end_date: data['end_date'],
          assignee: data['assignee'],
          status: data['status'],
          priority: data['priority'],
          progress: data['progress'],
          order: data['order'],
          links: data['links'] || []
        } as Todo;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting todo:', error);
      return null;
    }
  }

  // Todoの削除
  async deleteTodo(todoDbId: string, pjid?: string) {
    const collectionPath = this.getCollectionPath(pjid);
    try {
      const docRef = doc(this.firestore, collectionPath, todoDbId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Todo削除エラー:', error);
      throw error;
    }
  }

  // タスクの順番を更新（バッチ処理用）
  async batchUpdateOrder(updates: { dbid: string, order: number }[]) {
    const collectionPath = this.getCollectionPath();
    const batch = writeBatch(this.firestore);
    updates.forEach(update => {
      const ref = doc(this.firestore, collectionPath, update.dbid);
      batch.update(ref, { order: update.order });
    });
    await batch.commit();
  }

  //  指定したタスク(dbid)のlinks配列にリンクを追加する
  async addLinkToTask(dbid: string, link: { id: string, source: string, target: string, type: string }) {
    const collectionPath = this.getCollectionPath();
    const taskRef = doc(this.firestore, collectionPath, dbid);
    const taskSnap = await getDoc(taskRef);
    let links = [];
    if (taskSnap.exists()) {
      const data = taskSnap.data();
      links = Array.isArray(data['links']) ? data['links'] : [];
    }
    links.push(link);
    await setDoc(taskRef, { links }, { merge: true });
  }

  // 指定したタスク(dbid)のlinks配列からリンクを削除する
  async deleteLinkFromTask(dbid: string, linkId: string) {
    const collectionPath = this.getCollectionPath();
    const taskRef = doc(this.firestore, collectionPath, dbid);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
      const data = taskSnap.data();
      const links = Array.isArray(data['links']) ? data['links'] : [];
      const newLinks = links.filter((l: any) => String(l.id) !== String(linkId));
      await setDoc(taskRef, { links: newLinks }, { merge: true });
    }
  }

  // コレクションパスの取得
  public getCollectionPath(pjid?: string) {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;

    let collectionPath: string;
    if (url.startsWith('/users') && url.includes('/home') && userId) {
      // /users/{userId}/home の場合
      if (!pjid) {
        collectionPath = `users/${userId}/todos`;
      } else {
        collectionPath = `projects/${pjid}/todos`;
      }
    } else if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/todos`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/todos`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    return collectionPath;
  }

  goDashboad() {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/private`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/project-base`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    this.router.navigate([collectionPath]);
  };

  goTodo() {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/todo`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/todo`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    this.router.navigate([collectionPath]);
  }

  goGanttChart() {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    const projectId = this.navigationService.selectedProjectIdSource.getValue();
    const url = this.router.url;
    let collectionPath: string;
    if (url.startsWith('/users') && userId) {
      collectionPath = `users/${userId}/gantt-chart`;
    } else if (url.startsWith('/projects') && projectId) {
      collectionPath = `projects/${projectId}/gantt-chart`;
    } else {
      throw new Error('userIdかprojectIdのどちらかが必要です');
    }
    this.router.navigate([collectionPath]);
  }

  // ユーザーが担当者となっている全てのタスクを取得
  getAllTodosForUserRealtime(userId: string, userDisplayName: string) {
    // 個人TODOを取得
    const personalTodos$ = collectionData(
      collection(this.firestore, `users/${userId}/todos`),{ idField: 'dbid' }).pipe(
      map((todos: any[]) =>
        todos
          .filter(todo => todo.assignee === userDisplayName)
          .map(todo => ({ ...todo, projectName: '個人ワークスペース', pjid: null }))
      )
    );
    // 参加プロジェクト一覧を取得
    const projects$ = collectionData(
      collection(this.firestore, 'projects'),{ idField: 'pjid' }).pipe(
      map((projects: any[]) =>
        projects.filter(p => p.projectMembers && p.projectMembers.includes(userId))
      )
    );
    // 一覧からプロジェクトごとのTODOを取得
    const projectTodos$ = projects$.pipe(
      switchMap((projects: any[]) => {
        if (projects.length === 0) return of([]);
        const todosObservables = projects.map(project =>
          collectionData(
            collection(this.firestore, `projects/${project.pjid}/todos`),
            { idField: 'dbid' }
          ).pipe(
            map((todos: any[]) =>
              todos
                .filter(todo => todo.assignee === userDisplayName)
                .map(todo => ({
                  ...todo,
                  projectName: project.title,
                  pjid: project.pjid
                }))
            )
          )
        );
        return combineLatest(todosObservables).pipe(
          map((todosArrays: any[][]) => todosArrays.flat())
        );
      })
    );
    // 個人TODOとプロジェクトTODOを合成
    return combineLatest([personalTodos$, projectTodos$]).pipe(
      map(([personal, project]) => [...personal, ...project])
    );
  }

  // 現在のワークスペースが個人ワークスペースかどうかを判定
  isPersonalWorkspace(): boolean {
    const url = this.router.url;
    return url.startsWith('/users');
  }
}