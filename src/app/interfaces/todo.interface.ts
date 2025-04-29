import { Comment } from './comment.interface';

export interface Todo {
  id: string;
  managementNumber: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  person: string;
  status: string;
  urgency: string;
  completed: boolean;
  comments: Comment[];
  customFields: { id: string; value: string | number | Date }[];
} 