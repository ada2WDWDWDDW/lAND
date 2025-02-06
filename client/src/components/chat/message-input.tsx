import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, SendIcon } from "lucide-react";
import { useState, useRef } from "react";

interface MessageInputProps {
  onSendMessage: (content: string, image?: File) => void;
  isLoading: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() || image) {
      onSendMessage(content.trim(), image);
      setContent("");
      setImage(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pt-4">
      {image && (
        <div className="mb-2 p-2 border rounded-md flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{image.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setImage(undefined)}
          >
            ×
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="min-h-[44px] max-h-32"
          rows={1}
        />
        <Button type="submit" size="icon" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}