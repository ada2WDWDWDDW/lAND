import { ScrollArea } from "@/components/ui/scroll-area";
import MessageItem from "./message-item";
import type { Message } from "@/pages/chat";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  onRegenerate?: (messageIndex: number) => void;
}

export function MessageList({ messages, isLoading, onRegenerate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-6 py-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            ¡Hola! ¿En qué puedo ayudarte hoy?
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem 
              key={message.id} 
              message={message} 
              index={index}
              onRegenerate={onRegenerate}
            />
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="h-5 w-5 text-muted-foreground"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 8V4" />
                <path d="M12 12v-2" />
                <path d="m12 12 8.485 8.485" />
                <path d="M12 12 3.515 3.515" />
              </svg>
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
              <div className="bg-muted rounded-lg px-4 py-3 max-w-[85%]">
                <div className="flex space-x-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}