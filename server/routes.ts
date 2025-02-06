import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY;
if (!DEFAULT_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

interface ChatSettings {
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  customApiKey?: string;
  voiceId?: string;
  voiceSpeed: number;
  voicePitch: number;
  targetTranslationLanguage: string;
}

export function registerRoutes(app: Express): Server {
  app.post("/api/chat", async (req, res) => {
    try {
      const { content, image, settings, history } = req.body;

      // Debug logs
      console.log("Received request with settings:", JSON.stringify(settings, null, 2));
      console.log("History length:", history?.length);

      // Use default settings if none provided
      const finalSettings = settings || {
        systemInstruction: `Hola, te llamas raul y estas para atender a los usuarios`,
        temperature: 0.80,
        topP: 0.92,
        topK: 40,
        maxOutputTokens: 20000,
      };

      const apiKey = finalSettings.customApiKey || DEFAULT_API_KEY;
      if (!apiKey) {
        throw new Error("No valid API key provided");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
      });

      let response;
      if (image) {
        const imageParts = [
          { text: content },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: image.split(",")[1],
            },
          },
        ];
        response = await model.generateContent(imageParts);
      } else {
        const chat = model.startChat({
          history: history || [],
          generationConfig: {
            temperature: finalSettings.temperature,
            topP: finalSettings.topP,
            topK: finalSettings.topK,
            maxOutputTokens: finalSettings.maxOutputTokens,
          }
        });

        response = await chat.sendMessage(content);
      }

      const result = await response.response;
      res.json({ response: result.text() });
    } catch (error: any) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ 
        error: "Internal server error",
        details: error.message 
      });
    }
  });

  app.get("/api/voices", async (_req, res) => {
    try {
      // Using browser's built-in Speech Synthesis voices
      const voices = [
        { voice_id: 'es-ES', name: 'Español (España)', language_code: 'es-ES', ssml_gender: 'NEUTRAL' },
        { voice_id: 'es-MX', name: 'Español (México)', language_code: 'es-MX', ssml_gender: 'NEUTRAL' },
        { voice_id: 'es-US', name: 'Español (Estados Unidos)', language_code: 'es-US', ssml_gender: 'NEUTRAL' }
      ];
      res.json({ voices });
    } catch (error: any) {
      console.error("Error in voices endpoint:", error);
      res.status(500).json({
        error: "Error al obtener las voces",
        details: error.message
      });
    }
  });

  app.post("/api/text-to-speech", async (req, res) => {
    try {
      const { text } = req.body;
      // Return the text directly - speech synthesis will be handled by the browser
      res.json({ text });
    } catch (error: any) {
      console.error("Error en text-to-speech endpoint:", error);
      res.status(500).json({
        error: "Error en la conversión de texto a voz",
        details: error.message
      });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      console.log("Translation request:", { text, targetLanguage });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      let prompt;
      if (targetLanguage === 'es') {
        prompt = `Traduce el siguiente texto del inglés al español. Solo proporciona la traducción, sin texto adicional ni explicaciones:

        "${text}"`;
      } else {
        prompt = `Traduce el siguiente texto del español al ${targetLanguage}. Solo proporciona la traducción, sin texto adicional ni explicaciones:

        "${text}"`;
      }

      console.log("Translation prompt:", prompt);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translation = response.text().trim();

      console.log("Translation result:", translation);

      res.json({ translation });
    } catch (error: any) {
      console.error("Error en traducción:", error);
      res.status(500).json({
        error: "Error al traducir el texto",
        details: error.message
      });
    }
  });

  return createServer(app);
}