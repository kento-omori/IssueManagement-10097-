import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Todo, CustomField, Comment, Reply } from './todo.interface';
import { FindPipe } from './find.pipe';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { SharedTodoGanttService, GanttTask } from '../services/shared-todo-gantt.service';

interface Filters {
  managementNumber: string;
  managementNumberSort: 'none' | 'asc' | 'desc';
  title: string;
  titleSort: 'none' | 'asc' | 'desc';
  category: string;
  categorySort: 'none' | 'asc' | 'desc';
  startDateFrom: string;
  startDateTo: string;
  startDateSort: 'none' | 'asc' | 'desc';
  endDateFrom: string;
  endDateTo: string;
  endDateSort: 'none' | 'asc' | 'desc';
  assignee: string;
  assigneeSort: 'none' | 'asc' | 'desc';
  status: string;
  statusSort: 'none' | 'asc' | 'desc';
  priority: string;
  prioritySort: 'none' | 'asc' | 'desc';
  completed: 'all' | 'true' | 'false';
  [key: string]: string; // カスタムフィールドのフィルタリング用
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FindPipe, FormsModule],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.css'
})
export class TodoComponent implements OnInit {
  todos: Todo[] = [];
  filteredTodos: Todo[] = [];
  currentManagementNumber: number = 1;
  deletedNumbers: number[] = [];
  previousStatus: { [key: number]: string } = {};  // 管理番号をキーとして前回のステータスを保存
  customFields: CustomField[] = [];

  // コメント関連の状態管理
  selectedTodo: Todo | null = null;
  showCommentModal = false;
  selectedComment: Comment | null = null;
  showReplyModal = false;

  // フォームグループ
  todoForm: FormGroup = new FormGroup({
    managementNumber: new FormControl({value: this.getNextAvailableNumber(), disabled: true}),
    title: new FormControl('', [Validators.required]),
    category: new FormControl('', [Validators.required]),
    startDate: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
    endDate: new FormControl('', [Validators.required]),
    assignee: new FormControl('', [Validators.required]),
    status: new FormControl('', [Validators.required]),
    priority: new FormControl('', [Validators.required])
  }, {
    validators: this.dateComparisonValidator
  });

