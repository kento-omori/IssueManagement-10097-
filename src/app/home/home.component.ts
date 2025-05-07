import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from '../calendar/calendar.component';
import { HomeNotificationComponent } from '../home-notification/home-notification.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ CommonModule, CalendarComponent, HomeNotificationComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  isLoading = true;

  constructor() {
    console.log('HomeComponent constructor');
  }

  ngOnInit() {
    console.log('HomeComponent ngOnInit start');
    // 単純化した初期化処理
    this.isLoading = false;
    console.log('HomeComponent initialization complete');
  }
}
