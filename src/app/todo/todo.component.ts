import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Todo, CustomField, Comment, Reply, Filters } from './todo.interface';
import { FindPipe } from './find.pipe';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { v4 as uuidv4 } from 'uuid';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { IdManagerService } from '../services/id-manager.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FindPipe, FormsModule, DragDropModule],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.css'
})
export class TodoComponent implements OnInit, OnDestroy {
  // プロパティ
  todos: Todo[] = [];
  editingTodo: Todo | null = null;
  filteredTodos: Todo[] = [];
  currentId: number = 1;
  deletedId: number[] = [];
  previousStatus: { [key: number]: string } = {};  // 管理番号をキーとして前回のステータスを保存 dbidはundefinedになる可能性があるため、idをキーとして保存
  customFields: CustomField[] = [];

  // コメント関連の状態管理
  selectedTodo: Todo | null = null;
  showCommentModal = false;
  selectedComment: Comment | null = null;
  showReplyModal = false;

  // フォームグループ
  todoForm: FormGroup = new FormGroup({
    id: new FormControl({value: null, disabled: true}),
    text: new FormControl('', [Validators.required]),
    category: new FormControl('', [Validators.required]),
    start_date: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
    end_date: new FormControl('', [Validators.required]),
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
    id: '',
    idSort: 'none',
    text: '',
    textSort: 'none',
    category: '',
    categorySort: 'none',
    start_dateFrom: '',
    start_dateTo: '',
    start_dateSort: 'none',
    end_dateFrom: '',  
    end_dateTo: '',
    end_dateSort: 'none',
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
    private todoFirestoreService: TodoFirestoreService,
    private idManagerService: IdManagerService
  ) {
    // フォームの初期化をconstructorから削除
    this.todoForm = new FormGroup({
      id: new FormControl({value: null, disabled: true}),
      text: new FormControl('', [Validators.required]),
      category: new FormControl('', [Validators.required]),
      start_date: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
      end_date: new FormControl('', [Validators.required]),
      assignee: new FormControl('', [Validators.required]),
      status: new FormControl('', [Validators.required]),
      priority: new FormControl('', [Validators.required])
    }, {
      validators: this.dateComparisonValidator
    });
  }

  // 初期化
  ngOnInit(): void {
    // 保存されていたフィルター状態を復元
    this.loadFiltersFromLocalStorage();

    this.todoFirestoreService.getTodos().subscribe(todos => {
      this.todos = todos;
      // フィルター状態を適用
      this.applyFilters();
      
      if (todos.length > 0) {
        const maxId = Math.max(...todos.map(todo => todo.id));
        this.idManagerService.setCurrentId(maxId);
      }

      // Todoデータを取得した後にフォームを初期化
      this.initializeForm();
    });
  }

  // フォーム初期化用のメソッドを追加
  private initializeForm(): void {
    this.todoForm = new FormGroup({
      id: new FormControl({value: this.getNextAvailableId(), disabled: true}),
      text: new FormControl('', [Validators.required]),
      category: new FormControl('', [Validators.required]),
      start_date: new FormControl(new Date().toISOString().split('T')[0], [Validators.required]),
      end_date: new FormControl('', [Validators.required]),
      assignee: new FormControl('', [Validators.required]),
      status: new FormControl('', [Validators.required]),
      priority: new FormControl('', [Validators.required])
    }, {
      validators: this.dateComparisonValidator
    });
  }

  // 削除機能
  deleteTodo(todos: Todo): void {
    if (todos.dbid) {
      this.todoFirestoreService.deleteTodo(todos.dbid);
      // ローカル配列からも即時削除
      this.todos = this.todos.filter(todo => todo.dbid !== todos.dbid);
      this.filteredTodos = this.filteredTodos.filter(todo => todo.dbid !== todos.dbid);
      // ステータスやID管理も更新
      delete this.previousStatus[todos.id];
      this.idManagerService.deleteId(todos.id);
      // フォームのID値を更新
      this.todoForm.patchValue({
        id: this.getNextAvailableId()
      });
      // フィルタリングを適用して画面を即時更新
      this.applyFilters();
      // 削除IDを記録
      this.deletedId.push(todos.id); 
    }
  }

  // 編集機能
  editTodo(todo: Todo): void {
    this.editingTodo = { ...todo };
    this.todoForm.patchValue({   ///Angularのフォームで部分的にフォームの値を更新するためのメソッド（指定していないフィールドは現在の値を保持する）
      id: todo.id,
      text: todo.text,
      category: todo.category,
      start_date: todo.start_date,
      end_date: todo.end_date,
      assignee: todo.assignee,
      status: todo.status,
      priority: todo.priority
    });
    // カスタムフィールドの値も設定
    todo.customFields?.forEach(field => {
      this.todoForm.get(`custom_${field.id}`)?.setValue(field.value);
    });
    this.currentId = todo.id;      // 編集時は管理番号をインクリメントしない
  }

  // 追加機能
  onSubmit(): void {
    // すべてのフォームコントロールをタッチ済みとしてマーク
    Object.keys(this.todoForm.controls).forEach(key => {
      const control = this.todoForm.get(key);
      control?.markAsTouched();
    });

    if (this.todoForm.valid) {
      // 現在のorderの最大値を取得
      const maxOrder = this.todos.length > 0
        ? Math.max(...this.todos.map(todo => todo.order ?? 0))
        : 0;

      const formValue = {
        ...this.todoForm.getRawValue(),
        id: this.editingTodo ? this.editingTodo.id : this.getNextAvailableId(),
        completed: false,
        customFields: this.customFields.map(field => ({
          ...field,
          value: this.todoForm.get(`custom_${field.id}`)?.value || ''
        })),
        comments: [],
        order: this.editingTodo ? this.editingTodo.order : maxOrder + 1
      };

      // 既存のTodoを更新  
      if (this.editingTodo) {
        const index = this.todos.findIndex(todo => todo.dbid === this.editingTodo!.dbid);
        if (index !== -1) {
          this.todos[index] = {
            ...this.todos[index],  // 既存の値を全て保持
            ...formValue,          // フォームの値で上書き
          };
          this.todoFirestoreService.updateTodo(this.editingTodo!.dbid!, formValue);
          this.editingTodo = null;
          // 既存のIDを使用しているため、IDManagerServiceには通知しない
        }
      // 新しいTodoを追加
      } else {
        this.todos.push(formValue);
        this.todoFirestoreService.addTodo(formValue);
        // 新しいIDを使用したことをIDManagerServiceに通知
        this.idManagerService.setCurrentId(formValue.id);
      }

      // フォームをリセット
      this.todoForm.reset({
        id: this.getNextAvailableId(),
        text: '',
        category: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        assignee: '',
        status: '',
        priority: ''
      });
      // リセット後にidフィールドを再度disabledに設定
      this.todoForm.get('id')?.disable();
      // データ更新後にフィルタリングを適用
      this.applyFilters();
    }
  }

  // 完了状態 切り替え機能
  changeStatus(todo: Todo): void {
    todo.completed = !todo.completed;
    if (todo.completed) {
      // 完了にする前のステータスを保存
      this.previousStatus[todo.id] = todo.status;
      todo.status = '完了';
      this.todoFirestoreService.updateTodo(todo.dbid!, { completed: todo.completed, status: todo.status });
    } else {
      // 保存していた前回のステータスを復元
      todo.status = this.previousStatus[todo.id] || '未着手';
      this.todoFirestoreService.updateTodo(todo.dbid!, { completed: todo.completed, status: todo.status });
    };
    this.applyFilters(); // ステータス変更後にフィルタリングを適用
  };

  // 日付比較のカスタムバリデーター
  private dateComparisonValidator(group: AbstractControl): ValidationErrors | null {
    const start_date = group.get('start_date')?.value;  // start_dateコントロールの値を取得・オプショナルチェーン演算子 (?.)オブジェクトが存在しない場合はundedinedを返す→エラー防止のため
    const end_date = group.get('end_date')?.value;

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (end < start) {
        return { dateInvalid: true };  // 日付が間違っている場合はdateInvalidプロパティをtrueに設定
      }
    }
    return null;  // 日付が正しい場合はnullを返す
  }

