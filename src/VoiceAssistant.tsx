import React, { useState, useRef, useEffect } from 'react';

const VoiceAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const pcmToBase64 = (buffer: Float32Array) => {
    let pcm16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        let s = Math.max(-1, Math.min(1, buffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playAudioChunk = (audioCtx: AudioContext, base64: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }
    const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    const currTime = audioCtx.currentTime;
    if (nextStartTimeRef.current < currTime) {
      nextStartTimeRef.current = currTime;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop
      if (wsRef.current) wsRef.current.close();
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (sourceRef.current) sourceRef.current.disconnect();
      if (inputAudioCtxRef.current) inputAudioCtxRef.current.close();
      if (outputAudioCtxRef.current) outputAudioCtxRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setIsRecording(false);
      setIsConnected(false);
      return;
    }

    try {
      // Start
      const host = window.location.host;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${host}/live`);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;
      
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = inputCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio && outputAudioCtxRef.current) {
          playAudioChunk(outputAudioCtxRef.current, msg.audio);
        }
        if (msg.interrupted) {
          nextStartTimeRef.current = outputAudioCtxRef.current ? outputAudioCtxRef.current.currentTime : 0;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
      };

      setIsRecording(true);
    } catch (e) {
      console.error(e);
      alert('Could not start microphone');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <button 
        onClick={toggleRecording}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-300 ${isRecording ? 'bg-red-500 animate-pulse scale-110 shadow-red-500/50' : 'bg-emerald-500 hover:scale-110 shadow-emerald-500/30'}`}
      >
        {isRecording ? '🎙️' : '🤖'}
      </button>
      {isRecording && (
        <div className="absolute bottom-20 right-0 w-48 bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
          <p className="text-white text-xs font-bold leading-relaxed">
             {isConnected ? 'دستیار در حال گوش دادن است... صحبت کنید.' : 'در حال اتصال...'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;
