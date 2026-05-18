import { useEffect, useRef } from "react";
import type { Message, ChatMode } from "@/types";
import MessageBubble from "@/components/MessageBubble";
import InputArea from "@/components/InputArea";
import WelcomeScreen from "@/components/WelcomeScreen";

interface ChatAreaProps {
  messages: Message[];
  onSend: (text: string) => void;
  onSuggestionClick: (text: string) => void;
  isNetwork: boolean;
  setIsNetwork: (v: boolean) => void;
  chatMode: ChatMode;
  setChatMode: (mode: ChatMode) => void;
}

export default function ChatArea({
  messages,
  onSend,
  onSuggestionClick,
  isNetwork,
  setIsNetwork,
  chatMode,
  setChatMode,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const showWelcome = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen">
      {showWelcome ? (
        <WelcomeScreen
          onSuggestionClick={onSuggestionClick}
          isNetwork={isNetwork}
          chatMode={chatMode}
          setChatMode={setChatMode}
        />
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-12 lg:px-20 xl:px-32"
        >
          <div className="max-w-3xl mx-auto pt-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      )}

      <InputArea
        onSend={onSend}
        isNetwork={isNetwork}
        setIsNetwork={setIsNetwork}
        chatMode={chatMode}
        setChatMode={setChatMode}
      />
    </div>
  );
}
