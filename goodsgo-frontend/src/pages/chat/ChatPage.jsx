import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import { useConversations } from '../../hooks/useChat';

function ChatBubbleIllustration() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-20 h-20 text-border"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const activeConversationId = searchParams.get('conversation');

  const { data, isLoading } = useConversations();
  const conversations = data?.data ?? [];
  const totalCount = conversations.length;
  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  function handleSelect(id) {
    setSearchParams({ conversation: id });
  }

  function handleBack() {
    setSearchParams({});
  }

  return (
    <div
      className="flex overflow-hidden rounded-xl border border-border bg-surface shadow-sm animate-fade-in"
      style={{ height: 'calc(100vh - 9rem)' }}
    >
      {/* ── Conversation list panel ─────────────────────────────────── */}
      <div
        className={[
          'flex-col border-r border-border bg-surface overflow-hidden transition-all',
          activeConversationId
            ? 'hidden md:flex md:w-80 lg:w-96'
            : 'flex w-full md:w-80 lg:w-96',
        ].join(' ')}
      >
        {/* Panel header */}
        <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0 bg-surface">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-bold text-base text-text">Messages</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">
                  {totalCount} conversation{totalCount !== 1 ? 's' : ''}
                  {unreadTotal > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold">
                      {unreadTotal > 9 ? '9+' : unreadTotal}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                  Live
                </span>
              </div>
            </div>
            <button
              type="button"
              title="New conversation"
              className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-surface-alt transition-colors focus-visible:outline-primary"
              aria-label="New conversation"
            >
              <PencilIcon />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-surface-alt border border-border rounded-lg pl-9 pr-8 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text transition-colors"
                aria-label="Clear search"
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            activeId={activeConversationId}
            onSelect={handleSelect}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* ── Chat window panel ───────────────────────────────────────── */}
      <div
        className={[
          'flex-col flex-1 overflow-hidden',
          activeConversationId ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {activeConversationId ? (
          <ChatWindow conversationId={activeConversationId} onBack={handleBack} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-24 h-24 rounded-full bg-surface-alt flex items-center justify-center">
              <ChatBubbleIllustration />
            </div>
            <div>
              <p className="text-base font-semibold text-text mb-1">Select a conversation</p>
              <p className="text-sm text-text-muted max-w-xs leading-relaxed">
                Your messages with other users will appear here. Choose a conversation from the
                list to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
