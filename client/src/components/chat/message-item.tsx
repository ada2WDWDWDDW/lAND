import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@/pages/chat";
import { BotIcon, UserIcon, Copy, Check, RefreshCw, Volume2, Languages } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { ChatSettings } from "./settings-dialog";

interface MessageItemProps {
  message: Message;
  index: number;
  onRegenerate?: (index: number) => void;
}

const formatMessage = (content: string) => {
  const segments = content.split(/(```[\s\S]*?```)/);

  return segments.map((segment, index) => {
    if (segment.startsWith('```') && segment.endsWith('```')) {
      const code = segment.slice(3, -3);
      return (
        <pre key={index} className="bg-slate-900 p-4 rounded-md my-2 overflow-x-auto">
          <code className="text-sky-400">{code}</code>
        </pre>
      );
    }

    const parts = segment.split(/(\*\*.*?\*\*)/);
    return parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${index}-${partIndex}`}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  });
};

export function MessageItem({ message, index, onRegenerate }: MessageItemProps) {
  const isBot = message.role === "assistant";
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const speechSynthesis = window.speechSynthesis;
  const speechUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem("chat_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const spanishVoices = voices.filter(voice => 
        voice.lang.startsWith('es') || voice.lang.startsWith('spa')
      );
      setAvailableVoices(spanishVoices);
      console.log("Voces disponibles:", spanishVoices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (speechUtterance.current) {
        speechSynthesis.cancel();
      }
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado",
        description: "Mensaje copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el mensaje",
        variant: "destructive"
      });
    }
  };

  const handleSpeak = async () => {
    try {
      if (isPlaying) {
        speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }

      if (availableVoices.length === 0) {
        throw new Error("No hay voces en español disponibles en tu navegador");
      }

      let selectedVoice = availableVoices.find(voice => 
        voice.lang === (settings?.voiceId || 'es-ES')
      ) || availableVoices[0];

      if (!selectedVoice) {
        throw new Error("No se encontró una voz adecuada para la síntesis");
      }

      setIsPlaying(true);

      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;

      console.log("Configuración de voz:", {
        voice: selectedVoice.name
      });

      speechUtterance.current = utterance;

      utterance.onend = () => {
        setIsPlaying(false);
        speechUtterance.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Error en la síntesis de voz:', event);
        setIsPlaying(false);
        speechUtterance.current = null;
        toast({
          title: "Error",
          description: "No se pudo reproducir el mensaje",
          variant: "destructive"
        });
      };

      // Cancelar cualquier síntesis previa
      speechSynthesis.cancel();
      // Pequeña pausa antes de empezar la nueva síntesis
      await new Promise(resolve => setTimeout(resolve, 100));
      speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Error en la función de voz:', error);
      setIsPlaying(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo reproducir el mensaje",
        variant: "destructive"
      });
    }
  };

  const handleTranslate = async () => {
    try {
      setIsTranslating(true);

      const response = await apiRequest("POST", "/api/translate", {
        text: translatedContent || message.content,
        targetLanguage: translatedContent ? 'es' : (settings?.targetTranslationLanguage || 'en')
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Error al traducir el mensaje");
      }

      const data = await response.json();
      setTranslatedContent(translatedContent ? null : data.translation);

      toast({
        title: "Traducción completada",
        description: `Mensaje traducido exitosamente`,
      });
    } catch (error) {
      console.error('Error en la traducción:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo traducir el mensaje",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={`flex gap-3 ${!isBot ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar 
        className={cn(
          "h-8 w-8 flex items-center justify-center",
          !isBot ? "bg-primary" : "bg-muted"
        )}
      >
        {isBot ? (
          <BotIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <UserIcon className="h-4 w-4 text-primary-foreground" />
        )}
      </Avatar>
      <div className={`flex-1 space-y-2 overflow-hidden ${!isBot ? "items-end" : ""}`}>
        <div className="group relative">
          <Card
            className={`px-4 py-3 max-w-[85%] ${
              isBot
                ? "bg-muted text-foreground"
                : "bg-primary text-primary-foreground ml-auto"
            }`}
          >
            {message.image && (
              <img
                src={message.image}
                alt="Uploaded content"
                className="max-w-sm mb-2 rounded"
              />
            )}
            <div className="whitespace-pre-wrap">
              {formatMessage(translatedContent || message.content)}
            </div>
          </Card>
          {isBot && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-20 hover:opacity-100 transition-opacity"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-20 hover:opacity-100 transition-opacity"
                onClick={handleSpeak}
                disabled={isPlaying}
              >
                <Volume2 className={cn("h-3 w-3", isPlaying && "animate-pulse")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-20 hover:opacity-100 transition-opacity"
                onClick={handleTranslate}
                disabled={isTranslating}
              >
                <Languages className={cn("h-3 w-3", isTranslating && "animate-spin")} />
              </Button>
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-20 hover:opacity-100 transition-opacity"
                  onClick={() => onRegenerate(index)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageItem;