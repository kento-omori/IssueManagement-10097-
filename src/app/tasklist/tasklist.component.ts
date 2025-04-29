import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

interface TaskLists {
  title: string;
  date: string;
  time: string;
  memo: string;
  completed: boolean;
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
  imports: [ReactiveFormsModule, CommonModule, DragDropModule, FormsModule],
  templateUrl: './tasklist.component.html',
  styleUrl: './tasklist.component.css'
})
export class TasklistComponent {

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
    title: new FormControl('', [Validators.required]),
    date: new FormControl(''),
    time: new FormControl(''),
    memo: new FormControl(''),
    completed: new FormControl(false)
  });

  ngOnInit() {
    this.applyFilters();
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
        task.memo.toLowerCase().includes(searchLower)
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

    // 並び替えの適用
    // タイトルの並び替え
    if (this.filters.titleSort !== 'none') {
      filtered.sort((a, b) => {
        const comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        return this.filters.titleSort === 'asc' ? comparison : -comparison;
      });
    }

    // 日付の並び替え
    if (this.filters.dateSort !== 'none') {
      filtered.sort((a, b) => {
        if (!a.date) return this.filters.dateSort === 'asc' ? 1 : -1;
        if (!b.date) return this.filters.dateSort === 'asc' ? -1 : 1;
        const comparison = a.date.localeCompare(b.date);
        return this.filters.dateSort === 'asc' ? comparison : -comparison;
      });
    }

    // 時間の並び替え
    if (this.filters.timeSort !== 'none') {
      filtered.sort((a, b) => {
        if (!a.time) return this.filters.timeSort === 'asc' ? 1 : -1;
        if (!b.time) return this.filters.timeSort === 'asc' ? -1 : 1;
        const comparison = a.time.localeCompare(b.time);
        return this.filters.timeSort === 'asc' ? comparison : -comparison;
      });
    }

    // メモの並び替え
    if (this.filters.memoSort !== 'none') {
      filtered.sort((a, b) => {
        const comparison = a.memo.toLowerCase().localeCompare(b.memo.toLowerCase());
        return this.filters.memoSort === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredTaskLists = filtered;
  }

  sortTasks(column: keyof TaskLists): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applyFilters();
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.getRawValue();
      
      if (this.editingTask) {
        const index = this.taskLists.indexOf(this.editingTask);
        if (index !== -1) {
          this.taskLists[index] = { ...formValue };
        }
        this.editingTask = null;
      } else {
        this.taskLists.push(formValue);
      }
      this.taskForm.reset();
      this.applyFilters();
    }
  }

  changeStatus(taskList: TaskLists): void {
    taskList.completed = !taskList.completed;
    this.applyFilters();

    if(taskList.completed){
      alert('ナイスワーク！');
    }
  }

  deleteTask(taskList: TaskLists): void {
    const index = this.taskLists.indexOf(taskList);
    if (index !== -1) {
      this.taskLists.splice(index, 1);
      this.applyFilters();
    }
  }

  editTask(taskList: TaskLists): void {
    this.editingTask = taskList;
    this.taskForm.patchValue({
      title: taskList.title,
      date: taskList.date,
      time: taskList.time,
      memo: taskList.memo,
    });
  }

  drop(event: CdkDragDrop<TaskLists[]>) {
    moveItemInArray(this.taskLists, event.previousIndex, event.currentIndex);
  }

  // 時間を分単位に変換するヘルパーメソッド
  private convertTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

}
