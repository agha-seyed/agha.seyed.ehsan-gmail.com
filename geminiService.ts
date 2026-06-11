
import { GoogleGenAI, Type, Modality, Schema, GenerateContentResponse } from "@google/genai";
import { ProjectPreferences } from "./types";

// --- Audio Helper Functions ---
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const chunkText = (text: string, maxLength: number = 400): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";
  const sentences = text.split(/([.?!،؛])/); 

  for (const part of sentences) {
    if (currentChunk.length + part.length > maxLength) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
};

const stitchAudioAndCreateWav = (pcmChunks: Uint8Array[], sampleRate: number = 24000) => {
  const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combinedPcm = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const chunk of pcmChunks) {
    combinedPcm.set(chunk, offset);
    offset += chunk.length;
  }

  const buffer = new ArrayBuffer(44 + combinedPcm.length);
  const view = new DataView(buffer);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + combinedPcm.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, combinedPcm.length, true);
  
  const samples = new Uint8Array(buffer, 44);
  samples.set(combinedPcm);
  
  return new Blob([buffer], { type: 'audio/wav' });
};

// --- Content Refinement ---
export const refineContent = async (text: string, type: 'script' | 'caption' | 'audio', topic: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const prompt = `Topic: ${topic}. Original ${type}: "${text}". \n Please rewrite and improve this ${type} to be more engaging and viral for social media in Persian. Only return the improved text, no explanations. Use Google Search for current context.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      }
    });
    return response.text?.trim() || text;
  } catch (e) {
    console.error("Refinement error:", e);
    return text;
  }
};

// --- Strategic Plan Generation ---
export const generateStrategicPlan = async (prefs: ProjectPreferences) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      script: { type: Type.STRING },
      audioScript: { type: Type.STRING },
      caption: { type: Type.STRING },
      hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
      videoPrompt: { type: Type.STRING },
      musicPrompt: { type: Type.STRING },
      infographicPrompt: { type: Type.STRING },
      infographicContent: {
        type: Type.OBJECT,
        description: "A step-by-step flowchart representing the exact production/ideation logical phases of the content topic.",
        properties: {
          title: { type: Type.STRING, description: "Flowchart main topic title in Persian (e.g. نقشه راه ۵ مرحله‌ای آموزش...)" },
          steps: {
            type: Type.ARRAY,
            description: "Sequence of steps in logical order",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                phase: { type: Type.STRING, description: "e.g. مرحله ۱, گام دوم" },
                title: { type: Type.STRING, description: "Main short title of the step in Persian" },
                description: { type: Type.STRING, description: "Step description explaining details or action in Persian" },
                duration: { type: Type.STRING, description: "Estimated time or effort, e.g. ۵ دقیقه, ۱ ساعت" },
                icon: { type: Type.STRING, description: "An emoji matching this step's theme" }
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search Google for the latest news and trends about "${prefs.topic}". Then generate a complete production strategy for this topic. Audience: ${prefs.targetAudience}. Needs ${prefs.imageCount} image prompts. Also generate a logical step-by-step flowchart under infographicContent that details how to produce content or how ideas relate for this topic.`,
      config: {
        tools: [{googleSearch: {}}],
        systemInstruction: "You are a professional creative director and news analyst. Use Google Search to find current data and trends. Generate a comprehensive social media content plan in Persian (except for technical prompts which must be in English). Output MUST be valid JSON conforming to responseSchema.",
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web).filter(Boolean) || [];

    return {
      script: parsed.script,
      audioScript: parsed.audioScript,
      caption: parsed.caption,
      hashtags: parsed.hashtags || [],
      imagePrompts: parsed.imagePrompts || [],
      videoPrompt: parsed.videoPrompt,
      musicPrompt: parsed.musicPrompt,
      infographicPrompt: parsed.infographicPrompt || "",
      infographicContent: parsed.infographicContent || { title: "", steps: [] },
      sources: sources
    };
  } catch (e) {
    console.error("Plan generation error:", e);
    throw new Error("Failed to generate strategy.");
  }
};

