import { useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import EmptyState from '../../components/common/EmptyState';
import { useConversations } from '../../hooks/useChat';

/**
 * Split-view chat page.
 * - Mobile: shows ConversationList OR ChatWindow (mutually exclusive, toggled by URL).
 * - Desktop (md+): 1/3 ConversationList + 2/3 ChatWindow side by side.
 *
 * Active conversation stored in URL query param: ?conversation=<id>
 */
export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get('conversation');

  const { data, isLoading } = useConversations();
  const conversations = data?.data ?? [];

  function handleSelect(id) {
    setSearchParams({ conversation: id });
  }

  function handleBack() {
    setSearchParams({});
  }

  return (
    <div
      className="flex overflow-hidden rounded-lg border border-border bg-surface"
      style={{ height: 'calc(100vh - 9rem)' }}
    >
      {/* Conversation list — always visible on desktop; hidden on mobile when a conversation is open */}
      <div
        className={`flex-col border-r border-border bg-surface overflow-hidden ${
          activeConversationId
            ? 'hidden md:flex md:w-1/3'
            : 'flex w-full md:w-1/3'
        }`}
      >
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <h2 className="font-semibold text-base text-text">Messages</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            activeId={activeConversationId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Chat window — hidden on mobile when no conversation is selected */}
      <div
        className={`flex-col flex-1 overflow-hidden ${
          activeConversationId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeConversationId ? (
          <ChatWindow
            conversationId={activeConversationId}
            onBack={handleBack}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              title="Select a conversation"
              message="Pick a conversation from the list on the left to start chatting."
            />
          </div>
        )}
      </div>
    </div>
  );
}
