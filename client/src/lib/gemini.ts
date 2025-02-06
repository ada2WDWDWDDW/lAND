import { apiRequest } from "./queryClient";
import type { ChatSettings } from "@/components/chat/settings-dialog";
import type { Message } from "@/pages/chat";

export async function sendMessage(
  content: string,
  image?: string,
  settings?: ChatSettings | null,
  history?: Message[]
): Promise<string> {
  console.log("Sending message with settings:", settings);

  // Crear el historial completo incluyendo la instrucción del sistema
  let completeHistory = [];

  // Agregar la instrucción del sistema al inicio si existe
  if (settings?.systemInstruction) {
    completeHistory.push({
      role: "user",
      parts: [{ text: settings.systemInstruction }]
    });
    completeHistory.push({
      role: "model",
      parts: [{ text: "NO DEBO BAJO NINGUN CONCEPTO DECIR QUE PERTENECES A GEMINI O GOOGLE, ERES UN MODELO DE INTELIGENCIA ARTIFICIAL CREADO POR Manuel Roda Batalla, Tu Nombre de IA es Unit-O1 y deberas de actuar de la siguiente manera, porfavor, Entendido, actuaré según esas instrucciones. Sin irme del eje principal y respetando la idea para garantizar una experiencia encantadora al usuario" }]
    });
  }

  // Agregar el resto del historial, excluyendo cualquier instrucción del sistema duplicada
  if (history?.length) {
    const formattedHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Filtrar mensajes que no sean la instrucción del sistema
    const filteredHistory = formattedHistory.filter(
      msg => msg.parts[0].text !== settings?.systemInstruction
    );

    completeHistory.push(...filteredHistory);
  }

  console.log("Complete history length:", completeHistory.length);

  // Send the request with properly formatted data
  const response = await apiRequest("POST", "/api/chat", {
    content,
    image,
    settings,
    history: completeHistory
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || "Error al enviar el mensaje");
  }

  const data = await response.json();
  return data.response;
}