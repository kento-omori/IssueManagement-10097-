import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from './chating.interface';
import { ChatingFirestoreService, FileStorageService } from '../services/chating-firestore.service';
import { AuthService } from '../services/auth.service';
import { NavigationService } from '../services/navigation.service';
import { ProjectFirestoreService } from '../services/project-firestore.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-chating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chating.component.html',
  styleUrl: './chating.component.css'
})
export class ChatingComponent implements OnInit, AfterViewInit {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  messages: ChatMessage[] = [];
  messageText: string = '';
  currentUserId: string = '';
  projectName: string = '';
  editingMessageId: string | null = null;
  fileName: string | null = null;
  fileData: File | null = null;
  fileUrl: string | null = null;
  showPopover: boolean = false;
  originalFileUrl: string | null = null;

  constructor(
    private chatService: ChatingFirestoreService,
    private authService: AuthService,
    private navigationService: NavigationService,
    private projectFirestoreService: ProjectFirestoreService,
    private firestorageservice: FileStorageService
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getCurrentUser()?.uid || '';
    this.loadMessages();
    this.loadProjectName();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  private loadMessages() {
    this.chatService.getMessages().subscribe(messages => {
      this.messages = messages;
      setTimeout(() => this.scrollToBottom(), 0);
    });
  }

  private loadProjectName() {
    const projectId = this.navigationService.selectedProjectIdSource.getValue() || '';
    this.projectFirestoreService.getProjectById(projectId).subscribe(project => {
      this.projectName = project?.title || '';
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileName = input.files[0].name;
      this.fileData = input.files[0];
    } else {
      this.fileName = null;
      this.fileData = null;
    }
  }

  async onFileRemove() {
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;
    this.showPopover = false;
  }

  async sendMessage() {
    console.log('sendMessage called', this.messageText);
    if (!this.messageText.trim() || this.messageText.length > 200) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;

    let fileUrl = this.fileUrl;
    if (this.fileData) {
      fileUrl = await this.firestorageservice.uploadFile(this.fileData, this.fileName || '');
    }

    const message: any = {
      userId: user.uid,
      userName: user.displayName || '匿名ユーザー',
      text: this.messageText,
      createdAt: new Date(),
      isDeleted: false,
    };
    if (fileUrl) message.fileUrl = fileUrl;
    if (this.fileName) message.fileName = this.fileName;
    if (this.fileData?.type) message.fileType = this.fileData.type;

    await this.chatService.addMessage(message);
    this.messageText = '';
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;
    this.showPopover = false;
  }

  startEdit(message: ChatMessage) {
    this.editingMessageId = message.id || null;
    this.messageText = message.text;
    this.fileName = message.fileName || null;
    this.fileUrl = message.fileUrl || null;
    this.fileData = null;
    this.originalFileUrl = message.fileUrl || null;
  }

  cancelEdit() {
    this.editingMessageId = null;
    this.messageText = '';
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;
    this.originalFileUrl = null;
    this.showPopover = false;
  }

  async editMessage() {
    if (!this.editingMessageId || !this.messageText.trim() || this.messageText.length > 200) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;

    let fileUrl = this.fileUrl;
    let fileChanged = false;
    if (this.fileData) {
      fileUrl = await this.firestorageservice.uploadFile(this.fileData, this.fileName || '');
      fileChanged = true;
    }

    if (fileChanged && this.originalFileUrl) {
      await this.firestorageservice.deleteFile(this.originalFileUrl);
    }
    if (!fileUrl && this.originalFileUrl && !fileChanged) {
      await this.firestorageservice.deleteFile(this.originalFileUrl);
    }

    await this.chatService.editMessage(this.editingMessageId, this.messageText, {
      fileUrl: fileUrl || null,
      fileName: this.fileName || null,
      fileType: this.fileData?.type || null
    });

    this.editingMessageId = null;
    this.messageText = '';
    this.fileName = null;
    this.fileData = null;
    this.fileUrl = null;
    this.originalFileUrl = null;
    this.showPopover = false;
  }

  async deleteMessage(message: ChatMessage) {
    if (!message.id) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (message.fileUrl) {
      await this.firestorageservice.deleteFile(message.fileUrl);
    }

    await this.chatService.deleteMessage(message.id, user.displayName || '匿名ユーザー');
  }

  isEditing(message: ChatMessage): boolean {
    return this.editingMessageId === message.id;
  }

  private scrollToBottom() {
    try {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('スクロールエラー:', err);
    }
  }

  goDashboad(): void {
    this.projectFirestoreService.goDashboad();
  }

  goGanttChart(): void {
    this.projectFirestoreService.goGanttChart();
  }

  goTodo(): void {
    this.projectFirestoreService.goTodo();
  }
}
