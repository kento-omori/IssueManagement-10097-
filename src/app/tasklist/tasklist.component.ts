import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, DragDropModule, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { TasklistFirestoreService } from '../services/tasklist-firestore.service';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../services/navigation.service';
import { Router } from '@angular/router';

export interface TaskLists {
  id?: string;
  title: string;
  date: string;
  time: string;
  memo: string;
  completed: boolean;
  order: number;
}

interface Filters {
  title: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
  memo: string;
  status: 'all' | 'completed' | 'active';
  titleSort: 'none' | 'asc' | 'desc';
  dateSort: 'none' | 'asc' | 'desc';
  timeSort: 'none' | 'asc' | 'desc';
  memoSort: 'none' | 'asc' | 'desc';
}

@Component({
  selector: 'app-tasklist',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    CommonModule, 
    DragDropModule, 
    FormsModule,
    CdkDrag,
    CdkDropList,
    RouterModule
  ],
  templateUrl: './tasklist.component.html',
  styleUrl: './tasklist.component.css'
})

export class TasklistComponent implements OnInit {
  
  constructor(
    private tasklistFirestoreService: TasklistFirestoreService,
    private cdr: ChangeDetectorRef,
    private navigationService: NavigationService,
    private router: Router
  ) { }

  taskLists: TaskLists[] = [];
  filteredTaskLists: TaskLists[] = [];
  editingTask: TaskLists | null = null;
  sortColumn: keyof TaskLists | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  filters: Filters = {
    title: '',
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: '',
    memo: '',
    status: 'all',
    titleSort: 'none',
    dateSort: 'none',
    timeSort: 'none',
    memoSort: 'none'
  };

  taskForm: FormGroup = new FormGroup({
    id: new FormControl(''),
    title: new FormControl('', [Validators.required]),
    date: new FormControl(''),
    time: new FormControl(''),
    memo: new FormControl(''),
    completed: new FormControl(false)
  });

  // 初期設定を最初にする　Firestoreからデータを取得して表示、継続して変更を検知、データ更新
  ngOnInit() {
    this.tasklistFirestoreService.getTasks().subscribe(tasks => {
      this.taskLists = tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      this.filteredTaskLists = [...this.taskLists];
    });
  }

