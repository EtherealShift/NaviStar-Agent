import { useAutoScroll } from '../hooks/useAutoScroll.js';
import EmptyState from './EmptyState.jsx';
import MessageBubble from './MessageBubble.jsx';

export default function MessageList({ messages }) {
  const bottomRef = useAutoScroll([messages]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 py-8">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </main>
  );
}
