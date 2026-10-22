"use client";

import type { MessageDeliveryStatus } from "@glucosapp/utils";
import { makeApiClient } from "@glucosapp/api-client";
import { throwApiError } from "@glucosapp/utils";
import { getWebApiBaseUrl } from "./env";

const apiBaseUrl = getWebApiBaseUrl();
const { client } = makeApiClient(apiBaseUrl);

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
  clientMessageId?: string;
  content: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  createdAtClient?: string;
  sender: MessageSender;
  receiver: MessageReceiver;
  deliveryStatus?: MessageDeliveryStatus;
  isOptimistic?: boolean;
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

export interface SendMessagePayload {
  receiverId: string;
  content: string;
  clientMessageId: string;
  createdAtClient: string;
}

export interface MessageOutboxEntry {
  clientMessageId: string;
  receiverId: string;
  content: string;
  createdAtClient: string;
  status: Exclude<MessageDeliveryStatus, "sent"> | "sent";
  attemptCount: number;
  lastError?: string;
  message: Message;
}

export async function sendMessage(
  accessToken: string,
  payload: SendMessagePayload,
): Promise<Message> {
  const response = await client.POST<Message>("/messages", payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.error) {
    throwApiError(response.error, "Failed to send message");
  }

  if (!response.data) {
    throw new Error("No data returned from messages endpoint");
  }

  return {
    ...response.data,
    deliveryStatus: "sent",
    isOptimistic: false,
  };
}
