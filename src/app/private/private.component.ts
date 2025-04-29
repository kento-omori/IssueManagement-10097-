import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Routes } from '@angular/router';

@Component({
  selector: 'app-private',
  standalone: true,
  imports: [RouterLink,RouterLinkActive],
  templateUrl: './private.component.html',
  styleUrl: './private.component.css'
})
export class PrivateComponent {

}
