import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Button from '../common/Button';

const TYPING_STOP_DELAY_MS = 2000;

/**
 * Message composition bar with text input, image attach, and typing-event emission.
 * typing_start is emitted once per typing session (suppressed while already typing).
 * typing_stop is emitted on 2s silence or on input blur.
 */
export default function ChatInputBar({
  conversationId,
  onSendText,
  onSendImage,
  isLocked,
  isSending,
  socket,
}) {
  const [text, setText] = useState('');
  const [lockedError, setLockedError] = useState('');
  const fileInputRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  function emitTypingStart() {
    if (!socket || !conversationId) return;
    socket.emit('typing_start', { conversationId });
  }

  function emitTypingStop() {
    if (!socket || !conversationId) return;
    socket.emit('typing_stop', { conversationId });
    isTypingRef.current = false;
  }

  function handleTextChange(e) {
    setText(e.target.value);
    setLockedError('');

    // Emit typing_start once per continuous typing session.
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart();
    }

    // Reset the inactivity timer; emit typing_stop after 2s of silence.
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, TYPING_STOP_DELAY_MS);
  }

  function handleBlur() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) emitTypingStop();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    // Stop typing indicator before sending.
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) emitTypingStop();

    setLockedError('');
    try {
      await onSendText(trimmed);
      setText('');
    } catch (err) {
      const lockedCodes = ['CONVERSATION_LOCKED', 'CONVERSATION_ARCHIVED'];
      if (lockedCodes.includes(err?.code)) {
        setLockedError('This conversation is locked and no longer accepts messages.');
      }
      // Other errors are already toasted by useSendMessage.onError.
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendImage(file);
    e.target.value = '';
  }

  const disabled = isLocked || isSending;

  return (
    <div className="border-t border-border bg-surface p-3 flex-shrink-0">
      {lockedError && (
        <p className="text-xs text-danger mb-2">{lockedError}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Image attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach image"
          className="flex-shrink-0 p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-alt transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
          aria-label="Image file input"
        />

        {/* Text input */}
        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={isLocked ? 'Conversation is locked' : 'Type a message…'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed overflow-y-auto"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />

        <Button
          type="submit"
          size="sm"
          disabled={disabled || !text.trim()}
          isLoading={isSending}
        >
          Send
        </Button>
      </form>
    </div>
  );
}

ChatInputBar.propTypes = {
  conversationId: PropTypes.string.isRequired,
  onSendText: PropTypes.func.isRequired,
  onSendImage: PropTypes.func.isRequired,
  isLocked: PropTypes.bool,
  isSending: PropTypes.bool,
  socket: PropTypes.object,
};
