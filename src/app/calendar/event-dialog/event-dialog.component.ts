import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

export interface DialogData {
  date: string;
  title: string;
  start: string;
  end: string;
}

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule
  ],
  template: `
    <h2 mat-dialog-title>イベントの追加</h2>
    <div mat-dialog-content>
      <mat-form-field>
        <mat-label>タイトル</mat-label>
        <input matInput [(ngModel)]="data.title">
      </mat-form-field>
      <mat-form-field>
        <mat-label>開始日</mat-label>
        <input matInput type="date" [(ngModel)]="data.start">
      </mat-form-field>
      <mat-form-field>
        <mat-label>終了日</mat-label>
        <input matInput type="date" [(ngModel)]="data.end">
      </mat-form-field>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onNoClick()">キャンセル</button>
      <button mat-button [mat-dialog-close]="data" cdkFocusInitial>追加</button>
    </div>
  `,
  styles: [`
    mat-form-field {
      display: block;
      margin-bottom: 16px;
    }
  `]
})
export class EventDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
} 