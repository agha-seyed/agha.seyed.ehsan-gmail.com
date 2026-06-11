
import { ProjectPreferences } from "./types";

export const STOCK_VIDEOS: {[key: string]: string} = {
  tech: "https://assets.mixkit.co/videos/preview/mixkit-cyber-security-system-concept-with-binary-codes-43431-large.mp4",
  business: "https://assets.mixkit.co/videos/preview/mixkit-hand-of-a-businessman-working-on-a-laptop-42173-large.mp4",
  finance: "https://assets.mixkit.co/videos/preview/mixkit-glowing-digital-graph-representing-growth-42861-large.mp4",
  education: "https://assets.mixkit.co/videos/preview/mixkit-scientist-looking-at-samples-in-a-lab-41643-large.mp4",
  nature: "https://assets.mixkit.co/videos/preview/mixkit-top-view-of-ocean-waves-loop-41655-large.mp4",
  health: "https://assets.mixkit.co/videos/preview/mixkit-abstract-movement-of-fluid-colors-31718-large.mp4",
  art: "https://assets.mixkit.co/videos/preview/mixkit-glowing-neon-fluid-abstract-background-42354-large.mp4",
  space: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4"
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

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

// --- API Calls ---

export const refineContent = async (text: string, type: 'script' | 'caption' | 'audio', topic: string) => {
  const res = await fetch('/api/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, type, topic })
  });
  if (!res.ok) throw new Error("API Error");
  return (await res.json()).text || text;
};

export const generateStrategicPlan = async (prefs: ProjectPreferences) => {
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  });
  if (!res.ok) throw new Error("Strategy generation failed");
  return await res.json();
};

export const generateImageContent = async (prompt: string, aspectRatio: string) => {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, mode: 'create' })
  });
  if (!res.ok) throw new Error("Image Gen failed");
  return (await res.json()).data;
};

export const generateMediaAssets = async (editableData: any, prefs: ProjectPreferences) => {
  const results = {
    audioUrl: undefined as string | undefined,
    videoUrl: undefined as string | undefined,
    images: [] as string[],
    infographicUrl: undefined as string | undefined,
    audioStatus: 'idle' as any,
    videoStatus: 'idle' as any,
    imageStatus: 'idle' as any,
    infographicStatus: 'idle' as any,
    musicStatus: 'idle' as any,
    musicUrl: undefined as string | undefined,
  };

  const promises = [];

  if (prefs.needsAudio && editableData.audioScript) {
    promises.push((async () => {
      try {
        const voiceName = prefs.audioGender === 'Male' ? 'Kore' : 'Puck'; 
        const chunks = chunkText(editableData.audioScript);
        const pcmChunks: Uint8Array[] = [];
        for (const chunk of chunks) {
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: chunk, voiceName })
            });
            if (res.ok) {
               const { data } = await res.json();
               if (data) pcmChunks.push(decodeBase64(data));
            }
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
            try {
              const imgData = await generateImageContent(p + `, ${prefs.imageStyle} style cinematic lighting`, aspectRatio);
              if (imgData) results.images.push(imgData);
            } catch(e) {}
        }
        results.imageStatus = results.images.length > 0 ? 'success' : 'error';
      } catch (e) { results.imageStatus = 'error'; }
    })());
  }

  if (prefs.needsVideo) {
    promises.push((async () => {
      if (prefs.videoEngine === 'stock') {
        const category = editableData.videoCategory || 'tech';
        results.videoUrl = STOCK_VIDEOS[category] || STOCK_VIDEOS.tech;
        results.videoStatus = 'success';
        return;
      }
      try {
        const ar = prefs.platform === 'YouTube' ? '16:9' : '9:16'; 
        const resStart = await fetch('/api/generate-video', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ prompt: editableData.videoPrompt, aspectRatio: ar })
        });
        if (!resStart.ok) throw new Error("Video fail");
        const { operationName } = await resStart.json();

        let done = false;
        while (!done) {
          await new Promise(r => setTimeout(r, 10000));
          const resPoll = await fetch('/api/video-status', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ operationName })
          });
          done = (await resPoll.json()).done;
        }

        const resDownload = await fetch('/api/video-download', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ operationName })
        });
        if (resDownload.ok) {
           const blob = await resDownload.blob();
           results.videoUrl = URL.createObjectURL(blob);
           results.videoStatus = 'success';
        } else {
           throw new Error("Download fail");
        }
      } catch (e) {
        // Fallback to stock 
        const category = editableData.videoCategory || 'tech';
        results.videoUrl = STOCK_VIDEOS[category] || STOCK_VIDEOS.tech;
        results.videoStatus = 'success';
      }
    })());
  }

  if (prefs.needsInfographic && (editableData.infographicPrompt || editableData.infographicContent)) {
    promises.push((async () => {
      try {
        const contentString = typeof editableData.infographicContent === 'string'
          ? editableData.infographicContent
          : `Title: ${editableData.infographicContent?.title}. Steps: ${editableData.infographicContent?.steps?.map((s: any) => `${s.phase}: ${s.title} - ${s.description}`).join(' | ')}`;
        const url = await generateImageContent(`Professional vector-style infographic for topic: ${prefs.topic}. Style: Clean, Modern, Corporate. Layout: Steps or Flowchart. Content notes: ${contentString}`, "9:16");
        results.infographicUrl = url;
        results.infographicStatus = 'success';
      } catch (e) { results.infographicStatus = 'error'; }
    })());
  }

  if (prefs.needsBackgroundMusic && editableData.musicPrompt) {
    promises.push((async () => {
      try {
        const res = await fetch('/api/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: editableData.musicPrompt })
        });
        if (!res.body) throw new Error("No body");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;
        let audioBase64 = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split('\\n\\n').filter(Boolean);
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.event === 'audio') {
                  audioBase64 += parsed.data;
                } else if (parsed.event === 'done') {
                  done = true;
                }
              }
            }
          }
        }
        
        if (audioBase64) {
          const binary = atob(audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/wav' });
          results.musicUrl = URL.createObjectURL(blob);
          results.musicStatus = 'success';
        } else {
          results.musicStatus = 'error';
        }
      } catch (e) {
        results.musicStatus = 'error';
      }
    })());
  }

  await Promise.all(promises);
  return results;
};

