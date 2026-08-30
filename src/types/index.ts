export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  isRead: boolean;
  isArchived?: boolean;
  channel: string;
  createdAt: string;
  sentAt?: string;
  data?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}
