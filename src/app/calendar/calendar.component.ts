import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { TodoFirestoreService } from '../services/todo-firestore.service';
import { CalendarFirestoreService } from '../services/calendar-firestore.service';
import { Todo } from '../todo/todo.interface';
import { Subscription } from 'rxjs';
import { NavigationService } from '../services/navigation.service';
import { UserService } from '../services/user.service';
import { Notification } from '../home-notification/home-notification.component';

export interface CalendarEvent {      // カレンダー上で作成するもの限定の型
  id?: string;    //データベースのid
  title: string;  //タスクのタイトル
  start: string;  //タスクの開始日
  end: string;   //タスクの終了日
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  showEventForm = false;
  showEditForm = false;
  selectedDate: string = '';
  todoEvents: Notification[] = [];          // TODOリストから取得したデータ
  calendarEvents: CalendarEvent[] = [];  // カレンダー上で作成されるデータ
  isLoading = true;  // 追加
  newEvent: CalendarEvent = {
    title: '',
    start: '',
    end: ''
  };
  editingCalendarEvent: CalendarEvent | null = null;
  editingTodoEvent: Notification | null = null;

  // カレンダーの表示設定
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    dateClick: this.handleDateClick.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventMouseEnter: (arg) => {
      const tooltip = document.createElement('div');
      tooltip.className = 'event-tooltip';
      tooltip.innerHTML = `
        <button onclick="document.dispatchEvent(new CustomEvent('editEvent', {detail: '${arg.event.id}'}))">編集</button>
        <button onclick="document.dispatchEvent(new CustomEvent('deleteEvent', {detail: '${arg.event.id}'}))">削除</button>
      `;
      document.body.appendChild(tooltip);
      const rect = arg.el.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.top = `${rect.bottom}px`;
      tooltip.style.left = `${rect.left}px`;
    },
    eventMouseLeave: () => {
      const tooltip = document.querySelector('.event-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    },
    events: []  // 初期値は空配列
  };

  constructor(
    private todoFirestoreService: TodoFirestoreService,
    private calendarFirestoreService: CalendarFirestoreService,
    private cdr: ChangeDetectorRef,
    private navigationService: NavigationService,
    private userService: UserService
  ) {
  }

  ngOnInit() {
    this.isLoading = true;
    const userId = this.navigationService.selectedUserIdSource.getValue();
    if (userId) {
      this.userService.getUserById(userId).then((userProfile) => {
        const userDisplayName = userProfile?.displayName || '';
        const todoSub = this.todoFirestoreService.getAllTodosForUserRealtime(userId, userDisplayName).subscribe({
          next: (tasks: Todo[]) => {
            this.todoEvents = tasks.map(task => ({
              ...task,
              end_date: this.addOneDay(task.end_date)
            }));
            this.updateCalendarEvents();
          },
          error: (error) => console.error('Error loading todos:', error)
        });
        const calendarSub = this.calendarFirestoreService.getCalendarEvents().subscribe({
          next: (events) => {
            this.calendarEvents = events.map(event => ({
              ...event,
              end: this.addOneDay(event.end)
            }));
            this.updateCalendarEvents();
          },
          error: (error) => console.error('Error loading calendar events:', error)
        });
        this.subscriptions.push(todoSub, calendarSub);
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateCalendarEvents() {
    const events = [
      ...this.todoEvents.map(todo => ({
        id: todo.dbid,
        title: todo.text + '（' + todo.projectName + '）',
        start: todo.start_date,
        end: todo.end_date,
        color: todo.pjid ? '#ffb6c1' : '#87ceeb' // プロジェクトは薄いピンク, 個人は薄い青
      })),
      ...this.calendarEvents.map(event => ({
        ...event,
        color: '#90ee90' // 薄い緑
      }))
    ];

    this.calendarOptions = {
      ...this.calendarOptions,
      events
    };

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  // end_dateに1日加算する関数
  addOneDay(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    // "YYYY-MM-DD"形式に戻す
    const yyyy = date.getFullYear();
    const mm = ('0' + (date.getMonth() + 1)).slice(-2);
    const dd = ('0' + date.getDate()).slice(-2);
    return `${yyyy}-${mm}-${dd}`;
  }

  // 日付クリック時のフォーム表示
  handleDateClick(arg: DateClickArg) {
    this.selectedDate = arg.dateStr;
    this.newEvent = {
      title: '',
      start: this.selectedDate,
      end: this.selectedDate
    };
    this.showEventForm = true;
    this.showEditForm = false;
  }

  // 入力されているイベントクリック時のフォーム表示
  handleEventClick(arg: EventClickArg) {
    // まずTodoリストから検索
    const todoEvent = this.todoEvents.find(e => e.dbid === arg.event.id);
    if (todoEvent) {
      this.editingTodoEvent = { ...todoEvent };
      this.editingCalendarEvent = null;
      this.showEditForm = true;
      this.showEventForm = false;
      return;
    }
    // Todoになければカレンダーイベントから検索
    const calendarEvent = this.calendarEvents.find(e => e.id === arg.event.id);
    if (calendarEvent) {
      this.editingCalendarEvent = { ...calendarEvent };
      this.editingTodoEvent = null;
      this.showEditForm = true;
      this.showEventForm = false;
    }
  }

  // 新規登録　→　firestore（user/{user_id}/calendar/）に登録
  async addEvent() {
    if (this.newEvent.title && this.newEvent.start && this.newEvent.end) {
      try {
        await this.calendarFirestoreService.addCalendarEvent(this.newEvent);
        this.showEventForm = false;
        this.newEvent = {
          title: '',
          start: '',
          end: ''
        };
      } catch (error) {
        console.error('イベント追加エラー:', error);
      }
    }
  }

  // 更新　→　firestoreに登録
  async updateEvent() {
    if (this.editingCalendarEvent?.id) {
      try {
        const { id, ...updateData } = this.editingCalendarEvent;
        await this.calendarFirestoreService.updateCalendarEvent(id, updateData);
        this.showEditForm = false;
        this.editingCalendarEvent = null;
      } catch (error) {
        console.error('イベント更新エラー:', error);
      }
    } else if (this.editingTodoEvent?.dbid) {
      const { pjid, projectName, id, ...updateTodoData } = this.editingTodoEvent;
      try {
        await this.todoFirestoreService.updateTodo(this.editingTodoEvent.dbid, updateTodoData, pjid!);
        this.showEditForm = false;
        this.editingTodoEvent = null;
      } catch (error) {
        console.error('Todo更新エラー:', error);
      }
    }
  }

  // 削除　→　firestoreから削除
  async deleteEvent(eventId: string) {
    try {
      // まずTodoリストから検索
      const todoEvent = this.todoEvents.find(e => e.dbid === eventId);
      if (todoEvent) {
        // Todoタスクの場合は警告を表示
        if (!confirm('TODOリストに登録されているタスクです。本当に消しますか？')) {
          return; // キャンセルされた場合は処理を中止
        }
        await this.todoFirestoreService.deleteTodo(eventId, todoEvent.pjid!);
        return;
      }
      // カレンダーイベントの場合は直接削除
      await this.calendarFirestoreService.deleteCalendarEvent(eventId);
    } catch (error) {
      console.error('イベント削除エラー:', error);
    }
  }

  ngAfterViewInit() {
    document.addEventListener('editEvent', ((e: CustomEvent) => {
      // まずTodoリストから検索
      const todoEvent = this.todoEvents.find(ev => ev.dbid === e.detail);
      if (todoEvent) {
        this.editingTodoEvent = { ...todoEvent };
        this.editingCalendarEvent = null;
        this.showEditForm = true;
        this.showEventForm = false;
        return;
      }
      // Todoになければカレンダーイベントから検索
      const calendarEvent = this.calendarEvents.find(ev => ev.id === e.detail);
      if (calendarEvent) {
        this.editingCalendarEvent = { ...calendarEvent };
        this.editingTodoEvent = null;
        this.showEditForm = true;
        this.showEventForm = false;
      }
    }) as EventListener);

    document.addEventListener('deleteEvent', ((e: CustomEvent) => {
      this.deleteEvent(e.detail);
    }) as EventListener);
  }
}
