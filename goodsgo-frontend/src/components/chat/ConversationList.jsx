import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';
import EmptyState from '../common/EmptyState';
import { timeAgo } from '../../utils/formatters';

/** Sidebar list of conversations with last message preview and unread badge. */
export default function ConversationList({ conversations, isLoading, activeId, onSelect }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="md" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No conversations yet"
          message="Conversations start automatically when a booking is accepted."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-y-auto">
      {conversations.map((conv) => {
        // The backend may name the other participant 'participant' or 'otherParticipant'.
        // The backend returns lastMessagePreview as a plain string and
        // lastMessageAt as the ISO timestamp — not a nested object.
        const participant = conv.participant ?? conv.otherParticipant;
        const previewText = conv.lastMessagePreview;
        const lastMessageAt = conv.lastMessageAt;
        const isActive = conv.id === activeId;
        const unread = conv.unreadCount ?? 0;

        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-alt transition-colors focus:outline-none focus-visible:bg-surface-alt ${
                isActive ? 'bg-primary/10 border-r-2 border-primary' : ''
              }`}
            >
              <Avatar
                src={participant?.profileImageUrl}
                name={participant?.fullName || 'User'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm text-text truncate">
                    {participant?.fullName || 'Unknown'}
                  </span>
                  {lastMessageAt && (
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {timeAgo(lastMessageAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-xs text-text-muted truncate">
                    {previewText
                      ? previewText === '[Image]'
                        ? '📷 Image'
                        : previewText
                      : 'No messages yet'}
                  </p>
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center px-1">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

ConversationList.propTypes = {
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      participant: PropTypes.shape({
        id: PropTypes.string,
        fullName: PropTypes.string,
        profileImageUrl: PropTypes.string,
      }),
      otherParticipant: PropTypes.shape({
        id: PropTypes.string,
        fullName: PropTypes.string,
        profileImageUrl: PropTypes.string,
      }),
      // Backend returns these as flat string + ISO timestamp (not a nested object).
      lastMessagePreview: PropTypes.string,
      lastMessageAt: PropTypes.string,
      unreadCount: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};
