import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Routes } from '@angular/router';
import { CalendarComponent } from '../calendar/calendar.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink,RouterLinkActive,CalendarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
