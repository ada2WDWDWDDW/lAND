import { useEffect, useState, useCallback } from "react";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { SettingsDialog, type ChatSettings } from "@/components/chat/settings-dialog";
import { getAllChats, getChat, saveChat, createNewChat, deleteChat } from "@/lib/storage";
import { sendMessage } from "@/lib/gemini";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { Edit2, MenuIcon, Plus, Search, Trash2, ChevronLeft, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  image?: string;
  timestamp: number;
}

export default function Chat() {
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const chats = getAllChats();
    if (chats.length === 0) {
      const newChatId = createNewChat();
      setCurrentChatId(newChatId);
    } else {
      setCurrentChatId(chats[0].id);
      const chat = getChat(chats[0].id);
      if (chat) {
        setMessages(chat.messages);
      }
    }

    const savedSettings = localStorage.getItem("chat_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSendMessage = async (content: string, image?: string | File) => {
    try {
      setIsLoading(true);

      let imageData: string | undefined;
      if (image instanceof File) {
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(image);
        });
      } else {
          imageData = image;
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        content,
        role: "user",
        image: imageData,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Enviar el historial completo de mensajes actual más el nuevo mensaje
      const response = await sendMessage(
        content,
        imageData,
        settings,
        messages.concat(userMessage)
      );

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        role: "assistant",
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        saveChat(currentChatId, newMessages, settings);
        return newMessages;
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el mensaje. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newChatId = createNewChat();
    setCurrentChatId(newChatId);
    setMessages([]);
  };

  const handleChatSelect = (chatId: string) => {
    const chat = getChat(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId);
    const chats = getAllChats();
    if (chats.length === 0) {
      handleNewChat();
    } else if (chatId === currentChatId) {
      handleChatSelect(chats[0].id);
    }
  };

  const handleEditChat = (chatId: string, newTitle: string) => {
    const chats = getAllChats();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      chat.title = newTitle;
      localStorage.setItem("chat_sessions", JSON.stringify(chats));
      setEditingChatId(null);
    }
  };

  const filteredChats = getAllChats().filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

    const ChatList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <Button className="w-full" onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Chat
        </Button>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar chats..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer ${
                chat.id === currentChatId ? "bg-accent" : ""
              }`}
              onClick={() => handleChatSelect(chat.id)}
            >
              <div className="truncate flex-1">
                {editingChatId === chat.id ? (
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditChat(chat.id, editingTitle);
                      }
                    }}
                    onBlur={() => handleEditChat(chat.id, editingTitle)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <>
                    <p className="font-medium">{chat.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(chat.createdAt).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
              {chat.id !== currentChatId && !editingChatId && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChatId(chat.id);
                      setEditingTitle(chat.title);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const handleRegenerate = async (messageIndex: number) => {
    try {
      setIsLoading(true);
      const previousMessages = messages.slice(0, messageIndex);
      const messageToRegenerate = messages[messageIndex];

      const response = await sendMessage(
        messageToRegenerate.content,
        messageToRegenerate.image,
        settings,
        previousMessages
      );

      const regeneratedMessage: Message = {
        id: crypto.randomUUID(),
        content: response,
        role: "assistant",
        timestamp: Date.now(),
      };

      const updatedMessages = [...previousMessages, regeneratedMessage];
      setMessages(updatedMessages);
      saveChat(currentChatId, updatedMessages, settings);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo regenerar el mensaje",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

    // Manejadores de drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (!imageFile) {
      toast({
        title: "Error",
        description: "Solo se permiten imágenes",
        variant: "destructive",
      });
      return;
    }

    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Enviar mensaje con la imagen
      await handleSendMessage("Analiza esta imagen por favor", base64Image);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la imagen",
        variant: "destructive",
      });
    }
  }, [toast, handleSendMessage]);


  return (
    <div 
      className="flex h-screen bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Sidebar for desktop */}
      <aside 
        className={cn(
          "hidden md:flex border-r flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 opacity-0"
        )}
      >
        <ChatList />
      </aside>

      {/* Toggle sidebar button */}
      <button
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 bg-background border rounded-r-lg p-1.5 hover:bg-accent transition-colors"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Cerrar barra lateral" : "Abrir barra lateral"}
      >
        <ChevronLeft className={cn(
          "h-4 w-4 transition-transform",
          !sidebarOpen && "rotate-180"
        )} />
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <ChatList />
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold">Unit-O1 Chat</h1>
          </div>
          <SettingsDialog onSettingsChange={setSettings} />
        </header>
        <main className="flex-1 container max-w-4xl mx-auto p-4 overflow-hidden flex flex-col relative">
            {/* Overlay de arrastre */}
            {isDragging && (
            <div className="absolute inset-0 bg-background/80 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50">
              <div className="text-center">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
                <p className="text-lg font-medium">Suelta la imagen aquí</p>
              </div>
            </div>
          )}
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            onRegenerate={handleRegenerate} 
          />
          <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}