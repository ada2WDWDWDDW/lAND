import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MenuIcon, Plus, Trash2 } from "lucide-react";
import type { ChatSession } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface ChatListProps {
  chats: ChatSession[];
  currentChatId: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatList({
  chats,
  currentChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}: ChatListProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <MenuIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Mis Chats</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <Button className="w-full" onClick={onNewChat}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer",
                  chat.id === currentChatId && "bg-accent"
                )}
                onClick={() => onChatSelect(chat.id)}
              >
                <div className="truncate flex-1">
                  <p className="font-medium">{chat.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {chat.id !== currentChatId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
