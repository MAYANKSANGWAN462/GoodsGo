import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3 h-3 inline-block mr-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

/**
 * Formats a timestamp as a compact relative label.
 * @param {string} iso
 * @returns {string}
 */
function compactTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) {
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Sidebar list of conversations with search filtering, unread badges, and last-message preview.
 */
export default function ConversationList({
  conversations,
  isLoading,
  activeId,
  onSelect,
  searchQuery,
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-0 pt-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-2.5 w-48 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const query = (searchQuery ?? '').toLowerCase().trim();
  const filtered = query
    ? (conversations ?? []).filter((conv) => {
        const participant = conv.participant ?? conv.otherParticipant;
        return (participant?.fullName ?? '').toLowerCase().includes(query);
      })
    : (conversations ?? []);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-text-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-text mb-1">No conversations yet</p>
        <p className="text-xs text-text-muted leading-relaxed">
          Conversations open automatically when a booking is accepted.
        </p>
      </div>
    );
  }

  if (filtered.length === 0 && query) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <p className="text-sm text-text-muted">
          No results for &ldquo;<span className="font-medium text-text">{searchQuery}</span>&rdquo;
        </p>
      </div>
    );
  }

  return (
    <ul role="list" className="divide-y divide-border">
      {filtered.map((conv) => {
        const participant = conv.participant ?? conv.otherParticipant;
        const previewText = conv.lastMessagePreview;
        const lastMessageAt = conv.lastMessageAt;
        const isActive = conv.id === activeId;
        const unread = conv.unreadCount ?? 0;
        const isMyMessage = conv.lastMessageIsFromMe === true;

        let previewContent = null;
        if (previewText === '[Image]') {
          previewContent = (
            <span className="flex items-center text-text-subtle">
              <CameraIcon />
              Photo
            </span>
          );
        } else if (previewText) {
          previewContent = (
            <span className={unread > 0 ? 'text-text-muted' : 'text-text-subtle'}>
              {isMyMessage ? (
                <span>
                  <span className="text-text-subtle">You: </span>
                  {previewText}
                </span>
              ) : (
                previewText
              )}
            </span>
          );
        } else {
          previewContent = <span className="text-text-subtle italic">No messages yet</span>;
        }

        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={[
                'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                isActive
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : unread > 0
                  ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-transparent'
                  : 'hover:bg-surface-alt border-l-2 border-transparent',
              ].join(' ')}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="relative flex-shrink-0">
                <Avatar
                  src={participant?.profileImageUrl}
                  name={participant?.fullName || 'User'}
                  size="md"
                />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-surface" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      'text-sm truncate',
                      unread > 0 ? 'font-bold text-text' : 'font-medium text-text',
                    ].join(' ')}
                  >
                    {participant?.fullName || 'Unknown'}
                  </span>
                  {lastMessageAt && (
                    <span
                      className={[
                        'text-xs flex-shrink-0',
                        unread > 0 ? 'text-primary font-semibold' : 'text-text-subtle',
                      ].join(' ')}
                    >
                      {compactTime(lastMessageAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs truncate flex-1">{previewContent}</p>
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {unread > 99 ? '99+' : unread > 9 ? '9+' : unread}
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
      lastMessagePreview: PropTypes.string,
      lastMessageAt: PropTypes.string,
      lastMessageIsFromMe: PropTypes.bool,
      unreadCount: PropTypes.number,
    })
  ),
  isLoading: PropTypes.bool,
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  searchQuery: PropTypes.string,
};
