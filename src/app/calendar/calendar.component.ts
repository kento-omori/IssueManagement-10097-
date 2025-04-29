import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core'; // useful for typechecking
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SharedTodoGanttService, GanttTask } from '../services/shared-todo-gantt.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EventDialogComponent } from './event-dialog/event-dialog.component';

export interface Event {
  title: string;
  start: string;
  end: string;
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, MatDialogModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  events: Event[] = [];

  constructor(
    private sharedTodoGanttService: SharedTodoGanttService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.sharedTodoGanttService.tasks$.subscribe((tasks: GanttTask[]) => {
      this.events = tasks.map(task => ({
        title: task.text,
        start: task.start_date,
        end: this.addOneDay(task.end_date),
      }));
      this.updateCalendarEvents();
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
    events: this.events
  };

  // 日付をクリックしたときの処理
  handleDateClick(arg: any) {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '400px',
      data: {
        date: arg.dateStr,
        title: '',
        start: arg.dateStr,
        end: arg.dateStr
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log(result)
      if (result) {
        this.events.push({
          title: result.title,
          start: result.start,
          end: this.addOneDay(result.end)
        });
        console.log(this.events)
        this.updateCalendarEvents();
      }
    });
  }

  private updateCalendarEvents() {
    this.calendarOptions.events = [...this.events];
  }
}
