export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  userId: string;
  userName: string;
  replies?: Comment[];
} 