export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  value: string | number | Date;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
  userName: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
  userName: string;
}

export interface Todo {
  id?: string;
  managementNumber: number;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  assignee: string;
  status: string;
  priority: string;
  progress: string;
  completed: boolean;
  customFields: CustomField[];
  comments: Comment[];
} 