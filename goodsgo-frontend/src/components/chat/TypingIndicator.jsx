/** Animated "..." indicator shown while the other participant is typing. */
export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex items-center gap-1 bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3">
        <span
          className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
