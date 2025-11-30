"use client";

import { MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@glucosapp/utils";
import type { Message } from "@/lib/messages-api";

interface MessageNotificationCardProps {
  message: Message;
  patientId: string;
  patientName: string;
  onRead?: () => void;
  onDismiss?: () => void;
}

export const MessageNotificationCard = ({
  message,
  patientId,
  patientName,
  onRead,
  onDismiss,
}: MessageNotificationCardProps) => {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to communication page with patient ID
    router.push(`/dashboard/communication?patientId=${patientId}`);
    onRead?.();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    onDismiss?.();
  };

  // Truncate message content for preview
  const previewContent =
    message.content.length > 100 ? `${message.content.substring(0, 100)}...` : message.content;

  return (
    <div
      className="border rounded-lg p-4 bg-blue-50 border-blue-200 text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors relative"
      onClick={handleClick}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-blue-200 rounded-full transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <MessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{patientName}: Nuevo mensaje</h3>
          <p className="text-sm mb-2">{previewContent}</p>
          <p className="text-xs opacity-75">{formatTimeAgo(message.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};
