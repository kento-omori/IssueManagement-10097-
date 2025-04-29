import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet,RouterLink,RouterLinkActive,Routes } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet,RouterLink,RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'issuemanagement';
  
  constructor(public authService: AuthService) {}

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  }
}
