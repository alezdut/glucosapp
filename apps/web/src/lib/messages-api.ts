/**
 * Type definitions for messages
 * REST API functions have been removed in favor of WebSocket communication
 */

export interface MessageSender {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface MessageReceiver {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  sender: MessageSender;
  receiver: MessageReceiver;
}

export interface ConversationParticipant {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface Conversation {
  participant: ConversationParticipant;
  messages: Message[];
  unreadCount: number;
  lastMessageAt?: string;
}
