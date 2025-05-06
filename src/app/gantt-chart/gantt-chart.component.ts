import { Component, ElementRef, AfterViewInit, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators,ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { gantt } from 'dhtmlx-gantt';
import { IdManagerService } from '../services/id-manager.service';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { Todo, GanttLink } from '../todo/todo.interface';
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

  constructor(
    private idManagerService: IdManagerService,
    private fb: FormBuilder,
    private todoFirestoreService: TodoFirestoreService
  ) {
    this.initForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      id: ['', Validators.required],  // 管理番号を入力可能に変更
      text: ['', Validators.required],
      category: ['', Validators.required],
      start_date: [new Date().toISOString().split('T')[0], Validators.required],
      end_date: ['', Validators.required],
      assignee: ['', Validators.required],
      status: ['未着手', Validators.required],
      priority: ['普通', Validators.required],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  private initForm() {
    this.taskForm = this.createForm();
    this.setupIdWatcher();
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
        }
      });
  }

  private resizeHandler = () => {
    gantt.setSizes();
  };

  ngAfterViewInit() {
    console.log('ngAfterViewInit');
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.scale_height = 50;
    gantt.config.min_column_width = 40;
    gantt.config.scroll_size = 20;
    gantt.config.drag_progress = false;     // 進捗率の編集を無効化（△のバーをドラッグして進捗率を変更できる）
    gantt.config.drag_move = true;          // タスクバーの移動を有効化
    gantt.config.drag_resize = true;        // タスクバーのリサイズを有効化
    gantt.config.row_height = 36; // 行の高さを明示的に指定
    gantt.config.order_branch = true;
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
      } catch (error) {
        console.error('Error updating task in Firestore:', error);
        gantt.refreshData(); // エラーが発生した場合は元の値に戻す
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

      // スケール範囲を明示的に指定
      gantt.config.start_date = new Date(minStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      gantt.config.end_date = new Date(maxEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      gantt.config.fit_tasks = false;

      // 全てのタスクのend_dateを+1日する
      const fixedTasks = tasks.map(task => {
        const date = new Date(task.end_date);
        date.setDate(date.getDate() + 1);
        // yyyy-mm-dd形式に戻す
        const yyyy = date.getFullYear();
        const mm = ('0' + (date.getMonth() + 1)).slice(-2);
        const dd = ('0' + date.getDate()).slice(-2);
        return { ...task, end_date: `${yyyy}-${mm}-${dd}` };
      });

      // ここで全タスクのlinksを1つの配列にまとめる
      const allLinks = tasks
        .map(task => Array.isArray(task.links) ? task.links : [])
        .flat()
        .filter(link =>
          link &&
          link.id != null &&
          link.source != null &&
          link.target != null &&
          link.type != null
        )
        .map(link => ({
          id: String(link.id),
          source: String(link.source),
          target: String(link.target),
          type: String(link.type)
        }));

      // ガントチャートの初期化・描写
      gantt.init(this.ganttChart.nativeElement);
      gantt.clearAll();
      gantt.parse({ data: fixedTasks, links: allLinks });
      gantt.render();
    });
       
    // ダブルクリックでタスク情報のポップアップを表示
    let isPopupVisible = false;  // ポップアップの表示状態を管理

    // クリックイベントでポップアップを閉じる
    gantt.attachEvent("onEmptyClick", () => {
      if (isPopupVisible) {
        gantt.message.hide("");
        isPopupVisible = false;
      }
      return true;
    });

    gantt.attachEvent("onTaskDblClick", (id: string, e: any) => {
      // 既存のポップアップがあれば閉じる
      if (isPopupVisible) {
        gantt.message.hide("");
        isPopupVisible = false;
        return false;
      }
      const task = gantt.getTask(id);      
      // 日付のフォーマット
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const yyyy = date.getFullYear();
        const mm = ('0' + (date.getMonth() + 1)).slice(-2);
        const dd = ('0' + date.getDate()).slice(-2);
        return `${yyyy}-${mm}-${dd}`;
      };
      // 日付の処理
      const startDate = String(task['start_date']);
      const endDateStr = String(task['end_date']);
      const endDate = new Date(endDateStr);
      endDate.setDate(endDate.getDate() - 1);
      const html = `
        <div class="task-info-popup">
          <h3>${task['text']}</h3>
          <p><span class="label">管理番号:</span> ${task['id']}</p>
          <p><span class="label">カテゴリ:</span> ${task['category']}</p>
          <p><span class="label">開始日:</span> ${formatDate(startDate)}</p>
          <p><span class="label">期限:</span> ${formatDate(endDate.toISOString())}</p>
          <p><span class="label">担当者:</span> ${task['assignee']}</p>
          <p><span class="label">ステータス:</span> ${task['status']}</p>
          <p><span class="label">優先度:</span> ${task['priority']}</p>
          <p><span class="label">進捗率:</span> ${Math.round((task['progress'] || 0) * 100)}%</p>
        </div>
      `;

      gantt.message({
        text: html,
        expire: -1,  // ポップアップを自動で閉じない
        type: "info"
      });      
      isPopupVisible = true;
      return false; // デフォルトの編集フォームを表示しない
    });

    gantt.attachEvent("onTaskClick", (id: string, e: any) => {
      return false;
    });
    
    window.addEventListener('resize', this.resizeHandler);
    setTimeout(() => gantt.setSizes(), 100);

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
      console.log(link.source);
      console.log(sourceTask);
      if (!sourceTask) {
        console.error('sourceTask not found for link:', link);
        return true;
      }
      await this.todoFirestoreService.deleteLinkFromTask(sourceTask.dbid!, id);
      console.log(sourceTask.dbid,id);
      console.log('onAfterLinkDelete', link);
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
    window.removeEventListener('resize', this.resizeHandler);
  }

  // ngOnInitではinitForm()だけ呼ぶ
  ngOnInit() {
    this.initForm();
  }
} 