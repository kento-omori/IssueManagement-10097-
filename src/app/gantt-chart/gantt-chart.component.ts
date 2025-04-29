import { Component, ElementRef, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators,ReactiveFormsModule } from '@angular/forms';
import { gantt } from 'dhtmlx-gantt';
import { SharedTodoGanttService, GanttTask } from '../services/shared-todo-gantt.service';
import { Data } from '@angular/router';

@Component({
  selector: 'app-gantt-chart',
  templateUrl: './gantt-chart.component.html',
  styleUrls: ['./gantt-chart.component.css'],
  standalone: true,
  imports:[ReactiveFormsModule]
})
export class GanttChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('ganttChart', { static: true }) ganttChart!: ElementRef;

  taskForm: FormGroup;

  constructor(
    private sharedTodoGanttService: SharedTodoGanttService,
    private fb: FormBuilder
  ) {
    this.taskForm = this.fb.group({
      id: [null, Validators.required],  // nullは初期値
      text: ['', Validators.required],
      category: [''],
      start_date: [new Date().toISOString().split('T')[0], Validators.required],
      end_date: ['', Validators.required],
      assignee: [''],
      status: [''],
      priority: [''],
      progress:['']
    });
  }

  private resizeHandler = () => {
    gantt.setSizes();
  };

  ngAfterViewInit() {
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.scale_height = 50;
    gantt.config.min_column_width = 40;
    gantt.config.scroll_size = 20;
    gantt.config.drag_progress = false;     // 進捗率の編集を有効化（△のバーをドラッグして進捗率を変更できる）
    gantt.config.row_height = 36; // 行の高さを明示的に指定
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
      { name: "assignee", label: "担当者", width: 80, align: "center" },
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

    gantt.attachEvent("onBeforeTaskUpdate", function(id, item) {
      if (item.progress! > 1) {
        item.progress = item.progress! / 100;
      }
      return true;
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
    `;
    document.head.appendChild(style);

    // tasksを使ってgantt.parse({data: tasks}) などでガントチャートを更新
    this.sharedTodoGanttService.tasks$.subscribe((tasks: GanttTask[]) => {
      if (!tasks || tasks.length === 0) {
        gantt.clearAll();
        return;
      }

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

      // ガントチャートの初期化・描写
      gantt.init(this.ganttChart.nativeElement);
      gantt.parse({ data: fixedTasks });
      gantt.render();
    });
    
    // gantt.attachEvent("onBeforeTaskUpdate", function(id, item) {
    //   if (item.progress! <= 1) {
    //     item.progress = Math.round(item.progress! * 100);
    //   }
    //   return true; // 更新を許可
    // });
    
    // gantt.attachEvent("onAfterTaskUpdate", function(id, item) {
    //   // 進捗率が100%になったら
    //   if (item.progress! >= 100 && item['status'] !== "完了") {
    //     item['_prevStatus'] = item['status'];
    //     item['status'] = "完了";
    //     gantt.updateTask(id);
    //   }
    //   // 100%未満になったら
    //   if (item.progress! < 100 && item['status'] === "完了" && item['_prevStatus']) {
    //     item['status'] = item['_prevStatus'];
    //     delete item['_prevStatus'];
    //     gantt.updateTask(id);
    //   }
    // });

    // ダブルクリックで編集フォームを開かないようにする
    gantt.attachEvent("onTaskDblClick", function() { return false; });
    
    window.addEventListener('resize', this.resizeHandler);
    setTimeout(() => gantt.setSizes(), 100);
  }

  addTask() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const newTask: GanttTask = {
        ...formValue,
        progress: Number(formValue.progress) / 100
      };
      const current = this.sharedTodoGanttService['tasksSubject'].getValue();
      this.sharedTodoGanttService.setTasks([...current, newTask]);
      this.taskForm.reset({ status: '未着手', priority: '普通', progress: '0' }); //日付は再入力しないようにすること　→　バグが出る
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.resizeHandler);
  }
} 