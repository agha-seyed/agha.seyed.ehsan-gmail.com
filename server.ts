import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Schema, Type, Modality, GenerateVideosOperation } from "@google/genai";
import { WebSocketServer } from "ws";
import * as http from "http";
import cors from "cors";

// Make sure to load GEMINI_API_KEY from environment
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.get("/api/test-key", (req, res) => {
    res.json({ key: process.env.GEMINI_API_KEY ? "HAS_KEY" : "NO_KEY", length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0 });
  });

  // --- Search Grounded Plan Generation ---
  app.post("/api/plan", async (req, res) => {
    try {
      const { topic, targetAudience, imageCount } = req.body;
      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          audioScript: { type: Type.STRING },
          caption: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
          videoPrompt: { type: Type.STRING },
          videoCategory: { type: Type.STRING, description: "One of: tech, business, finance, education, nature, health, art, space" },
          musicPrompt: { type: Type.STRING, description: "Prompt for cinematic generated music track" },
          infographicPrompt: { type: Type.STRING },
          infographicContent: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    phase: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  },
                  required: ["id", "phase", "title", "description", "icon"]
                }
              }
            },
            required: ["title", "steps"]
          },
        },
        required: ["script", "audioScript", "caption", "hashtags", "imagePrompts", "videoPrompt", "musicPrompt"],
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search Google for the latest news and trends about "${topic}". Then generate a complete production strategy for this topic. Audience: ${targetAudience}. Needs ${imageCount} image prompts. Also generate a logical step-by-step flowchart.`,
        config: {
          tools: [{googleSearch: {}}],
          systemInstruction: "You are a professional creative director and news analyst. Use Google Search to find current data and trends. Generate a comprehensive social media content plan in Persian (except for technical prompts which must be in English). Return ONLY valid JSON.",
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      const text = response.text || "{}";
      const match = text.match(/```json([\s\S]*?)```/i);
      const cleaned = match ? match[1].trim() : text.trim();
      res.json(JSON.parse(cleaned));
    } catch (e: any) {
      // console.error(e);
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  // --- Refine Content ---
  app.post("/api/refine", async (req, res) => {
    try {
      const { text, type, topic } = req.body;
      const prompt = `Topic: ${topic}. Original ${type}: "${text}". \n Please rewrite and improve this ${type} to be more engaging and viral for social media in Persian. Only return the improved text. Use Google Search for context.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: { tools: [{googleSearch: {}}] },
      });
      res.json({ text: response.text?.trim() || text });
    } catch (e: any) {
      // console.error(e);
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  // --- Generate Single Image ---
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio, mode, base64Image } = req.body;
      
      // Setup payload based on "create" vs "edit"
      const parts: any[] = [];
      if (mode === 'edit' && base64Image) {
          parts.push({ inlineData: { data: base64Image, mimeType: "image/png" } });
      }
      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio } }
      });

      const imagePart = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
      if (imagePart?.inlineData) {
        res.json({ data: `data:image/png;base64,${imagePart.inlineData.data}` });
      } else {
        res.status(500).json({ error: "Failed to generate image" });
      }
    } catch (e: any) {
      // console.error(e);
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  // --- Text to Speech (TTS) ---
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
        }
      });
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ data });
    } catch (e: any) {
      // console.error(e);
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  // --- Lyria Music Generation ---
  app.post("/api/generate-music", async (req, res) => {
    try {
      const { prompt } = req.body;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: prompt || 'Generate a short corporate futuristic video intro background track.',
      });

      let lyrics = "";
      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            res.write(`data: ${JSON.stringify({ event: 'audio', data: part.inlineData.data })}\n\n`);
          }
        }
      }
      res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
      res.end();
    } catch (e: any) {
      // console.error(e);
      res.write(`data: ${JSON.stringify({ event: 'error', message: e.message })}\n\n`);
      res.end();
    }
  });

  // --- Veo Video Generation ---
  app.post("/api/generate-video", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { resolution: '720p', aspectRatio: aspectRatio }
      });
      res.json({ operationName: operation.name });
    } catch(e: any) {
      // console.error(e);
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch(e: any) {
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  app.post("/api/video-download", async (req, res) => {
    try {
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("Video not ready");

      const apiKey = process.env.GEMINI_API_KEY!;
      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey },
      });
      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        })
      );
    } catch(e: any) {
      // console.error(e);
      const isQuota = e.message && (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")); res.status(isQuota ? 429 : 500).json({ error: e.message });
    }
  });

  // Create HTTP server
  const server = http.createServer(app);

  // --- WebSocket Server for Live API ---
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the creative genius assistant for Content Genius AI Studio. You help users brainstorm creative ideas, scripts, and production styles. Be very energetic, positive, and concise.",
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted)
              clientWs.send(JSON.stringify({ interrupted: true }));
          },
        },
      });

      clientWs.on("message", (data) => {
        const payload = JSON.parse(data.toString());
        if (payload.audio) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      });
      
      clientWs.on('close', () => session.close());
    } catch(e) {
      // console.error("Live API Error:", e);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
