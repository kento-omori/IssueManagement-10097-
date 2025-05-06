import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Routes } from '@angular/router';
import { DashboadComponent } from '../dashboad/dashboad.component';
import { NotificationComponent } from '../notification/notification.component';

@Component({
  selector: 'app-private',
  standalone: true,
  imports: [RouterLink,RouterLinkActive,DashboadComponent,NotificationComponent],
  templateUrl: './private.component.html',
  styleUrl: './private.component.css'
})
export class PrivateComponent {

}
