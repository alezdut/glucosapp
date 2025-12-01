import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput as RNTextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Send } from "lucide-react-native";
import { theme } from "../theme";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConversationWithDoctor,
  useSendMessage,
  useMarkAsReadBatch,
  useAssignedDoctor,
} from "../hooks/useMessages";
import { formatTimeAgo } from "@glucosapp/utils";
import type { RootStackParamList } from "../navigation/types";
import type { Message } from "../lib/messages-api";

type CommunicationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Communication"
>;

interface MessageItemProps {
  message: Message;
  user: { id: string } | null;
  getMessageSenderName: (message: Message) => string;
}

const MessageItem = React.memo(({ message, user, getMessageSenderName }: MessageItemProps) => {
  const isOwnMessage = message.senderId === user?.id;
  const senderName = getMessageSenderName(message);

  return (
    <View
      style={[
        styles.messageContainer,
        isOwnMessage ? styles.messageContainerOwn : styles.messageContainerOther,
      ]}
    >
      {!isOwnMessage && <Text style={styles.senderName}>{senderName}</Text>}
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.messageTextOwn : styles.messageTextOther,
          ]}
        >
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.messageTime,
              isOwnMessage ? styles.messageTimeOwn : styles.messageTimeOther,
            ]}
          >
            {formatTimeAgo(message.createdAt)}
          </Text>
          {isOwnMessage && message.read && <Text style={styles.readIndicator}>✓ Leído</Text>}
        </View>
      </View>
    </View>
  );
});

MessageItem.displayName = "MessageItem";

export default function CommunicationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CommunicationScreenNavigationProp>();
  const { user } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const hasScrolledToEndRef = useRef(false);

  const { data: messages = [], isLoading } = useConversationWithDoctor();
  const { data: assignedDoctor } = useAssignedDoctor();
  const sendMessageMutation = useSendMessage();
  const markAsReadBatchMutation = useMarkAsReadBatch();
  const markAsReadBatchMutationRef = useRef(markAsReadBatchMutation);
  const queryClient = useQueryClient();

  // Keep ref in sync with mutation
  useEffect(() => {
    markAsReadBatchMutationRef.current = markAsReadBatchMutation;
  }, [markAsReadBatchMutation]);

  // Always navigate back to "Médico" tab
  const handleBack = () => {
    navigation.navigate("MainTabs", { screen: "Médico" });
  };

  // Scroll to end for new messages only
  useEffect(() => {
    // Only scroll for new messages (not initial load, handled by onContentSizeChange)
    if (messages.length > 0 && hasScrolledToEndRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Reset scroll state when component unmounts or conversation changes
  useEffect(() => {
    hasScrolledToEndRef.current = false;
    return () => {
      hasScrolledToEndRef.current = false;
    };
  }, []);

  // Mark unread messages as read when screen is focused (user is viewing)
  // Using ref to avoid re-executions when mutation object changes
  useFocusEffect(
    React.useCallback(() => {
      if (!messages.length || !user) {
        return;
      }

      const unreadMessages = messages.filter((msg) => !msg.read && msg.receiverId === user.id);

      // Mark all unread messages as read in a single batch operation
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        markAsReadBatchMutationRef.current.mutate(messageIds);
      }
    }, [messages, user]),
  );

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !user || !assignedDoctor?.doctor) {
      return;
    }

    // Use the assigned doctor ID
    const receiverId = assignedDoctor.doctor.id;
    const content = messageContent.trim();

    try {
      await sendMessageMutation.mutateAsync({
        receiverId,
        content,
      });
      setMessageContent("");
      // Message will be updated automatically via WebSocket
    } catch (error) {
      console.error(
        "Failed to send message:",
        error instanceof Error ? error.message : String(error),
      );

      // If receiver not found, invalidate assigned doctor cache to refetch
      if (error instanceof Error && error.message.includes("Receiver not found")) {
        // Invalidate assigned doctor query to force refetch
        queryClient.invalidateQueries({ queryKey: ["assigned-doctor"] });
      }
    }
  };

  const getMessageSenderName = (message: Message): string => {
    if (message.senderId === user?.id) {
      return "Tú";
    }
    // For messages from doctor, use assigned doctor info or fallback to message sender
    if (assignedDoctor?.doctor && message.senderId === assignedDoctor.doctor.id) {
      if (assignedDoctor.doctor.firstName && assignedDoctor.doctor.lastName) {
        return `${assignedDoctor.doctor.firstName} ${assignedDoctor.doctor.lastName}`;
      }
      return assignedDoctor.doctor.email;
    }
    // Fallback to message sender info
    if (message.sender.firstName && message.sender.lastName) {
      return `${message.sender.firstName} ${message.sender.lastName}`;
    }
    return message.sender.email;
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    if (!user) return null;
    return (
      <MessageItem message={message} user={user} getMessageSenderName={getMessageSenderName} />
    );
  };

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScreenHeader title="Comunicación" onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + 90 : insets.bottom}
    >
      <ScreenHeader
        title={
          assignedDoctor?.doctor
            ? assignedDoctor.doctor.firstName && assignedDoctor.doctor.lastName
              ? `Dr. ${assignedDoctor.doctor.lastName}`
              : assignedDoctor.doctor.email
            : "Comunicación"
        }
        onBack={handleBack}
      />
      <View style={[styles.messagesContainer, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay mensajes aún</Text>
            <Text style={styles.emptySubtext}>Comienza una conversación enviando un mensaje</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              // Scroll to end when content size changes (messages loaded/changed)
              if (messages.length > 0 && !hasScrolledToEndRef.current) {
                // Small delay to ensure layout is complete
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                  hasScrolledToEndRef.current = true;
                }, 100);
              }
            }}
          />
        )}
      </View>
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <RNTextInput
          style={styles.input}
          value={messageContent}
          onChangeText={setMessageContent}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={!messageContent.trim() || sendMessageMutation.isPending}
          style={[
            styles.sendButton,
            (!messageContent.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled,
          ]}
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Send size={20} color={theme.colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    flex: 1,
    marginBottom: theme.spacing.md,
  },
  messagesList: {
    paddingVertical: theme.spacing.md,
  },
  messageContainer: {
    marginBottom: theme.spacing.md,
  },
  messageContainerOwn: {
    alignItems: "flex-end",
  },
  messageContainerOther: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  messageBubbleOwn: {
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageBubbleOther: {
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: theme.colors.white,
  },
  messageTextOther: {
    color: theme.colors.text,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  messageTime: {
    fontSize: theme.fontSize.xs,
  },
  messageTimeOwn: {
    color: theme.colors.white + "CC", // 80% opacity
  },
  messageTimeOther: {
    color: theme.colors.textSecondary,
  },
  readIndicator: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.white + "CC",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xxxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
