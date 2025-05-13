import { Component, ElementRef, AfterViewInit, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';
import { IdManagerService } from '../services/id-manager.service';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { Todo } from '../todo/todo.interface';
import { firstValueFrom, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gantt-chart',
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css'],
  standalone: true,
  imports:[ReactiveFormsModule, CommonModule, RouterModule]
})
export class GanttChartComponent implements AfterViewInit, OnDestroy, OnInit {

  @ViewChild('ganttChart', { static: true }) ganttChart!: ElementRef;
  taskForm!: FormGroup;
  tasks: Todo[] | null = null;
  formMode: 'new' | 'edit' | 'switched' = 'new';  // フォームのモードを管理
  formModeMessage: string = '';  // モードメッセージを管理
  private isPopupVisible: boolean = false;  // クラスプロパティとして移動
  private popupTimeout: any;  // ポップアップのタイムアウト管理用

  constructor(
    private idManagerService: IdManagerService,
    private fb: FormBuilder,
    private todoFirestoreService: TodoFirestoreService
  ) {
    this.initForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      id: ['', [Validators.required, Validators.min(1), Validators.max(999)]],
      text: ['', [Validators.required, this.noWhitespaceValidator]],
      category: ['', [Validators.required, this.noWhitespaceValidator]],
      start_date: [new Date().toISOString().split('T')[0], [Validators.required]],
      end_date: ['', [Validators.required]],
      assignee: ['', [Validators.required, this.noWhitespaceValidator]],
      status: ['未着手', [Validators.required]],
      priority: ['普通', [Validators.required]],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    }, {
      validators: this.dateComparisonValidator
    });
  }

  private dateComparisonValidator(form: FormGroup) {
    const startDate = new Date(form.get('start_date')?.value);
    const endDate = new Date(form.get('end_date')?.value);

    if (startDate > endDate) {
      return { dateComparison: true };
    }
    return null;
  }

  private initForm() {
    this.taskForm = this.createForm();
    this.setupIdWatcher();
    this.formMode = 'new';
    this.formModeMessage = '新規作成モード';
  }

  private setupIdWatcher() {
    this.taskForm.get('id')?.valueChanges
      .pipe(
        switchMap(id => {
          if (!id) {
            this.taskForm.patchValue({
              text: '',
              category: '',
              start_date: new Date().toISOString().split('T')[0],
              end_date: '',
              assignee: '',
              status: '未着手',
              priority: '普通',
              progress: 0
            }, { emitEvent: false });
            this.formMode = 'new';
            this.formModeMessage = '新規作成モード';
            return of(null);
          }
          return this.todoFirestoreService.getTodos();
        })
      )
      .subscribe(tasksOrNull => {
        const id = this.taskForm.get('id')?.value;
        if (!tasksOrNull) {
          return;
        }
        const task = tasksOrNull.find((t: any) => Number(t.id) === Number(id));
        if (task) {
          this.taskForm.patchValue({
            text: task.text,
            category: task.category,
            start_date: task.start_date,
            end_date: task.end_date,
            assignee: task.assignee,
            status: task.status,
            priority: task.priority,
            progress: task.progress ? task.progress * 100 : 0
          }, { emitEvent: false });
          if (this.formMode === 'new') {
            this.formMode = 'edit';
            this.formModeMessage = '編集モードに切り替わりました';  // switchedにしていたが、ややこしいのでeditに変更
          } else {
            this.formMode = 'edit';
            this.formModeMessage = '編集モードに切り替わりました';
          }
        } else {
          this.taskForm.patchValue({
            text: '',
            category: '',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            assignee: '',
            status: '未着手',
            priority: '普通',
            progress: 0
          }, { emitEvent: false });
          this.formMode = 'new';
          this.formModeMessage = '新規作成モード';
        }
      });
  }

  private resizeHandler = () => {
    if (gantt.$container) {
    gantt.setSizes();
      // スケールの再計算
      gantt.render();
    }
  };

  ngAfterViewInit() {
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.scale_height = 50;
    gantt.config.min_column_width = 40;
    gantt.config.autosize = true; // サイズを自動で調整する
    gantt.config.scroll_size = 20;
    gantt.config.drag_progress = false;     // 進捗率の編集を無効化（△のバーをドラッグして進捗率を変更できる）
    gantt.config.drag_move = true;          // タスクバーの移動を有効化
    gantt.config.drag_resize = true;        // タスクバーのリサイズを有効化
    gantt.config.row_height = 36; // 行の高さを明示的に指定
    gantt.config.order_branch = true;
    gantt.config.show_links = true;
    gantt.config.fit_tasks = false; // タスクに合わせて表示を調整
    gantt.config.auto_scheduling = false; // 自動スケジューリングを無効化
    gantt.config.auto_scheduling_strict = false; // 厳密な自動スケジューリングを無効化
    gantt.config.work_time = false; // 稼働時間の表示を無効化
    gantt.config.skip_off_time = false; // 休業時間のスキップを無効化
    gantt.config.scales = [
      { unit: "month", step: 1, format: "%Y年%m月" }, //小文字のMにすると、月の表示が01月になる。大文字だと、英語表記
      { unit: "day", step: 1, format: "%j" }
    ];
    gantt.config.columns = [      // カラムの設定
      { name: "id", label: "管理番号", width: 70, align: "center"  },
      { name: "text", label: "タイトル", width: 170},
      { name: "category", label: "カテゴリ", width: 170 },
      { name: "start_date", label: "開始日", width: 120, align: "center" },
      { name: "end_date", label: "期限", width: 120, align: "center",
        template: function(obj: any) {
          // end_dateから1日引いて表示
          const date = new Date(obj.end_date);
          date.setDate(date.getDate() - 1);
          const yyyy = date.getFullYear();
          const mm = ('0' + (date.getMonth() + 1)).slice(-2);
          const dd = ('0' + date.getDate()).slice(-2);
          return `${yyyy}-${mm}-${dd}`;
        }
      },
      { name: "assignee", label: "担当者", width: 120, align: "center" },
      { name: "status", label: "ステータス", width: 80, align: "center",
        template: function(obj: any) {
          const statuses: { [key: string]: string } = {
            '未着手': '<div class="before">未着手</div>',
            '進行中': '<div class="process">進行中</div>',
            'レビュー中': '<div class="review">レビュー中</div>',
            '完了': '<div class="done">完了</div>'
          };
          return statuses[obj.status] || obj.status;
        },
        editor: {
          type: "select",
          map_to: "status",
          options: [
            { key: "未着手", label: "未着手" },
            { key: "進行中", label: "進行中" },
            { key: "レビュー中", label: "レビュー中" },
            { key: "完了", label: "完了" }
          ]
        }
      },
      { name: "priority", label: "優先度", width: 80, align: "center",
        template: function(obj: any) {
          const priorities: { [key: string]: string } = {
            '高い': '<div class="high-priority">高い</div>',
            '普通': '<div class="medium-priority">普通</div>',
            '低い': '<div class="low-priority">低い</div>'
          };
          return priorities[obj.priority] || obj.priority;
        }
      },
      { name: "progress", label: "進捗率", width: 80, align: "center",
        template: function(obj: any) {
          return Math.round(obj.progress*100) + "%";
        },
        editor: {
          type: "number",
          map_to: "progress",
          min: 0,
          max: 100,
        }
      }
    ];

    // タスクの更新イベントを監視
    gantt.attachEvent("onAfterTaskUpdate", async (id: string, item: any) => {
      try {              
        // 現在のスクロール位置を保存
        const scrollState = gantt.getScrollState();
        
        // dbidを使用してFirestoreのドキュメントを更新
        const taskId = item.dbid || id;
        // Firestoreに保存するデータを準備
        const updateData: any = {
          status: item.status,
          progress: item.progress
        };

        // 日付が変更された場合は更新データに含める
        if (item.start_date) {
          if (typeof item.start_date === 'string' && item.start_date.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
            updateData.start_date = item.start_date;
          } else if (item.start_date instanceof Date) {
            const yyyy = item.start_date.getFullYear();
            const mm = ('0' + (item.start_date.getMonth() + 1)).slice(-2);
            const dd = ('0' + item.start_date.getDate()).slice(-2);
            updateData.start_date = `${yyyy}-${mm}-${dd}`;
          }
        }
        if (item.end_date) {
          updateData.end_date = typeof item.end_date === 'string'
            ? item.end_date
            : item.end_date.toISOString().split('T')[0];
        }
        // Firestoreのドキュメントを更新
        await this.todoFirestoreService.updateTodo(taskId, updateData);

        // 更新後にスクロール位置を復元
        gantt.scrollTo(scrollState.x, scrollState.y);
      } catch (error) {
        console.error('Error updating task in Firestore:', error);
        // エラー時もスクロール位置を保持
        const scrollState = gantt.getScrollState();
        gantt.refreshData();
        gantt.scrollTo(scrollState.x, scrollState.y);
      }
    });

    // 進捗率が変更される前のイベント
    gantt.attachEvent("onBeforeTaskUpdate", (id: string, item: any) => {    
      // 進捗率の正規化
      if (item.progress > 1) {
        item.progress = item.progress / 100;
      }
      
      if (typeof item.progress === 'string') {
        item.progress = parseFloat(item.progress) / 100;
      }
      
    // ステータスと進捗率の同期
      if (item.progress === 1) {
        item.status = "完了";
      }
      
      return true;
    });

    //　ドラックアンドドロップでの順番変更をfirestoreに反映
    const self = this;  // thisを使うと、ganttのthisと同じになる
    gantt.attachEvent("onRowDragEnd", async function(id: string, target: any) {
      const orderArr = gantt.getChildren(0);
      const updates = [];
      for (let i = 0; i < orderArr.length; i++) {
        const task = gantt.getTask(orderArr[i]);
        if (task['dbid']) {
          updates.push({ dbid: task['dbid'], order: i });
        }
      }
      if (updates.length > 0) {
        await self.todoFirestoreService.batchUpdateOrder(updates);
      }
    });

    // タスクの色を優先度に応じて変更
    gantt.templates.task_class = function(start: Date, end: Date, task: any) {
      if (task.priority === "高い") return "priority-high";
      if (task.priority === "普通") return "priority-medium";
      if (task.priority === "低い") return "priority-low";
      return "";
    };

    // 進捗率の表示形式をカスタマイズ
    gantt.templates.progress_text = function(start: Date, end: Date, task: any) {
      return '<span style="float:left;">' + Math.round(task.progress*100) + '%' + '</span>' +
             '<span style="display:block;text-align:center;width:100%;position:absolute;left:0;right:0;">' + task.text + '</span>';
    };

    // スタイルの追加
    const style = document.createElement('style');
    style.innerHTML = `
      .high-priority {background: #ff4444; color: white; padding: 2px 6px; border-radius: 3px;}
      .medium-priority {background: #ffbb33; color: white; padding: 2px 6px; border-radius: 3px;}
      .low-priority {background: #00C851; color: white; padding: 2px 6px; border-radius: 3px;}
      .gantt_task_line.high {background-color: #ff4444;}
      .gantt_task_line.medium {background-color: #ffbb33;}
      .gantt_task_line.low {background-color: #00C851;}
      .before {background-color: white; color: black; padding: 2px 6px; border-radius: 3px;}
      .process {background-color: #ffbb33; color: white; padding: 2px 6px; border-radius: 3px;}
      .review {background-color: #FF00FF; color: white; padding: 2px 6px; border-radius: 3px;}
      .done {background-color: #808080; color: white; padding: 2px 6px; border-radius: 3px;}
      .task-info-popup {
        background: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        padding: 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        max-width: 400px;
      }
      .task-info-popup h3 {
        margin: 0 0 10px 0;
        color: #333;
      }
      .task-info-popup p {
        margin: 5px 0;
        color: #666;
      }
      .task-info-popup .label {
        font-weight: bold;
        color: #333;
        display: inline-block;
        width: 80px;
      }
    `;
    document.head.appendChild(style);

    // firestoreからタスクを取得してガントチャートを更新
    this.todoFirestoreService.getTodos().subscribe((tasks: Todo[]) => {
      this.tasks = tasks;
      if (!tasks || tasks.length === 0) {
        gantt.clearAll();
        return;
      }
      // order順でソート
      tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // 最小開始日・最大終了日を取得
      const minStartDate = tasks.reduce((min, task) => {
        const d = new Date(task.start_date);
        return d < min ? d : min;
      }, new Date(tasks[0].start_date));
      const maxEndDate = tasks.reduce((max, task) => {
        const d = new Date(task.end_date);
        return d > max ? d : max;
      }, new Date(tasks[0].end_date));

      // 表示期間の調整（常に前後に4日間の余裕を確保）
      let startDate = new Date(minStartDate);
      let endDate = new Date(maxEndDate);
      
      // 開始日から4日前
      startDate.setDate(startDate.getDate() - 4);
      // 終了日から4日後
      endDate.setDate(endDate.getDate() + 4);

      gantt.config.start_date = startDate;
      gantt.config.end_date = endDate;

      // 全てのタスクのend_dateを+1日する
      const fixedTasks = tasks.map(task => {
        // 日付のバリデーション
        if (!task.start_date || !task.end_date) {
          console.error('Missing date in task:', task);
          return null;
        }

        const startDate = new Date(task.start_date);
        const endDate = new Date(task.end_date);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('Invalid date found in task:', {
            taskId: task.id,
            startDate: task.start_date,
            endDate: task.end_date,
            rawTask: task
          });
          return null;
        }

        // end_dateに1日加算
        endDate.setDate(endDate.getDate() + 1);
        
        // yyyy-mm-dd形式に戻す
        const formatDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = ('0' + (date.getMonth() + 1)).slice(-2);
        const dd = ('0' + date.getDate()).slice(-2);
          return `${yyyy}-${mm}-${dd}`;
        };

        return {
          ...task,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          // リンクデータの型を確実に文字列に変換
          links: task.links?.map(link => ({
          id: String(link.id),
          source: String(link.source),
          target: String(link.target),
          type: String(link.type)
          })) || []
        };
      }).filter(task => task !== null); // 無効な日付のタスクを除外

      // リンクデータの処理を改善
      const allLinks = fixedTasks
        .flatMap(task => task.links || [])
        .filter(link => 
          link && 
          link.id && 
          link.source && 
          link.target && 
          link.type
        );

      // ガントチャートの初期化・描写
      gantt.init(this.ganttChart.nativeElement);
      gantt.clearAll();
      gantt.parse({ 
        data: fixedTasks, 
        links: allLinks 
      });
      gantt.render();
    });
       
    // ダブルクリックでタスク情報のポップアップを表示
    gantt.attachEvent("onEmptyClick", () => {
      this.closePopup();
      return true;
    });

    gantt.attachEvent("onTaskDblClick", (id: string, e: any) => {
      // e.preventDefault();  // イベントの伝播を停止
      // e.stopPropagation();  // イベントの伝播を停止

      // // 既存のポップアップがあれば閉じる
      // this.closePopup();

      // const task = gantt.getTask(id);
      // if (!task) return false;

      // // 日付のフォーマット
      // const formatDate = (dateStr: string) => {
      //   const date = new Date(dateStr);
      //   const yyyy = date.getFullYear();
      //   const mm = ('0' + (date.getMonth() + 1)).slice(-2);
      //   const dd = ('0' + date.getDate()).slice(-2);
      //   return `${yyyy}-${mm}-${dd}`;
      // };

      // // 日付の処理
      // const startDate = String(task['start_date']);
      // const endDateStr = String(task['end_date']);
      // const endDate = new Date(endDateStr);
      // endDate.setDate(endDate.getDate() - 1);

      // const html = `
      //   <div class="task-info-popup">
      //     <h3>${task['text']}</h3>
      //     <p><span class="label">管理番号:</span> ${task['id']}</p>
      //     <p><span class="label">カテゴリ:</span> ${task['category']}</p>
      //     <p><span class="label">開始日:</span> ${formatDate(startDate)}</p>
      //     <p><span class="label">期限:</span> ${formatDate(endDate.toISOString())}</p>
      //     <p><span class="label">担当者:</span> ${task['assignee']}</p>
      //     <p><span class="label">ステータス:</span> ${task['status']}</p>
      //     <p><span class="label">優先度:</span> ${task['priority']}</p>
      //     <p><span class="label">進捗率:</span> ${Math.round((task['progress'] || 0) * 100)}%</p>
      //   </div>
      // `;

      // gantt.message({
      //   text: html,
      //   expire: -1,
      //   type: "info"
      // });

      // this.isPopupVisible = true;
        return false;
    });

    // タスククリックイベント
    gantt.attachEvent("onTaskClick", (id: string, e: any) => {
      // e.preventDefault();
      // e.stopPropagation();
      return false;
    });
    
    // リサイズイベントの処理を改善
    const resizeObserver = new ResizeObserver(() => {
      this.resizeHandler();
    });
    
    if (this.ganttChart.nativeElement) {
      resizeObserver.observe(this.ganttChart.nativeElement);
    }

    // ウィンドウのリサイズイベントも監視
    window.addEventListener('resize', this.resizeHandler);
    
    // 初期サイズの設定
    setTimeout(() => {
      this.resizeHandler();
    }, 100);

    // リンク追加時
    gantt.attachEvent("onAfterLinkAdd", async (id: string, link: any) => {
      // tasks配列をクラス変数として保持している前提
      const sourceTask = this.tasks?.find(task => String(task.id) === String(link.source));
      if (!sourceTask) {
        console.error('sourceTask not found for link:', link);
        return true;
      }
      await this.todoFirestoreService.addLinkToTask(sourceTask.dbid!, {
        id: link.id,
        source: link.source,
        target: link.target,
        type: link.type
      });
      return true;
    });

    // リンク削除時
    gantt.attachEvent("onAfterLinkDelete", async (id: string, link: any) => {
      // tasks配列からdbidを取得
      const sourceTask = this.tasks?.find(task => String(task.id) === String(link.source));
      if (!sourceTask) {
        console.error('sourceTask not found for link:', link);
        return true;
      }
      await this.todoFirestoreService.deleteLinkFromTask(sourceTask.dbid!, id);
      return true;
    });

  }

  async addTask() {
    if (this.taskForm.valid) {
      try {
        // Firestoreからタスクを取得
        const tasks = await firstValueFrom(this.todoFirestoreService.getTodos());
        const maxOrder = tasks.length > 0
          ? Math.max(...tasks.map((task: any) => task.order ?? 0))
          : 0;

        const formValue = { ...this.taskForm.getRawValue() };
        formValue.progress = formValue.progress / 100; // 進捗率を0-1の範囲に変換
        formValue.links = [];
        const id = formValue.id;
        // 既存タスクかどうかを判定
        const existing = tasks.find((t: any) => Number(t.id) === Number(id));
        
        if (existing) {
          // 既存タスクならupdate
          await this.todoFirestoreService.updateTodo(existing.dbid!, formValue);
        } else {
          // 新規ならadd（orderをセット）
          formValue.order = maxOrder + 1;
          await this.todoFirestoreService.addTodo(formValue);
        }
        this.initForm();  // フォームを再初期化して新しい管理番号を取得
      } catch (error) {
        console.error('Error adding/updating task:', error);
      }
    }
  }

  ngOnDestroy() {
    this.closePopup();  // コンポーネント破棄時にポップアップを閉じる
    window.removeEventListener('resize', this.resizeHandler);
    if (this.ganttChart?.nativeElement) {
      const resizeObserver = new ResizeObserver(() => {});
      resizeObserver.unobserve(this.ganttChart.nativeElement);
    }
  }

  // ngOnInitではinitForm()だけ呼ぶ
  ngOnInit() {
    this.initForm();
  }

  goDashboad() {
    this.todoFirestoreService.goDashboad();
  }

  goTodo() {
    this.todoFirestoreService.goTodo();
  }

  // ポップアップを閉じるメソッド
  private closePopup() {
    if (this.isPopupVisible) {
      gantt.message.hide("");
      this.isPopupVisible = false;
    }
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = null;
    }
  }

  // スペースのみの入力をチェックするカスタムバリデーター
  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value && control.value.trim().length === 0) {
      return { whitespace: true };
    }
    return null;
  }
} 