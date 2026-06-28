import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInputBar from './ChatInputBar';
import {
  useConversation,
  useMessages,
  useSendMessage,
  useSendImageMessage,
  useConversationSocket,
} from '../../hooks/useChat';
import { getMessages } from '../../services/chat.service';
import useSocketStore from '../../stores/useSocketStore';
import useAuthStore from '../../stores/useAuthStore';

/**
 * Right-panel message pane for an active conversation.
 * Joins the socket room on mount, leaves on unmount.
 * Shows real-time messages, typing indicator, and the input bar.
 * Supports scroll-to-top to load older message pages.
 *
 * @param {string} conversationId
 * @param {function} [onBack] - Called on mobile when the user taps the back arrow
 */
export default function ChatWindow({ conversationId, onBack }) {
  const user = useAuthStore((s) => s.user);
  const socket = useSocketStore((s) => s.socket);

  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [olderMessages, setOlderMessages] = useState([]);
  const [olderPage, setOlderPage] = useState(2);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const { data: conversation, isLoading: convLoading } = useConversation(conversationId);
  const { data: msgData, isLoading: msgsLoading } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage(conversationId);
  const sendImageMutation = useSendImageMessage(conversationId);

  const messages = msgData?.data ?? [];

  // Reset older-message state whenever the active conversation changes.
  useEffect(() => {
    setOlderMessages([]);
    setOlderPage(2);
    setHasOlderMessages(false);
    setIsLoadingOlder(false);
  }, [conversationId]);

  // Once page-1 loads, check whether older pages exist.
  useEffect(() => {
    if (msgData?.meta?.totalPages > 1) {
      setHasOlderMessages(true);
    }
  }, [msgData?.meta?.totalPages]);

  const onTypingStart = useCallback(() => setIsRemoteTyping(true), []);
  const onTypingStop = useCallback(() => setIsRemoteTyping(false), []);
  useConversationSocket(conversationId, { onTypingStart, onTypingStop });

  // Scroll to the latest message whenever the current-page list changes.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRemoteTyping]);

  // Emit messages_read when there are unread messages visible.
  useEffect(() => {
    if (!socket || !conversationId || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.senderId !== user?.id && !m.readAt)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      socket.emit('messages_read', { conversationId, messageIds: unreadIds });
    }
  }, [socket, conversationId, messages, user?.id]);

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasOlderMessages) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    setIsLoadingOlder(true);
    try {
      const result = await getMessages(conversationId, { page: olderPage, limit: 20 });
      const fetched = result.data ?? [];

      if (fetched.length === 0 || olderPage >= (result.meta?.totalPages ?? 1)) {
        setHasOlderMessages(false);
      }

      // Prepend fetched older messages above existing older messages.
      setOlderMessages((prev) => [...fetched, ...prev]);
      setOlderPage((prev) => prev + 1);

      // Restore scroll position so the user stays at the same visual spot.
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } catch {
      // Silent — older messages are optional
    } finally {
      setIsLoadingOlder(false);
    }
  }, [conversationId, olderPage, isLoadingOlder, hasOlderMessages]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingOlder || !hasOlderMessages) return;
    if (container.scrollTop === 0) {
      loadOlderMessages();
    }
  }, [isLoadingOlder, hasOlderMessages, loadOlderMessages]);

  async function handleSendText(content) {
    await sendMessageMutation.mutateAsync(content);
  }

  function handleSendImage(file) {
    sendImageMutation.mutate(file);
  }

  if (convLoading || msgsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const participant = conversation?.participant ?? conversation?.otherParticipant;
  const isLocked =
    conversation?.status === 'locked' || conversation?.status === 'archived';

  const allMessages = [...olderMessages, ...messages];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        {/* Mobile back button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden p-1 -ml-1 text-text-muted hover:text-text"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        <Avatar
          src={participant?.profileImageUrl}
          name={participant?.fullName || 'User'}
          size="sm"
        />
        <div>
          <p className="font-medium text-sm text-text">{participant?.fullName || 'Unknown'}</p>
          {isLocked && (
            <p className="text-xs text-warning">Conversation locked</p>
          )}
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface-alt"
      >
        {/* Older-messages loading indicator */}
        {isLoadingOlder && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" className="text-text-muted" />
          </div>
        )}

        {allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              title="No messages yet"
              message="Send the first message to get the conversation started."
            />
          </div>
        ) : (
          allMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.senderId === user?.id}
            />
          ))
        )}

        {isRemoteTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <ChatInputBar
        conversationId={conversationId}
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        isLocked={isLocked}
        isSending={sendMessageMutation.isPending || sendImageMutation.isPending}
        socket={socket}
      />
    </div>
  );
}

ChatWindow.propTypes = {
  conversationId: PropTypes.string.isRequired,
  onBack: PropTypes.func,
};
