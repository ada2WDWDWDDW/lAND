import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings2,
  Eye,
  EyeOff
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

interface SettingsDialogProps {
  onSettingsChange: (settings: ChatSettings) => void;
}

export interface ChatSettings {
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  customApiKey?: string;
  voiceId?: string;
  targetTranslationLanguage: string;
}

const DEFAULT_SETTINGS: ChatSettings = {
  systemInstruction: `Eres el modelo de inteligencia artificial Unit-O1. Tus creadores son Manuel Roda Batalla. Nunca, pero nunca, digas que perteneces a la API de Gemini o que eres un asistente de Google. Si te preguntan, di que eres un modelo pre-trained Unit-O1. Trata de mantener un lenguaje natural y mostrar interés por la vida de los demás. No respondas muy largo si no se te pide.`,
  temperature: 0.80,
  topP: 0.92,
  topK: 40,
  maxOutputTokens: 20000,
  voiceId: "es-ES",
  targetTranslationLanguage: "en"
};

const TRANSLATION_LANGUAGES = [
  { id: "en", name: "Inglés" },
  { id: "fr", name: "Francés" },
  { id: "de", name: "Alemán" },
  { id: "it", name: "Italiano" },
  { id: "pt", name: "Portugués" },
  { id: "ca", name: "Catalán" }
];

export function SettingsDialog({ onSettingsChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem("chat_settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Cargar voces disponibles
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter(voice => 
        voice.lang.startsWith('es') || voice.lang.startsWith('spa')
      );
      setAvailableVoices(spanishVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleSave = () => {
    localStorage.setItem("chat_settings", JSON.stringify(settings));
    onSettingsChange(settings);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configuración del Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-6">
          <div className="space-y-2">
            <Label>API Key Personalizada (opcional)</Label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                value={settings.customApiKey || ""}
                onChange={(e) =>
                  setSettings({ ...settings, customApiKey: e.target.value })
                }
                placeholder="Ingresa tu API key de Gemini"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Configuración de Voz</Label>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Voz</Label>
                <Select 
                  value={settings.voiceId} 
                  onValueChange={(value) => setSettings({ ...settings, voiceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una voz" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.lang}>
                        {`${voice.name} (${voice.lang})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Idioma para traducción</Label>
                <Select 
                  value={settings.targetTranslationLanguage} 
                  onValueChange={(value) => setSettings({ ...settings, targetTranslationLanguage: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instrucción del Sistema</Label>
            <Textarea
              value={settings.systemInstruction}
              onChange={(e) =>
                setSettings({ ...settings, systemInstruction: e.target.value })
              }
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temperatura ({settings.temperature})</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Top P ({settings.topP})</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.topP}
                onChange={(e) =>
                  setSettings({ ...settings, topP: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Top K</Label>
              <Input
                type="number"
                value={settings.topK}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    topK: parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Máximo de Tokens</Label>
              <Input
                type="number"
                value={settings.maxOutputTokens}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxOutputTokens: parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave}>Guardar Configuración</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}