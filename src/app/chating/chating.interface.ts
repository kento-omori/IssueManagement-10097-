export interface ChatMessage {
    id?: string;
    userId: string;
    userName: string;
    userColor?: string;
    text: string;
    createdAt: Date;
    editedAt?: Date;
    isDeleted: boolean;
    deletedBy?: string;
    deletedAt?: Date;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
}