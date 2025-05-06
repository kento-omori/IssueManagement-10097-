import { Component, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType, ChartEvent } from 'chart.js';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { Todo } from '../todo/todo.interface';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(ChartDataLabels);

@Component({
  selector: 'app-dashboad',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './dashboad.component.html',
  styleUrl: './dashboad.component.css'
})
export class DashboadComponent implements OnInit {
  todos: Todo[] = [];

  // ドーナツチャートのプロパティ
  taskCompletedData: ChartData<'doughnut',number[]> = {datasets: [], labels: []}; // チャートのデータを指定する。ここでは、完了と未完了の2つのデータを指定している。
  taskCompletedLabels: string[] = []; // チャートの各セグメント（扇形の部分）に表示されるラベルを指定する。ここでは、完了と未完了の2つのラベルを指定している。
  taskCompletedOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      datalabels: {
        color: '#333',
        font: { weight: "bold" as any, size: 16 },
        formatter: (value: number, context: any) => value,
        anchor: 'center' as any,
        align: 'center' as any
      }
    }
  }; // チャート全体の設定オプション。ここは、チャートのサイズを変更するためのもの。
  taskCompletedLegend = true; // 凡例を表示するかどうかを指定する。ここでは、凡例を表示するように設定している。
  taskCompletedType: ChartType = 'doughnut'; // チャートの種類を指定する。ここでは、ドーナツチャートを指定している。

  // 円グラフのプロパティ（ステータス別タスク数）
  statusChartData: ChartData<'pie',number[]> = {datasets: [], labels: []};
  statusChartLabels: string[] = [];
  statusChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      datalabels: {
        color: '#333',
        font: { weight: "bold" as any, size: 16 },
        formatter: (value: number, context: any) => value,
        anchor: 'center' as any,
        align: 'center' as any
      }
    }
  };
  statusChartLegend = true;
  statusChartType: ChartType = 'pie';

  // 棒グラフのプロパティ（担当者別タスク数）
  assigneeTaskData: ChartData<'bar',number[]> = {datasets: [], labels: []};
  assigneeTaskLabels: string[] = [];
  assigneeTaskOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    scales: {
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 30,
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };
  assigneeTaskLegend = true;
  assigneeTaskType: ChartType = 'bar';

  // 優先度毎のタスク数（完了除く）
  priorityTaskData: ChartData<'pie',number[]> = {datasets: [], labels: []};
  priorityTaskLabels: string[] = [];
  priorityTaskOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    plugins: {
      datalabels: {
        color: '#333',
        font: { weight: "bold" as any, size: 16 },
        formatter: (value: number, context: any) => value,
        anchor: 'center' as any,
        align: 'center' as any
      }
    }
  };
  priorityTaskLegend = true;
  priorityTaskType: ChartType = 'pie';

  constructor(private todoFirestoreService: TodoFirestoreService) {}

  ngOnInit(): void {
    this.todoFirestoreService.getTodos().subscribe((todos: Todo[]) => {
      this.todos = todos;
      this.setupCharts();
    });
  }

  setupCharts() {
    // タスク完了率
    const completed = this.todos.filter(t => t.status === '完了').length;
    const uncompleted = this.todos.length - completed;
    this.taskCompletedData = {
      datasets: [
        { data: [completed, uncompleted], label: 'タスク数' }
      ],
      labels: ['完了', '未完了']
    };

    // ステータス別円グラフ
    const statusMap: { [status: string]: number } = {};
    this.todos.forEach(todo => {
      const status = todo.status || '未設定';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    this.statusChartLabels = Object.keys(statusMap);
    this.statusChartData = {
      datasets: [
        { data: Object.values(statusMap), label: 'ステータス別タスク数' }
      ],
      labels: this.statusChartLabels
    };
    
    // 担当者別棒グラフ
    const assigneeMap: { [assignee: string]: number } = {};
    this.todos.forEach(todo => {
      const assignee = todo.assignee || '未設定';
      assigneeMap[assignee] = (assigneeMap[assignee] || 0) + 1;
    });
    this.assigneeTaskLabels = Object.keys(assigneeMap);
    this.assigneeTaskData = {
      datasets: [
        { data: Object.values(assigneeMap), label: '担当者別タスク数' }
      ],
      labels: this.assigneeTaskLabels
    };

    // 優先度別棒グラフ
    const priorityMap: { [priority: string]: number } = {};
    this.todos.forEach(todo => {
      const priority = todo.priority || '未設定';
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;
    });
    this.priorityTaskLabels = Object.keys(priorityMap);
    this.priorityTaskData = {
      datasets: [
        { data: Object.values(priorityMap), label: '優先度別タスク数' }
      ],
      labels: this.priorityTaskLabels
    };
  }

  public chartClicked({
    event,
    active,
  }: {
    event: ChartEvent;
    active: object[];
  }): void {
    console.log(event, active);
  }

  public chartHovered({
    event,
    active,
  }: {
    event: ChartEvent;
    active: object[];
  }): void {
    console.log(event, active);
  }
}
