export type MessageDeliveryStatus = "sending" | "queued" | "sent" | "failed";

export interface MessageIdentity {
  id?: string | null;
  clientMessageId?: string | null;
  createdAt?: string | Date | null;
}

type ErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

const TEMPORARY_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "ENETDOWN",
  "ENETUNREACH",
  "ETIMEDOUT",
  "FETCH_ERROR",
  "NETWORK_ERROR",
  "SOCKET_TIMEOUT",
]);

const TEMPORARY_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /timed out/i,
  /failed to fetch/i,
  /socket not connected/i,
  /offline/i,
  /connection.*closed/i,
  /server.*unavailable/i,
];

const permanentStatusCodes = new Set([400, 401, 403, 404, 409, 422]);

export const normalizeClientMessageId = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export const createClientMessageId = (): string => {
  const cryptoLike = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `msg_${Date.now()}_${randomPart}`;
};

export const getMessageIdentityKey = (message: MessageIdentity): string | undefined => {
  const clientMessageId = normalizeClientMessageId(message.clientMessageId);
  if (clientMessageId) {
    return `client:${clientMessageId}`;
  }

  const id = message.id?.trim();
  if (id) {
    return `id:${id}`;
  }

  return undefined;
};

export const messagesMatch = (left: MessageIdentity, right: MessageIdentity): boolean => {
  const leftClientId = normalizeClientMessageId(left.clientMessageId);
  const rightClientId = normalizeClientMessageId(right.clientMessageId);

  if (leftClientId && rightClientId) {
    return leftClientId === rightClientId;
  }

  return !!left.id && !!right.id && left.id === right.id;
};

export const upsertMessage = <T extends MessageIdentity>(messages: T[], incoming: T): T[] => {
  const next = [...messages];
  const index = next.findIndex((message) => messagesMatch(message, incoming));

  if (index === -1) {
    next.push(incoming);
  } else {
    next[index] = {
      ...next[index],
      ...incoming,
    };
  }

  next.sort(compareMessagesByCreatedAt);
  return next;
};

export const mergeMessages = <T extends MessageIdentity>(
  primaryMessages: T[],
  secondaryMessages: T[],
): T[] => {
  let merged = [...primaryMessages];

  for (const message of secondaryMessages) {
    merged = upsertMessage(merged, message);
  }

  return merged;
};

export const filterUnconfirmedMessages = <T extends MessageIdentity>(
  queuedMessages: T[],
  confirmedMessages: T[],
): T[] => {
  return queuedMessages.filter(
    (queuedMessage) =>
      !confirmedMessages.some((confirmedMessage) => messagesMatch(queuedMessage, confirmedMessage)),
  );
};

export const compareMessagesByCreatedAt = (
  left: MessageIdentity,
  right: MessageIdentity,
): number => {
  const leftTime = normalizeCreatedAt(left.createdAt);
  const rightTime = normalizeCreatedAt(right.createdAt);

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftKey = getMessageIdentityKey(left) ?? "";
  const rightKey = getMessageIdentityKey(right) ?? "";
  return leftKey.localeCompare(rightKey);
};

export const getMessageErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as ErrorLike;
  return typeof candidate.status === "number" ? candidate.status : undefined;
};

export const getMessageErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Failed to send message";
};

export const isTemporaryMessageError = (error: unknown): boolean => {
  const status = getMessageErrorStatus(error);
  if (typeof status === "number") {
    if (permanentStatusCodes.has(status)) {
      return false;
    }

    if (status === 408 || status === 425 || status === 429 || status >= 500) {
      return true;
    }
  }

  if (error && typeof error === "object" && "code" in error) {
    const code = (error as ErrorLike).code;
    if (code && TEMPORARY_ERROR_CODES.has(code)) {
      return true;
    }
  }

  const message = getMessageErrorMessage(error);
  return TEMPORARY_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

const normalizeCreatedAt = (value?: string | Date | null): number => {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
