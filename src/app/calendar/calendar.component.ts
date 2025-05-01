import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SharedTodoGanttService, GanttTask } from '../services/shared-todo-gantt.service';

export interface Event {
  id?: string;
  title: string;
  start: string;
  end: string;
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  events: Event[] = [];
  showEventForm = false;
  showEditForm = false;
  selectedDate: string = '';
  newEvent: Event = {
    title: '',
    start: '',
    end: ''
  };
  editingEvent: Event | null = null;

  constructor(private sharedTodoGanttService: SharedTodoGanttService) {}

  ngOnInit() {
    this.sharedTodoGanttService.tasks$.subscribe((tasks: GanttTask[]) => {
      this.events = tasks.map(task => ({
        id: Math.random().toString(36).substr(2, 9),
        title: task.text,
        start: task.start_date,
        end: this.addOneDay(task.end_date),
      }));
    });
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
  // カレンダーのオプション呼び出し
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    dateClick: (arg) => this.handleDateClick(arg),
    eventClick: (arg) => this.handleEventClick(arg),
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
    events: this.events
  };

  handleDateClick(arg: any) {
    this.selectedDate = arg.dateStr;
    this.newEvent = {
      title: '',
      start: this.selectedDate,
      end: this.selectedDate
    };
    this.showEventForm = true;
    this.showEditForm = false;
  }

  handleEventClick(arg: EventClickArg) {
    const event = this.events.find(e => e.id === arg.event.id);
    if (event) {
      this.editingEvent = { ...event };
      this.showEditForm = true;
      this.showEventForm = false;
    }
  }

  addEvent() {
    if (this.newEvent.title && this.newEvent.start && this.newEvent.end) {
      const newEventWithId = {
        ...this.newEvent,
        id: Math.random().toString(36).substr(2, 9),
        end: this.addOneDay(this.newEvent.end)
      };
      this.events = [...this.events, newEventWithId];
      this.showEventForm = false;
      this.newEvent = {
        title: '',
        start: '',
        end: ''
      };
    }
  }

  updateEvent() {
    if (this.editingEvent) {
      const updatedEvent: Event = {
        id: this.editingEvent.id,
        title: this.editingEvent.title,
        start: this.editingEvent.start,
        end: this.addOneDay(this.editingEvent.end)
      };
      this.events = this.events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
      this.showEditForm = false;
      this.editingEvent = null;
    }
  }

  deleteEvent(eventId: string) {
    this.events = this.events.filter(event => event.id !== eventId);
  }

  ngAfterViewInit() {
    document.addEventListener('editEvent', ((e: CustomEvent) => {
      const event = this.events.find(ev => ev.id === e.detail);
      if (event) {
        this.editingEvent = { ...event };
        this.showEditForm = true;
        this.showEventForm = false;
      }
    }) as EventListener);

    document.addEventListener('deleteEvent', ((e: CustomEvent) => {
      this.deleteEvent(e.detail);
    }) as EventListener);
  }
}
