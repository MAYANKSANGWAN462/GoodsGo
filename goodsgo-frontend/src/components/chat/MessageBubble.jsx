import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import { formatDate } from '../../utils/formatters';

/** Renders a single chat message, aligned left (received) or right (sent). */
export default function MessageBubble({ message, isMine }) {
  const isImage = message.messageType === 'image';

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && (
        <div className="flex-shrink-0">
          <Avatar
            src={message.sender?.profileImageUrl}
            name={message.sender?.fullName}
            size="xs"
          />
        </div>
      )}

      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-white text-text border border-border rounded-bl-sm'
        }`}
      >
        {isImage ? (
          <img
            src={message.imageUrl}
            alt="Shared image"
            className="max-w-full rounded-lg max-h-64 object-cover"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        )}
        <p
          className={`text-xs mt-1 ${
            isMine ? 'text-white/70' : 'text-text-muted'
          } text-right`}
        >
          {formatDate(message.createdAt, 'HH:mm')}
        </p>
      </div>
    </div>
  );
}

MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string,
    messageType: PropTypes.string.isRequired,
    imageUrl: PropTypes.string,
    senderId: PropTypes.string,
    sender: PropTypes.shape({
      id: PropTypes.string,
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
    createdAt: PropTypes.string.isRequired,
  }).isRequired,
  isMine: PropTypes.bool.isRequired,
};