  // 次に使用可能な管理番号を取得
  getNextAvailableId(): number {
    // 既存のID一覧
    const usedIds = this.todos.map(todo => todo.id);
    // 1から順に、使われていない最小の番号を探す
    let nextId = 1;
    while (usedIds.includes(nextId)) {
      nextId++;
    }
    return nextId;
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
      this.customFieldForm.reset({ type: 'text' });
      // 既存のTodoにカスタムフィールドを追加
      this.todos.forEach(async (todo) => {
        todo.customFields = todo.customFields || [];
        todo.customFields.push(newField);
        // Firestoreにも反映
        await this.todoFirestoreService.updateTodo(todo.dbid!, { customFields: todo.customFields });
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
      this.todos.forEach(async (todo) => {
        todo.customFields = (todo.customFields || []).filter(field => field.id !== fieldId);
        // Firestoreにも反映
        await this.todoFirestoreService.updateTodo(todo.dbid!, { customFields: todo.customFields });
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
      this.selectedTodo.comments = this.selectedTodo.comments || [];
      this.selectedTodo.comments.push(newComment);
      // Firestoreに反映
      if (this.selectedTodo.dbid) {
        this.todoFirestoreService.updateTodo(this.selectedTodo.dbid, { comments: this.selectedTodo.comments });
      }
      this.commentForm.reset();
    }
  }

  // コメントを削除
  deleteComment(todo: Todo, commentId: string): void {
    if (!todo.comments) return;
    const index = todo.comments.findIndex(comment => comment.id === commentId);
    if (index !== -1) {
      todo.comments.splice(index, 1);
      // Firestoreに反映
      if (todo.dbid) {
        this.todoFirestoreService.updateTodo(todo.dbid, { comments: todo.comments });
      }
    }
  }

  // 返信を追加
  addReplyToComment(commentId: string): void {
    if (this.replyForm.valid && this.selectedTodo) {
      const comment = this.selectedTodo.comments?.find(c => c.id === commentId);
      if (comment) {
        const newReply: Reply = {
          id: uuidv4(),
          text: this.replyForm.value.text,
          userId: this.authService.getCurrentUserId() || '匿名',
          userName: this.authService.getCurrentUser()?.displayName || '匿名',
          createdAt: new Date()
        };
        comment.replies.push(newReply);
        // Firestoreに反映
        if (this.selectedTodo.dbid) {
          this.todoFirestoreService.updateTodo(this.selectedTodo.dbid, { comments: this.selectedTodo.comments });
        }
        this.replyForm.reset();
      }
    }
  }

  // 返信を削除
  deleteReply(comment: Comment, replyId: string): void {
    const index = comment.replies.findIndex(reply => reply.id === replyId);
    if (index !== -1) {
      comment.replies.splice(index, 1);
      // Firestoreに反映
      if (this.selectedTodo && this.selectedTodo.dbid) {
        this.todoFirestoreService.updateTodo(this.selectedTodo.dbid, { comments: this.selectedTodo.comments });
      }
    }
  }

  //フィルタリング機能
  applyFilters(): void {
    let filtered = [...this.todos];

    // 管理番号でフィルタリング
    if (this.filters.id) {
      const searchNumber = this.filters.id.toString();
      filtered = filtered.filter(todo => 
        todo.id.toString().includes(searchNumber)
      );
    }

    // タイトルでフィルタリング
    if (this.filters.text) {
      const searchLower = this.filters.text.toLowerCase();
      filtered = filtered.filter(todo => 
        todo.text.toLowerCase().includes(searchLower)
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
    if (this.filters.start_dateFrom || this.filters.start_dateTo) {
      filtered = filtered.filter(todo => {
        if (!todo.start_date) return false;
        
        const todoDate = new Date(todo.start_date);
        let isMatch = true;

        if (this.filters.start_dateFrom) {
          const fromDate = new Date(this.filters.start_dateFrom);
          isMatch = isMatch && todoDate >= fromDate;
        }
        if (this.filters.start_dateTo) {
          const toDate = new Date(this.filters.start_dateTo);
          isMatch = isMatch && todoDate <= toDate;
        }

        return isMatch;
      });
    }

    // 期限でフィルタリング
    if (this.filters.end_dateFrom || this.filters.end_dateTo) {
      filtered = filtered.filter(todo => {
        if (!todo.end_date) return false;
        
        const todoDate = new Date(todo.end_date);
        let isMatch = true;

        if (this.filters.end_dateFrom) {
          const fromDate = new Date(this.filters.end_dateFrom);
          isMatch = isMatch && todoDate >= fromDate;
        }
        if (this.filters.end_dateTo) {
          const toDate = new Date(this.filters.end_dateTo);
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
          const customField = todo.customFields?.find(cf => cf.id === field.id);
          if (!customField) return false;
          const value = String(customField.value);
          return value.toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // 並び替えの適用
    this.applySorting(filtered);

    // フィルタリング後の状態を保存
    this.saveFiltersToLocalStorage();
    // order順でソート
    if (this.isDragDropEnabled()) {
      filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    
    this.filteredTodos = filtered;
  }

  // 並び替え（ソート）機能（直接htmlには出てこない。applyFiltersの中で呼び出される）
  private applySorting(todos: Todo[]): void {

    // 管理番号の並び替え
    if (this.filters.idSort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.id - b.id;
        return this.filters.idSort === 'asc' ? comparison : -comparison;
      });
    }

    // タイトルの並び替え
    if (this.filters.textSort !== 'none') {
      todos.sort((a, b) => {
        const comparison = a.text.toLowerCase().localeCompare(b.text.toLowerCase());
        return this.filters.textSort === 'asc' ? comparison : -comparison;
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
    if (this.filters.start_dateSort !== 'none') {
      todos.sort((a, b) => {
        if (!a.start_date) return this.filters.start_dateSort === 'asc' ? 1 : -1;
        if (!b.start_date) return this.filters.start_dateSort === 'asc' ? -1 : 1;
        const comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        return this.filters.start_dateSort === 'asc' ? comparison : -comparison;
      });
    }

    // 期限の並び替え
    if (this.filters.end_dateSort !== 'none') {
      todos.sort((a, b) => {
        if (!a.end_date) return this.filters.end_dateSort === 'asc' ? 1 : -1;
        if (!b.end_date) return this.filters.end_dateSort === 'asc' ? -1 : 1;
        const comparison = new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        return this.filters.end_dateSort === 'asc' ? comparison : -comparison;
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

    // カスタムフィールドの並び替え
    this.customFields.forEach(field => {
      const sortDirection = this.filters[`custom_${field.id}_sort`];
      if (sortDirection !== 'none') {
        todos.sort((a, b) => {
          const aValue = String(a.customFields?.find(cf => cf.id === field.id)?.value || '');
          const bValue = String(b.customFields?.find(cf => cf.id === field.id)?.value || '');
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    });
  }

  // 並び替え（ソート）機能（通常用）(Filterアイコンではなく、名前を押したら変更されるVersion)
  sortTodos(column: keyof Todo): void {
    const sortProperty = `${column}Sort` as keyof Filters;
    const currentSort = this.filters[sortProperty];
    //昇順・降順の切り替え
    if (currentSort === 'none' || currentSort === 'desc') {
      (this.filters[sortProperty] as any) = 'asc';
    } else {
      (this.filters[sortProperty] as any) = 'desc';
    }
    //フィルタリングを適用して、反映させる
    this.applyFilters();
  }

  // 並び替え（ソート）機能（カスタムフィールド用）(Filterアイコンではなく、名前を押したら変更されるVersion)
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

  // ドラックアンドドロップ
  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.filteredTodos, event.previousIndex, event.currentIndex);

    // orderを更新しFirestoreにも反映
    this.filteredTodos.forEach((todo, idx) => {
      todo.order = idx;
      if (todo.dbid) {
        this.todoFirestoreService.updateTodo(todo.dbid, { order: todo.order });
      }
    });

    // Firestoreの反映を待たずにローカルで即時反映
    this.filteredTodos = [...this.filteredTodos];
  }

  // フィルター状態を保存
  private saveFiltersToLocalStorage(): void {
    localStorage.setItem('todoFilters', JSON.stringify(this.filters));
  }

  // フィルター状態を復元
  private loadFiltersFromLocalStorage(): void {
    const savedFilters = localStorage.getItem('todoFilters');
    if (savedFilters) {
      this.filters = JSON.parse(savedFilters);
    }
  }

  // コンポーネント破棄時にフィルター状態をクリアする場合は追加
  ngOnDestroy() {
    // 必要に応じてフィルター状態をクリア
    // localStorage.removeItem('todoFilters');
  }

  isDragDropEnabled(): boolean {
    // フィルタやソートが一つでも有効ならfalse
    const isFiltered = this.filters.id || this.filters.text || this.filters.category ||
      this.filters.start_dateFrom || this.filters.start_dateTo ||
      this.filters.end_dateFrom || this.filters.end_dateTo ||
      this.filters.assignee || (this.filters.status !== 'all') ||
      (this.filters.priority !== 'all') || (this.filters.completed !== 'all') ||
      this.customFields.some(field => this.filters[`custom_${field.id}`]);
    const isSorted = [
      this.filters.idSort, this.filters.textSort, this.filters.categorySort,
      this.filters.start_dateSort, this.filters.end_dateSort,
      this.filters.assigneeSort, this.filters.statusSort, this.filters.prioritySort,
      ...this.customFields.map(field => this.filters[`custom_${field.id}_sort`])
    ].some(sort => sort !== 'none');
    return !(isFiltered || isSorted);
  }
}