// --- Media Assets Generation ---
export const generateMediaAssets = async (editableData: any, prefs: ProjectPreferences) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const results = {
    audioUrl: undefined as string | undefined,
    videoUrl: undefined as string | undefined,
    images: [] as string[],
    infographicUrl: undefined as string | undefined,
    audioStatus: 'idle' as any,
    videoStatus: 'idle' as any,
    imageStatus: 'idle' as any,
    infographicStatus: 'idle' as any,
  };

  const promises = [];

  if (prefs.needsAudio && editableData.audioScript) {
    promises.push((async () => {
      try {
        const voiceName = prefs.audioGender === 'Male' ? 'Kore' : 'Puck'; 
        const chunks = chunkText(editableData.audioScript);
        const pcmChunks: Uint8Array[] = [];
        for (const chunk of chunks) {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: chunk }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
                }
            });
            const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (data) pcmChunks.push(decodeBase64(data));
        }
        if (pcmChunks.length > 0) {
            results.audioUrl = URL.createObjectURL(stitchAudioAndCreateWav(pcmChunks));
            results.audioStatus = 'success';
        }
      } catch (e) { results.audioStatus = 'error'; }
    })());
  }

  if (prefs.needsImage && editableData.imagePrompts?.length > 0) {
    promises.push((async () => {
      try {
        const aspectRatio = prefs.platform === 'YouTube' ? '16:9' : (prefs.platform === 'Instagram' ? '1:1' : '9:16');
        const prompts = editableData.imagePrompts.slice(0, prefs.imageCount);
        for (const p of prompts) {
            const res = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: `${p}, high definition, cinematic lighting, ${prefs.imageStyle} style` }] },
                config: { imageConfig: { aspectRatio: aspectRatio as any } }
            });
            const imagePart = res.candidates?.[0]?.content.parts.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                results.images.push(`data:image/png;base64,${imagePart.inlineData.data}`);
            }
        }
        results.imageStatus = results.images.length > 0 ? 'success' : 'error';
      } catch (e) { results.imageStatus = 'error'; }
    })());
  }

  if (prefs.needsVideo && editableData.videoPrompt) {
    promises.push((async () => {
      try {
        const ar = prefs.platform === 'YouTube' ? '16:9' : '9:16'; 
        let op = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: editableData.videoPrompt,
          config: { resolution: '720p', aspectRatio: ar as any }
        });
        while (!op.done) {
          await new Promise(r => setTimeout(r, 10000));
          op = await ai.operations.getVideosOperation({ operation: op });
        }
        if (op.response?.generatedVideos?.[0]?.video?.uri) {
             const res = await fetch(`${op.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}`);
             results.videoUrl = URL.createObjectURL(await res.blob());
             results.videoStatus = 'success';
        } else { results.videoStatus = 'error'; }
      } catch (e) { results.videoStatus = 'error'; }
    })());
  }

  if (prefs.needsInfographic && (editableData.infographicPrompt || editableData.infographicContent)) {
    promises.push((async () => {
        try {
            const contentString = typeof editableData.infographicContent === 'string'
              ? editableData.infographicContent
              : `Title: ${editableData.infographicContent?.title}. Steps: ${editableData.infographicContent?.steps?.map((s: any) => `${s.phase}: ${s.title} - ${s.description}`).join(' | ')}`;

            const res = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: { parts: [{ text: `Professional vector-style infographic for topic: ${prefs.topic}. Style: Clean, Modern, Corporate. Layout: Steps or Flowchart. Content notes: ${contentString}` }] },
                config: { imageConfig: { aspectRatio: '9:16' } }
            });
            const part = res.candidates?.[0]?.content.parts.find(p => p.inlineData);
            if (part?.inlineData) {
                results.infographicUrl = `data:image/png;base64,${part.inlineData.data}`;
                results.infographicStatus = 'success';
            }
        } catch (e) { results.infographicStatus = 'error'; }
    })());
  }

  await Promise.all(promises);
  return results;
};
