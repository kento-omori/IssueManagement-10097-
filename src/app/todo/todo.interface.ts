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
  dbid?: string;
  id: number;
  text: string;
  category: string;
  start_date: string;
  end_date: string;
  assignee: string;
  status: string;
  priority: string;
  progress?: number;
  completed: boolean;
  customFields?: CustomField[];
  comments?: Comment[];
  order: number;
} 

export interface Filters {
  id: string;
  idSort: 'none' | 'asc' | 'desc';
  text: string;
  textSort: 'none' | 'asc' | 'desc';
  category: string;
  categorySort: 'none' | 'asc' | 'desc';
  start_dateFrom: string;
  start_dateTo: string;
  start_dateSort: 'none' | 'asc' | 'desc';
  end_dateFrom: string;
  end_dateTo: string;
  end_dateSort: 'none' | 'asc' | 'desc';
  assignee: string;
  assigneeSort: 'none' | 'asc' | 'desc';
  status: string;
  statusSort: 'none' | 'asc' | 'desc';
  priority: string;
  prioritySort: 'none' | 'asc' | 'desc';
  completed: 'all' | 'true' | 'false';
  [key: string]: string; // カスタムフィールドのフィルタリング用
}