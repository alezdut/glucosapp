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
  useMarkAsRead,
  useAssignedDoctor,
} from "../hooks/useMessages";
import { formatTimeAgo } from "@glucosapp/utils";
import type { RootStackParamList } from "../navigation/types";
import type { Message } from "../lib/messages-api";

type CommunicationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Communication"
>;

export default function CommunicationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<CommunicationScreenNavigationProp>();
  const { user } = useAuth();
  const [messageContent, setMessageContent] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const hasInitialScrolledRef = useRef(false);
  const previousMessagesLengthRef = useRef(0);
  const [isListReady, setIsListReady] = useState(false);

  const { data: messages = [], isLoading } = useConversationWithDoctor();
  const { data: assignedDoctor } = useAssignedDoctor();
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const queryClient = useQueryClient();

  // Always navigate back to "Médico" tab
  const handleBack = () => {
    navigation.navigate("MainTabs", { screen: "Médico" });
  };

  // Scroll to end on initial load and when new messages arrive
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const currentLength = messages.length;
    const previousLength = previousMessagesLengthRef.current;

    // Initial load: mark as needing scroll, but let onContentSizeChange handle it
    if (!hasInitialScrolledRef.current) {
      hasInitialScrolledRef.current = true;
      previousMessagesLengthRef.current = currentLength;
      return;
    }

    // Only auto-scroll if new messages were added
    if (currentLength > previousLength) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    previousMessagesLengthRef.current = currentLength;
  }, [messages.length]);

  // Mark unread messages as read when screen is focused (user is viewing)
  useFocusEffect(
    React.useCallback(() => {
      if (!messages.length || !user) {
        return;
      }

      const unreadMessages = messages.filter((msg) => !msg.read && msg.receiverId === user.id);

      // Mark all unread messages as read when user is viewing the screen
      unreadMessages.forEach((msg) => {
        markAsReadMutation.mutate(msg.id);
      });
    }, [messages, user, markAsReadMutation]),
  );

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !user || !assignedDoctor?.doctor) {
      return;
    }

    // Use the assigned doctor ID
    const receiverId = assignedDoctor.doctor.id;
    const content = messageContent.trim();

    try {
      const result = await sendMessageMutation.mutateAsync({
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

    // Determine if this is the current user's message
    const isOwnMessage = message.senderId === user.id;
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
          <View style={{ flex: 1, opacity: isListReady ? 1 : 0 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => {
                // On initial load, scroll to end and show list
                if (!isListReady && messages.length > 0 && flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                  setIsListReady(true);
                } else if (
                  hasInitialScrolledRef.current &&
                  messages.length > previousMessagesLengthRef.current
                ) {
                  // Only auto-scroll if we've already done initial scroll and new messages arrived
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
            />
          </View>
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
  },
  messageBubbleOther: {
    backgroundColor: theme.colors.card,
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
