import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CallModeProps {
  onClose: () => void;
  onSendMessage: (content: string) => void;
}

export function CallMode({ onClose, onSendMessage }: CallModeProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkBrowserSupport();
    return () => {
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkBrowserSupport = async () => {
    // Verificar si el navegador soporta getUserMedia
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!hasGetUserMedia) {
      toast({
        title: "Navegador no compatible",
        description: "Tu navegador no soporta la grabación de audio. Por favor, usa un navegador moderno como Chrome o Firefox.",
        variant: "destructive",
      });
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    await requestMicrophonePermission();
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log("Solicitando permisos del micrófono...");

      // Verificar el estado actual de los permisos
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      permissionStatus.onchange = () => {
        if (permissionStatus.state === 'granted') {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      };

      if (permissionStatus.state === 'denied') {
        setHasPermission(false);
        toast({
          title: "Acceso al micrófono denegado",
          description: "Por favor, permite el acceso al micrófono en la configuración de tu navegador y vuelve a intentarlo.",
          variant: "destructive",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log("Permisos del micrófono concedidos");
      streamRef.current = stream;
      setHasPermission(true);
      setupMediaRecorder(stream);

      toast({
        title: "Micrófono conectado",
        description: "Puedes comenzar a grabar tu mensaje.",
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setHasPermission(false);
      toast({
        title: "Error de acceso al micrófono",
        description: error instanceof Error ? error.message : "No se pudo acceder al micrófono",
        variant: "destructive",
      });
    }
  };

  const setupMediaRecorder = (stream: MediaStream) => {
    try {
      console.log("Configurando MediaRecorder...");

      const mimeType = 'audio/mp3';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error("Formato de audio MP3 no soportado en este navegador");
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Chunk de audio recibido, tamaño:", event.data.size);
          audioChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          console.log("Procesando audio grabado...");
          const audioBlob = new Blob(audioChunks.current, { type: mimeType });
          console.log("Tamaño del audio grabado:", audioBlob.size, "bytes");

          if (audioBlob.size === 0) {
            throw new Error("No se grabó ningún audio");
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
            if (typeof reader.result === 'string') {
              console.log("Audio convertido a base64, enviando para transcripción...");

              try {
                const response = await apiRequest("POST", "/api/transcribe", {
                  audio: reader.result,
                  mimeType
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.details || "Error al transcribir el audio");
                }

                const data = await response.json();
                console.log("Transcripción recibida:", data.transcription);

                if (data.transcription && data.transcription.trim() !== "") {
                  onSendMessage(data.transcription);
                  onClose();
                  toast({
                    title: "Mensaje enviado",
                    description: "Tu mensaje de voz ha sido transcrito y enviado.",
                  });
                } else {
                  throw new Error("No se pudo transcribir el audio");
                }
              } catch (error) {
                console.error("Error en la transcripción:", error);
                toast({
                  title: "Error de transcripción",
                  description: error instanceof Error ? error.message : "No se pudo transcribir el audio",
                  variant: "destructive",
                });
              }
            }
          };

          reader.readAsDataURL(audioBlob);
          audioChunks.current = [];
        } catch (error) {
          console.error("Error procesando audio:", error);
          toast({
            title: "Error al procesar el audio",
            description: error instanceof Error ? error.message : "No se pudo procesar el audio grabado",
            variant: "destructive",
          });
        }
      };

      console.log("MediaRecorder configurado exitosamente");
      mediaRecorder.current = recorder;
    } catch (error) {
      console.error("Error configurando MediaRecorder:", error);
      setHasPermission(false);
      toast({
        title: "Error de configuración",
        description: error instanceof Error ? error.message : "No se pudo configurar el grabador de audio",
        variant: "destructive",
      });
    }
  };

  const toggleRecording = () => {
    if (!mediaRecorder.current) {
      console.error("MediaRecorder no está inicializado");
      toast({
        title: "Error",
        description: "El grabador de audio no está listo",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isRecording) {
        console.log("Deteniendo grabación...");
        mediaRecorder.current.stop();
        toast({
          title: "Grabación finalizada",
          description: "Procesando el mensaje...",
        });
      } else {
        console.log("Iniciando grabación...");
        audioChunks.current = [];
        mediaRecorder.current.start(250);
        toast({
          title: "Grabando",
          description: "Habla tu mensaje...",
        });
      }
      setIsRecording(!isRecording);
    } catch (error) {
      console.error("Error al toggle recording:", error);
      toast({
        title: "Error de grabación",
        description: error instanceof Error ? error.message : "Error al controlar la grabación",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="flex flex-col items-center gap-8">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: isRecording ? [0.5, 0.8, 0.5] : 0.5
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 blur-sm"
        />

        {!isSupported && (
          <p className="text-white text-center max-w-md">
            Tu navegador no soporta la grabación de audio.
            Por favor, usa un navegador moderno como Chrome o Firefox.
          </p>
        )}

        {isSupported && hasPermission === false && (
          <p className="text-white text-center max-w-md">
            Se requiere acceso al micrófono para usar el modo llamada.
            <br />
            Por favor, permite el acceso al micrófono en la configuración de tu navegador y haz clic en el botón de abajo para volver a intentar.
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => requestMicrophonePermission()}
            >
              Reintentar acceso al micrófono
            </Button>
          </p>
        )}

        {isSupported && hasPermission === true && (
          <div className="flex flex-col items-center gap-4">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="rounded-full p-8"
              onClick={toggleRecording}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
            {isRecording && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white text-center"
              >
                Grabando...
              </motion.p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}