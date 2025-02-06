import type { Message } from "@/pages/chat";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  settings?: any;
  createdAt: number;
}

const CHATS_KEY = "chat_sessions";

function generateTitle(firstMessage: string): string {
  // Toma las primeras 4 palabras del mensaje o menos si el mensaje es más corto
  return firstMessage.split(" ").slice(0, 4).join(" ") + "...";
}

export function saveChat(chatId: string, messages: Message[], settings?: any): void {
  const chats = getAllChats();
  const existingChat = chats.find(chat => chat.id === chatId);

  if (existingChat) {
    existingChat.messages = messages;
    existingChat.settings = settings;
  } else {
    const firstMessage = messages[0]?.content || "Nuevo Chat";
    chats.push({
      id: chatId,
      title: generateTitle(firstMessage),
      messages,
      settings,
      createdAt: Date.now()
    });
  }

  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function getChat(chatId: string): ChatSession | null {
  const chats = getAllChats();
  return chats.find(chat => chat.id === chatId) || null;
}

export function getAllChats(): ChatSession[] {
  const chats = localStorage.getItem(CHATS_KEY);
  return chats ? JSON.parse(chats) : [];
}

export function deleteChat(chatId: string): void {
  const chats = getAllChats().filter(chat => chat.id !== chatId);
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function createNewChat(): string {
  const chatId = crypto.randomUUID();
  const chats = getAllChats();
  chats.push({
    id: chatId,
    title: "Nuevo Chat",
    messages: [],
    createdAt: Date.now()
  });
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  return chatId;
}