  // フィルタリング機能の関数
  applyFilters(): void {
    let filtered = [...this.taskLists];

    // タイトルでフィルタリング
    if (this.filters.title) {
      const searchLower = this.filters.title.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower)
      );
    }

    // メモでフィルタリング
    if (this.filters.memo) {
      const searchLower = this.filters.memo.toLowerCase();
      filtered = filtered.filter(task => 
        task.memo?.toLowerCase().includes(searchLower) ?? false
      );
    }

    // 日付範囲でのフィルタリング
    if (this.filters.dateFrom || this.filters.dateTo) {
      filtered = filtered.filter(task => {
        if (!task.date) return false;
        
        const taskDate = new Date(task.date);
        let isMatch = true;

        // 開始日が入力されている場合、その日付以降のタスクを表示
        if (this.filters.dateFrom) {
          const fromDate = new Date(this.filters.dateFrom);
          isMatch = isMatch && taskDate >= fromDate;
        }

        // 終了日が入力されている場合、その日付以前のタスクを表示
        if (this.filters.dateTo) {
          const toDate = new Date(this.filters.dateTo);
          isMatch = isMatch && taskDate <= toDate;
        }

        return isMatch;
      });
    }

    // 時間範囲でのフィルタリング
    if (this.filters.timeFrom || this.filters.timeTo) {
      filtered = filtered.filter(task => {
        if (!task.time) return false;

        // 時間を数値に変換（例：14:30 → 1430）
        const taskMinutes = this.convertTimeToMinutes(task.time);
        let isMatch = true;

        // 開始時間が入力されている場合、その時間以降のタスクを表示
        if (this.filters.timeFrom) {
          const fromMinutes = this.convertTimeToMinutes(this.filters.timeFrom);
          isMatch = isMatch && taskMinutes >= fromMinutes;
        }

        // 終了時間が入力されている場合、その時間以前のタスクを表示
        if (this.filters.timeTo) {
          const toMinutes = this.convertTimeToMinutes(this.filters.timeTo);
          isMatch = isMatch && taskMinutes <= toMinutes;
        }

        return isMatch;
      });
    }

    // 完了状態でのフィルタリング
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(task => 
        this.filters.status === 'completed' ? task.completed : !task.completed
      );
    }

    // タイトルでのフィルタリング
    if (this.filters.titleSort !== 'none') {
      filtered.sort((a, b) => {
        const comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        return this.filters.titleSort === 'asc' ? comparison : -comparison;
      });
    }

    // 日付でのフィルタリング
    if (this.filters.dateSort !== 'none') {
      filtered.sort((a, b) => {
        if (!a.date) return this.filters.dateSort === 'asc' ? 1 : -1;
        if (!b.date) return this.filters.dateSort === 'asc' ? -1 : 1;
        const comparison = a.date.localeCompare(b.date);
        return this.filters.dateSort === 'asc' ? comparison : -comparison;
      });
    }

    // 時間でのフィルタリング
    if (this.filters.timeSort !== 'none') {
      filtered.sort((a, b) => {
        if (!a.time) return this.filters.timeSort === 'asc' ? 1 : -1;
        if (!b.time) return this.filters.timeSort === 'asc' ? -1 : 1;
        const comparison = a.time.localeCompare(b.time);
        return this.filters.timeSort === 'asc' ? comparison : -comparison;
      });
    }

    // メモでのフィルタリング
    if (this.filters.memoSort !== 'none') {
      filtered.sort((a, b) => {
        const comparison = a.memo?.toLowerCase().localeCompare(b.memo?.toLowerCase() ?? '') ?? 0;
        return this.filters.memoSort === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredTaskLists = filtered;
  }

  // 並び替えの関数
  sortTasks(column: keyof TaskLists): void {
    // 昇順・降順の設定
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // taskListsも同じ順序でソート
    this.taskLists.sort((a, b) => {
      const comparison = String(a[column]).toLowerCase()
        .localeCompare(String(b[column]).toLowerCase());
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // ソート後の新しい順序をFirestoreに保存
    this.taskLists.forEach((task, index) => {
      task.order = index;
      this.tasklistFirestoreService.updateTask(task.id!, { order: index });
    });

    // ソート状態をリセット
    this.filters.titleSort = 'none';
    this.filters.dateSort = 'none';
    this.filters.timeSort = 'none';
    this.filters.memoSort = 'none';

    // filteredTaskListsを更新
    this.filteredTaskLists = [...this.taskLists];
  }

  // タスクの追加、編集
  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.getRawValue();
      // タスクの編集
      if (this.editingTask) {
        const index = this.taskLists.findIndex(task => task.id === this.editingTask!.id);
        if (index !== -1) {
          this.taskLists[index] = { 
            ...formValue,
            id: this.editingTask.id  // idを明示的に追加
          };
          this.tasklistFirestoreService.updateTask(this.editingTask.id!, formValue);
        }
        this.editingTask = null;
      // タスクの追加
      } else {
        this.taskLists.push(formValue);
        this.tasklistFirestoreService.addTask(formValue.title, formValue.date, formValue.time, formValue.memo);
      }
      this.taskForm.reset();
      this.applyFilters();
    }
  }

  // タスクの完了状態の変更
  changeStatus(taskList: TaskLists): void {
    taskList.completed = !taskList.completed;
    this.tasklistFirestoreService.updateTask(taskList.id!, { completed: taskList.completed });
    this.cdr.detectChanges();
    this.applyFilters();  // filteredTaskListsを更新
  }

  // タスクの削除
  deleteTask(taskList: TaskLists): void {
    if (taskList.id) {
      this.tasklistFirestoreService.deleteTask(taskList.id);
    } else {
      console.error('タスクIDが存在しません');
    }
  }

  // タスクの編集
  editTask(taskList: TaskLists): void {
    this.editingTask = { ...taskList };  // スプレッド構文で全プロパティをコピー（idを含む）
    this.taskForm.patchValue({
      id: taskList.id,
      title: taskList.title,
      date: taskList.date,
      time: taskList.time,
      memo: taskList.memo,
      completed: taskList.completed,
    });
  }

  // タスクの並び替え(drag&drop)
  drop(event: CdkDragDrop<TaskLists[]>) {
    // 配列の要素を移動
    moveItemInArray(this.filteredTaskLists, event.previousIndex, event.currentIndex);
    moveItemInArray(this.taskLists, event.previousIndex, event.currentIndex);
    
    // 順序を更新してFirestoreに保存
    this.taskLists.forEach((task, index) => {
      task.order = index;
      this.tasklistFirestoreService.updateTask(task.id!, { order: index });
    });

    // 表示を更新
    this.cdr.detectChanges();
  }

  // 時間を分単位に変換するヘルパーメソッド
  private convertTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // フィルタリングが適用されているかチェック
  isFiltered(): boolean {
    return !!(
      this.filters.title ||
      this.filters.dateFrom ||
      this.filters.dateTo ||
      this.filters.timeFrom ||
      this.filters.timeTo ||
      this.filters.memo ||
      this.filters.status !== 'all' ||
      this.filters.titleSort !== 'none' ||
      this.filters.dateSort !== 'none' ||
      this.filters.timeSort !== 'none' ||
      this.filters.memoSort !== 'none'
    );
  }

  isOnlySorted(): boolean {
    // 並び替えのみが適用されているかチェック
    return !!(
      this.filters.titleSort !== 'none' ||
      this.filters.dateSort !== 'none' ||
      this.filters.timeSort !== 'none' ||
      this.filters.memoSort !== 'none'
    );
  }

  isSearchFiltered(): boolean {
    // 検索やフィルタリングが適用されているかチェック
    return !!(
      this.filters.title ||
      this.filters.dateFrom ||
      this.filters.dateTo ||
      this.filters.timeFrom ||
      this.filters.timeTo ||
      this.filters.memo ||
      this.filters.status !== 'all'
    );
  }

  goDashboad() {
    const userId = this.navigationService.selectedUserIdSource.getValue();
    this.router.navigate(['users', userId, 'private']);
  }
}
