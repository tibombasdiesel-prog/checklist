/**
 * Types shared between the client and server go here.
 */

export interface Notification {
  id: number;
  user_id: number;
  checklist_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  from_user_id: number;
  to_user_id: number;
  checklist_id: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageWithUser extends ChatMessage {
  from_user_name: string;
  to_user_name: string;
}