  // カスタムフィールドのフォームグループ
  customFieldForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    type: new FormControl('text', [Validators.required])
  });

  // コメントフォームグループ
  commentForm: FormGroup = new FormGroup({
    text: new FormControl('', [Validators.required])
  });

  // 返信フォームグループ
  replyForm: FormGroup = new FormGroup({
    text: new FormControl('', [Validators.required])
  });

  // フィルターの初期値
  filters: Filters = {
    managementNumber: '',
    managementNumberSort: 'none',
    title: '',
    titleSort: 'none',
    category: '',
    categorySort: 'none',
    startDateFrom: '',
    startDateTo: '',
    startDateSort: 'none',
    endDateFrom: '',
    endDateTo: '',
    endDateSort: 'none',
    assignee: '',
    assigneeSort: 'none',
    status: 'all',
    statusSort: 'none',
    priority: 'all',
    prioritySort: 'none',
    completed: 'all'
  };

  // コンストラクター
  constructor(
    private authService: AuthService,
    private sharedTodoGanttService: SharedTodoGanttService
  ) { }

  // 初期化
  ngOnInit(): void {
    this.applyFilters(); // 初期化時にフィルタリングを適用
  }

  // 削除機能　→　サービスへ送信
  deleteTodo(managementNumber: number): void {
    const index = this.todos.findIndex(todo => todo.managementNumber === managementNumber);//配列内で特定の条件に合致する最初の要素のインデックス（位置）を探し出して返すメソッド
    if (index !== -1) {
      this.todos.splice(index, 1); // 配列の指定された位置から1つの要素を削除するメソッド indexで指定された配列の次の要素を一つ削除
      this.deletedNumbers.push(managementNumber);
      // 保存していたステータスも削除
      delete this.previousStatus[managementNumber];
      this.applyFilters(); // 削除後にフィルタリングを適用
    }

      // todoリストをガントチャート用に変換してサービスへ送信
      const ganttTasks: GanttTask[] = this.todos.map(todo => ({
        id: todo.managementNumber,
        text: todo.title,
        category: todo.category,
        start_date: todo.startDate,
        end_date: todo.endDate,
        assignee: todo.assignee,
        status: todo.status,
        priority: todo.priority,
        managementNumber: todo.managementNumber
      }));
      this.sharedTodoGanttService.setTasks(ganttTasks);
  }

  // 編集機能　→　サービスへ送信
  editTodo(todo: Todo): void {
    this.todoForm.patchValue({   ///Angularのフォームで部分的にフォームの値を更新するためのメソッド（指定していないフィールドは現在の値を保持する）
      managementNumber: todo.managementNumber,
      title: todo.title,
      category: todo.category,
      startDate: todo.startDate,
      endDate: todo.endDate,
      assignee: todo.assignee,
      status: todo.status,
      priority: todo.priority
    });

    // カスタムフィールドの値も設定
    todo.customFields.forEach(field => {
      this.todoForm.get(`custom_${field.id}`)?.setValue(field.value);
    });

    this.currentManagementNumber = todo.managementNumber;      // 編集時は管理番号をインクリメントしない

      // todoリストをガントチャート用に変換してサービスへ送信
      const ganttTasks: GanttTask[] = this.todos.map(todo => ({
        id: todo.managementNumber,
        text: todo.title,
        category: todo.category,
        start_date: todo.startDate,
        end_date: todo.endDate,
        assignee: todo.assignee,
        status: todo.status,
        priority: todo.priority,
        managementNumber: todo.managementNumber
      }));
      this.sharedTodoGanttService.setTasks(ganttTasks);
  }

  // 完了状態を切り替えるメソッド
  changeStatus(todo: Todo): void {
    todo.completed = !todo.completed;
    if (todo.completed) {
      // 完了にする前のステータスを保存
      this.previousStatus[todo.managementNumber] = todo.status;
      todo.status = '完了';
    } else {
      // 保存していた前回のステータスを復元
      todo.status = this.previousStatus[todo.managementNumber] || '未着手';
    }
    this.applyFilters(); // ステータス変更後にフィルタリングを適用
  }

  // 追加機能　→　サービスへ送信
  onSubmit(): void {
    // すべてのフォームコントロールをタッチ済みとしてマーク
    Object.keys(this.todoForm.controls).forEach(key => {
      const control = this.todoForm.get(key);
      control?.markAsTouched();
    });

    if (this.todoForm.valid) {
      const formValue = {
        ...this.todoForm.getRawValue(),
        completed: false,
        customFields: this.customFields.map(field => ({
          ...field,
          value: this.todoForm.get(`custom_${field.id}`)?.value || ''
        })),
        comments: [] // コメント配列を初期化
      };
      
      const existingIndex = this.todos.findIndex(todo => todo.managementNumber === formValue.managementNumber);// 指定されたテスト関数を満たす配列要素のインデックスを返す
      
      if (existingIndex !== -1) { // 指定されたテスト関数を満たす配列要素のインデックスを返す
        // 既存のTodoを更新（completedの状態は保持）
        this.todos[existingIndex] = {
          ...formValue,
          completed: this.todos[existingIndex].completed,
          comments: this.todos[existingIndex].comments // 既存のコメントを保持
        };
      } else {
        this.todos.push(formValue);
        this.currentManagementNumber++;
      }

      // todoリストをガントチャート用に変換してサービスへ送信
      const ganttTasks: GanttTask[] = this.todos.map(todo => ({
        id: todo.managementNumber,
        text: todo.title,
        category: todo.category,
        start_date: todo.startDate,
        end_date: todo.endDate,
        assignee: todo.assignee,
        status: todo.status,
        priority: todo.priority,
        managementNumber: todo.managementNumber
      }));
      this.sharedTodoGanttService.setTasks(ganttTasks);

      // フォームをリセット
      this.todoForm.reset({
        managementNumber: this.getNextAvailableNumber(),
        startDate: new Date().toISOString().split('T')[0],
        category: '',
        assignee: '',
        status: '',
        priority: ''
      });

      // リセット後にmanagementNumberフィールドを再度disabledに設定
      this.todoForm.get('managementNumber')?.disable();

      // データ更新後にフィルタリングを適用
      this.applyFilters();
    }
  }

  // 日付比較のカスタムバリデーター
  private dateComparisonValidator(group: AbstractControl): ValidationErrors | null {
    const startDate = group.get('startDate')?.value;  // startDateコントロールの値を取得・オプショナルチェーン演算子 (?.)オブジェクトが存在しない場合はundedinedを返す→エラー防止のため
    const endDate = group.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        return { dateInvalid: true };  // 日付が間違っている場合はdateInvalidプロパティをtrueに設定
      }
    }
    return null;  // 日付が正しい場合はnullを返す
  }

  // 次に使用可能な管理番号を取得
  private getNextAvailableNumber(): number {
    if (this.deletedNumbers && this.deletedNumbers.length > 0) {
      const nextNumber = Math.min(...this.deletedNumbers);
      const index = this.deletedNumbers.indexOf(nextNumber);
      this.deletedNumbers.splice(index, 1);
      return nextNumber;
    }
    return this.currentManagementNumber;
  }

  // カスタムフィールド追加
  addCustomField(): void {
    if (this.customFieldForm.valid) {
      const fieldName = this.customFieldForm.get('name')?.value;
      const fieldType = this.customFieldForm.get('type')?.value;
      
      const newField: CustomField = {
        id: Date.now().toString(),
        name: fieldName,
        type: fieldType,
        value: ''
      };
      
      this.customFields.push(newField);
      
      // フォームにカスタムフィールドを追加
      this.todoForm.addControl(`custom_${newField.id}`, new FormControl(''));
      
      // フィルターにカスタムフィールドを追加
      this.filters[`custom_${newField.id}`] = '';
      this.filters[`custom_${newField.id}_sort`] = 'none';
      
      this.customFieldForm.reset({
        type: 'text'
      });
    }
  }

  // カスタムフィールド削除
  removeCustomField(fieldId: string): void {
    const index = this.customFields.findIndex(field => field.id === fieldId);
    if (index !== -1) {
      this.customFields.splice(index, 1);
      this.todoForm.removeControl(`custom_${fieldId}`);
      
      // フィルターからカスタムフィールドを削除
      delete this.filters[`custom_${fieldId}`];
      delete this.filters[`custom_${fieldId}_sort`];
      
      // 既存のTodoからカスタムフィールドを削除
      this.todos.forEach(todo => {
        todo.customFields = todo.customFields.filter(field => field.id !== fieldId);
      });

      this.applyFilters();
    }
  }

  // コメントモーダルを開く
  openCommentModal(todo: Todo): void {
    this.selectedTodo = todo;
    this.showCommentModal = true;
    this.commentForm.reset();
    this.replyForm.reset();
  }

  // コメントモーダルを閉じる
  closeCommentModal(): void {
    this.selectedTodo = null;
    this.showCommentModal = false;
    this.commentForm.reset();
    this.replyForm.reset();
  }

  // コメントを追加
  addComment(): void {
    if (this.commentForm.valid && this.selectedTodo) {
      const newComment: Comment = {
        id: uuidv4(),
        text: this.commentForm.value.text,
        userId: this.authService.getCurrentUserId() || '匿名',
        userName: this.authService.getCurrentUser()?.displayName || '匿名',
        createdAt: new Date(),
        replies: []
      };
      this.selectedTodo.comments.push(newComment);
      this.commentForm.reset();
    }
  }

  // コメントを削除
  deleteComment(todo: Todo, commentId: string): void {
    const index = todo.comments.findIndex(comment => comment.id === commentId);
    if (index !== -1) {
      todo.comments.splice(index, 1);
    }
  }

  // 返信を追加
  addReplyToComment(commentId: string): void {
    if (this.replyForm.valid && this.selectedTodo) {
      const comment = this.selectedTodo.comments.find(c => c.id === commentId);
      if (comment) {
        const newReply: Reply = {
          id: uuidv4(),
          text: this.replyForm.value.text,
          userId: this.authService.getCurrentUserId() || '匿名',
          userName: this.authService.getCurrentUser()?.displayName || '匿名',
          createdAt: new Date()
        };
        comment.replies.push(newReply);
        this.replyForm.reset();
      }
    }
  }

  // 返信を削除
  deleteReply(comment: Comment, replyId: string): void {
    const index = comment.replies.findIndex(reply => reply.id === replyId);
    if (index !== -1) {
      comment.replies.splice(index, 1);
    }
  }

  //フィルタリング機能や並び替え機能
  applyFilters(): void {
    let filtered = [...this.todos];

    // 管理番号でフィルタリング
    if (this.filters.managementNumber) {
      const searchNumber = this.filters.managementNumber.toString();
      filtered = filtered.filter(todo => 
        todo.managementNumber.toString().includes(searchNumber)
      );
    }

    // タイトルでフィルタリング
    if (this.filters.title) {
      const searchLower = this.filters.title.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(searchLower)
      );
    }

    // カテゴリでフィルタリング
    if (this.filters.category) {
      const searchLower = this.filters.category.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.category.toLowerCase().includes(searchLower)
      );
    }

    // 開始日でフィルタリング
    if (this.filters.startDateFrom || this.filters.startDateTo) {
      filtered = filtered.filter(todo => {
        if (!todo.startDate) return false;
        
        const todoDate = new Date(todo.startDate);
        let isMatch = true;

        if (this.filters.startDateFrom) {
          const fromDate = new Date(this.filters.startDateFrom);
          isMatch = isMatch && todoDate >= fromDate;
        }
        if (this.filters.startDateTo) {
          const toDate = new Date(this.filters.startDateTo);
          isMatch = isMatch && todoDate <= toDate;
        }

        return isMatch;
      });
    }

    // 期限でフィルタリング
    if (this.filters.endDateFrom || this.filters.endDateTo) {
      filtered = filtered.filter(todo => {
        if (!todo.endDate) return false;
        
        const todoDate = new Date(todo.endDate);
        let isMatch = true;

        if (this.filters.endDateFrom) {
          const fromDate = new Date(this.filters.endDateFrom);
          isMatch = isMatch && todoDate >= fromDate;
        }
        if (this.filters.endDateTo) {
          const toDate = new Date(this.filters.endDateTo);
          isMatch = isMatch && todoDate <= toDate;
        }

        return isMatch;
      });
    }

    // 担当者でフィルタリング
    if (this.filters.assignee) {
      const searchLower = this.filters.assignee.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.assignee.toLowerCase().includes(searchLower)
      );
    }

    // ステータスでフィルタリング
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(todo => todo.status === this.filters.status);
    }

    // 優先度でフィルタリング
    if (this.filters.priority !== 'all') {
      filtered = filtered.filter(todo => todo.priority === this.filters.priority);
    }

    // 完了状態でフィルタリング
    if (this.filters.completed !== 'all') {
      const isCompleted = this.filters.completed === 'true';
      filtered = filtered.filter(todo => todo.completed === isCompleted);
    }

    // カスタムフィールドのフィルタリング
    this.customFields.forEach(field => {
      const filterValue = this.filters[`custom_${field.id}`];
      if (filterValue) {
        filtered = filtered.filter(todo => {
          const customField = todo.customFields.find(cf => cf.id === field.id);
          if (!customField) return false;
          const value = String(customField.value);
          return value.toLowerCase().includes(filterValue.toLowerCase());
        });
      }

      // カスタムフィールドの並び替え
      const sortDirection = this.filters[`custom_${field.id}_sort`];
      if (sortDirection !== 'none') {
        filtered.sort((a, b) => {
          const aValue = String(a.customFields.find(cf => cf.id === field.id)?.value || '');
          const bValue = String(b.customFields.find(cf => cf.id === field.id)?.value || '');
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    });

    // 並び替えの適用
    this.applySorting(filtered);

    this.filteredTodos = filtered;
  }

  private applySorting(todos: Todo[]): void {
    // 管理番号の並び替え
    if (this.filters.managementNumberSort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.managementNumber - b.managementNumber;
        return this.filters.managementNumberSort === 'asc' ? comparison : -comparison;
      });
    }

    // タイトルの並び替え
    if (this.filters.titleSort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        return this.filters.titleSort === 'asc' ? comparison : -comparison;
      });
    }

    // カテゴリの並び替え
    if (this.filters.categorySort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.category.toLowerCase().localeCompare(b.category.toLowerCase());
        return this.filters.categorySort === 'asc' ? comparison : -comparison;
      });
    }

    // 開始日の並び替え
    if (this.filters.startDateSort !== 'none') {
      todos.sort((a, b) => {
        if (!a.startDate) return this.filters.startDateSort === 'asc' ? 1 : -1;
        if (!b.startDate) return this.filters.startDateSort === 'asc' ? -1 : 1;
        const comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        return this.filters.startDateSort === 'asc' ? comparison : -comparison;
      });
    }

    // 期限の並び替え
    if (this.filters.endDateSort !== 'none') {
      todos.sort((a, b) => {
        if (!a.endDate) return this.filters.endDateSort === 'asc' ? 1 : -1;
        if (!b.endDate) return this.filters.endDateSort === 'asc' ? -1 : 1;
        const comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        return this.filters.endDateSort === 'asc' ? comparison : -comparison;
      });
    }

    // 担当者の並び替え
    if (this.filters.assigneeSort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.assignee.toLowerCase().localeCompare(b.assignee.toLowerCase());
        return this.filters.assigneeSort === 'asc' ? comparison : -comparison;
      });
    }

    // ステータスの並び替え
    if (this.filters.statusSort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.status.localeCompare(b.status);
        return this.filters.statusSort === 'asc' ? comparison : -comparison;
      });
    }

    // 優先度の並び替え
    if (this.filters.prioritySort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.priority.localeCompare(b.priority);
        return this.filters.prioritySort === 'asc' ? comparison : -comparison;
      });
    }
  }

  sortTodos(column: keyof Todo): void {
    const sortProperty = `${column}Sort` as keyof Filters;
    const currentSort = this.filters[sortProperty];
    
    if (currentSort === 'none' || currentSort === 'desc') {
      (this.filters[sortProperty] as any) = 'asc';
    } else {
      (this.filters[sortProperty] as any) = 'desc';
    }

    this.applyFilters();
  }

  // カスタムフィールドの並び替え
  sortCustomField(fieldId: string): void {
    const sortProperty = `custom_${fieldId}_sort` as keyof Filters;
    const currentSort = this.filters[sortProperty];
    
    if (currentSort === 'none' || currentSort === 'desc') {
      this.filters[sortProperty] = 'asc';
    } else {
      this.filters[sortProperty] = 'desc';
    }

    this.applyFilters();
  }
  
}
