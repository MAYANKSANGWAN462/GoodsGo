import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  sendImageMessage,
} from '../services/chat.service';
import useSocketStore from '../stores/useSocketStore';
import useAuthStore from '../stores/useAuthStore';

/**
 * React Query hook for the authenticated user's conversation list.
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });
}

/**
 * React Query hook for a single conversation's details.
 * @param {string|undefined} conversationId
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function useConversation(conversationId) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversationById(conversationId),
    enabled: Boolean(conversationId),
  });
}

/**
 * React Query hook for messages in a conversation.
 * staleTime is 0 — socket events drive cache freshness.
 * @param {string|undefined} conversationId
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useMessages(conversationId) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: Boolean(conversationId),
    staleTime: 0,
  });
}

/**
 * Mutation hook to send a text message with optimistic update.
 * Does NOT toast on CONVERSATION_LOCKED or CONVERSATION_ARCHIVED — the caller handles those inline.
 * @param {string} conversationId
 */
export function useSendMessage(conversationId) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (content) => sendMessage(conversationId, content),

    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      const prev = queryClient.getQueryData(['messages', conversationId]);

      const optimistic = {
        id: `optimistic-${Date.now()}`,
        content,
        messageType: 'text',
        imageUrl: null,
        senderId: user?.id,
        sender: user,
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };

      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) return { data: [optimistic], meta: null };
        return { ...old, data: [...(old.data ?? []), optimistic] };
      });

      return { prev };
    },

    onSuccess: (newMessage) => {
      // Replace optimistic with the server-confirmed message.
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) return { data: [newMessage], meta: null };
        const filtered = (old.data ?? []).filter((m) => !m._optimistic);
        return { ...old, data: [...filtered, newMessage] };
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },

    onError: (err, _content, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['messages', conversationId], context.prev);
      }
      // CONVERSATION_LOCKED / ARCHIVED: caller shows inline error; skip toast.
      const silentCodes = ['CONVERSATION_LOCKED', 'CONVERSATION_ARCHIVED'];
      if (!silentCodes.includes(err?.code)) {
        toast.error(err?.message || 'Failed to send message.');
      }
    },
  });
}

/**
 * Mutation hook to send an image message.
 * Invalidates messages on success (no optimistic update for images).
 * @param {string} conversationId
 */
export function useSendImageMessage(conversationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageFile) => sendImageMessage(conversationId, imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to send image.'),
  });
}

/**
 * Subscribes to socket events for a specific conversation.
 * Joins the socket room on mount, leaves on unmount.
 * Appends incoming messages to the React Query cache without a full refetch.
 *
 * @param {string|null} conversationId
 * @param {{ onTypingStart?: function, onTypingStop?: function }} callbacks
 */
export function useConversationSocket(conversationId, { onTypingStart, onTypingStop } = {}) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((s) => s.socket);

  const handleNewMessage = useCallback(
    (payload) => {
      // The backend emits the message object directly as the payload
      // (emitToConversation calls io.to(room).emit(event, formattedMessage)).
      // payload.conversationId is the UUID field on the message object itself.
      if (payload.conversationId !== conversationId) return;
      const message = payload;

      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) return { data: [message], meta: null };
        const existing = old.data ?? [];
        // Skip if this message is already in cache (e.g., from our own optimistic send + onSuccess).
        if (existing.some((m) => m.id === message.id)) return old;
        // Remove any lingering optimistic stubs before appending the real message.
        const filtered = existing.filter((m) => !m._optimistic);
        return { ...old, data: [...filtered, message] };
      });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    [conversationId, queryClient]
  );

  const handleTypingStart = useCallback(
    (payload) => {
      if (payload.conversationId === conversationId) onTypingStart?.();
    },
    [conversationId, onTypingStart]
  );

  const handleTypingStop = useCallback(
    (payload) => {
      if (payload.conversationId === conversationId) onTypingStop?.();
    },
    [conversationId, onTypingStop]
  );

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_conversation', { conversationId });
    socket.on('new_message', handleNewMessage);
    // Backend emits 'user_typing' / 'user_stopped_typing' (SOCKET_EVENTS.USER_TYPING /
    // SOCKET_EVENTS.USER_STOPPED_TYPING in constants.js) — not 'typing_start'/'typing_stop'.
    // The client emits 'typing_start'/'typing_stop' TO the server; the server relays
    // them to other participants using a different event name pair.
    socket.on('user_typing', handleTypingStart);
    socket.on('user_stopped_typing', handleTypingStop);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTypingStart);
      socket.off('user_stopped_typing', handleTypingStop);
    };
  }, [socket, conversationId, handleNewMessage, handleTypingStart, handleTypingStop]);
}
