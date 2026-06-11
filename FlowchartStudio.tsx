import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowDown, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Edit3, 
  Clock, 
  Workflow, 
  Sparkles, 
  Download, 
  Check, 
  RefreshCw,
  Layers,
  HelpCircle
} from 'lucide-react';
import { InfographicData, InfographicStep } from './types';

interface FlowchartEditorProps {
  data: InfographicData | string;
  onChange: (newData: InfographicData) => void;
}

// Helper to ensure data is parsed safely
const ensureInfographicData = (data: any): InfographicData => {
  if (!data) {
    return {
      title: "فرآیند تولید محتوای هوشمند",
      steps: []
    };
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.steps)) {
        return parsed;
      }
    } catch (e) {
      // Fallback: build steps from lines
      const steps = data.split('\n').filter(line => line.trim().length > 0).map((line, idx) => ({
        id: `step-${idx}`,
        phase: `مرحله ${idx + 1}`,
        title: line.substring(0, 30),
        description: line,
        duration: 'سریع',
        icon: '⚡'
      }));
      return {
        title: "فرآیند تولید محتوای بازنویسی شده",
        steps
      };
    }
  }
  if (data && typeof data === 'object' && Array.isArray(data.steps)) {
    return data;
  }
  return {
    title: "فرآیند تولید محتوای هوشمند",
    steps: []
  };
};

export const FlowchartEditor: React.FC<FlowchartEditorProps> = ({ data, onChange }) => {
  const currentData = ensureInfographicData(data);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const updateTitle = (newTitle: string) => {
    onChange({
      ...currentData,
      title: newTitle
    });
  };

  const updateStepField = (id: string, field: keyof InfographicStep, value: string) => {
    const updatedSteps = currentData.steps.map(step => {
      if (step.id === id) {
        return { ...step, [field]: value };
      }
      return step;
    });
    onChange({
      ...currentData,
      steps: updatedSteps
    });
  };

  const addStep = (index?: number) => {
    const newStep: InfographicStep = {
      id: `step-${Date.now()}`,
      phase: `مرحله ${currentData.steps.length + 1}`,
      title: "گام جدید فرآیند",
      description: "جزئیات اقدامات این مرحله در اینجا قرار می‌گیرد.",
      duration: "۱ ساعت",
      icon: "🎯"
    };

    let updatedSteps = [...currentData.steps];
    if (typeof index === 'number') {
      updatedSteps.splice(index + 1, 0, newStep);
    } else {
      updatedSteps.push(newStep);
    }

    // Refresh phase labels logically
    updatedSteps = updatedSteps.map((step, idx) => ({
      ...step,
      phase: `مرحله ${idx + 1}`
    }));

    onChange({
      ...currentData,
      steps: updatedSteps
    });
    setActiveStepId(newStep.id);
  };

  const deleteStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updatedSteps = currentData.steps.filter(step => step.id !== id);
    // Refresh phase labels logically
    updatedSteps = updatedSteps.map((step, idx) => ({
      ...step,
      phase: `مرحله ${idx + 1}`
    }));
    onChange({
      ...currentData,
      steps: updatedSteps
    });
    if (activeStepId === id) setActiveStepId(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentData.steps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    let updatedSteps = [...currentData.steps];
    
    // Swap
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[targetIndex];
    updatedSteps[targetIndex] = temp;

    // Refresh phase labels logically
    updatedSteps = updatedSteps.map((step, idx) => ({
      ...step,
      phase: `مرحله ${idx + 1}`
    }));

    onChange({
      ...currentData,
      steps: updatedSteps
    });
  };

  return (
    <div className="bg-[#051a1d]/60 border border-white/5 rounded-[2.5rem] p-6 lg:p-8 backdrop-blur-md shadow-2xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-xl">
            <Workflow size={24} />
          </div>
          <div>
            <h4 className="text-lg font-black text-white">ویرایشگر نمودار درختی و فرآیندی (Flowchart Builder)</h4>
            <p className="text-xs text-slate-400">به‌صورت مرحله‌به‌مرحله مراحل تولید یا انتقال پیام را شخصی‌سازی کنید.</p>
          </div>
        </div>
        <button 
          onClick={() => addStep()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/20 transition-all self-stretch sm:self-auto justify-center"
        >
          <Plus size={16} />
          <span>افزودن گام جدید</span>
        </button>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-black text-amber-500 uppercase tracking-widest mr-2">عنوان کل فرآيند اینفوگرافی</label>
        <input 
          type="text"
          value={currentData.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="w-full bg-black/40 border-2 border-white/5 text-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-amber-500 font-bold text-lg transition-all"
          placeholder="مثلاً: بوم فرآیند بازاریابی و تولید محتوا"
        />
      </div>

      {/* Steps List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
        {currentData.steps.length === 0 ? (
          <div className="text-center py-12 bg-black/20 border border-dashed border-white/5 rounded-2xl">
            <HelpCircle className="mx-auto text-slate-600 mb-3" size={32} />
            <p className="text-sm text-slate-500">هیچ مرحله‌ای ایجاد نشده است. روی دکمه افزودن کلیک کنید.</p>
          </div>
        ) : (
          currentData.steps.map((step, idx) => {
            const isActive = activeStepId === step.id;
            return (
              <div 
                key={step.id}
                className={`border rounded-3xl transition-all duration-300 overflow-hidden ${isActive ? 'bg-[#0a2528]/80 border-emerald-500/40 shadow-xl' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
              >
                {/* Header Row */}
                <div 
                  onClick={() => setActiveStepId(isActive ? null : step.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                      {step.icon || '🎯'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
                          {step.phase}
                        </span>
                        {step.duration && (
                          <span className="text-[9px] text-slate-500 flex items-center gap-0.5 font-bold">
                            <Clock size={10} />
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-slate-200 mt-1">{step.title}</h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ordering Controls */}
                    <button 
                      disabled={idx === 0}
                      onClick={(e) => moveStep(idx, 'up', e)}
                      className="p-1 px-1.5 bg-white/5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button 
                      disabled={idx === currentData.steps.length - 1}
                      onClick={(e) => moveStep(idx, 'down', e)}
                      className="p-1 px-1.5 bg-white/5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button 
                      onClick={(e) => deleteStep(step.id, e)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Edit Form Body */}
                {isActive && (
                  <div className="p-6 pt-0 border-t border-white/5 bg-black/30 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">نشانگر روند</label>
                          <input 
                            value={step.phase} 
                            onChange={(e) => updateStepField(step.id, 'phase', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">آیکون</label>
                            <input 
                              value={step.icon || '🎯'} 
                              onChange={(e) => updateStepField(step.id, 'icon', e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-center text-white"
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400">مدت زمان/ارزش</label>
                            <input 
                              value={step.duration || ''} 
                              onChange={(e) => updateStepField(step.id, 'duration', e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                              placeholder="مثلاً: ۲ ساعت"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">عنوان مرحله</label>
                        <input 
                          value={step.title} 
                          onChange={(e) => updateStepField(step.id, 'title', e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 mt-4">
                      <label className="text-[10px] font-bold text-slate-400">توضیحات و فرآیند تفصیلی</label>
                      <textarea 
                        value={step.description} 
                        onChange={(e) => updateStepField(step.id, 'description', e.target.value)}
                        rows={4}
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs leading-relaxed text-slate-300 resize-none"
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => addStep(idx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black rounded-lg border border-emerald-500/10"
                      >
                        <Plus size={12} />
                        <span>افزودن گام بعد از این</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};


interface FlowchartViewerProps {
  data: InfographicData | string;
  onEditRequest?: () => void;
}

export const FlowchartViewer: React.FC<FlowchartViewerProps> = ({ data, onEditRequest }) => {
  const currentData = ensureInfographicData(data);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(currentData.steps[0]?.id || null);

  const selectedStep = currentData.steps.find(s => s.id === selectedStepId) || currentData.steps[0];

  const [showHtmlCode, setShowHtmlCode] = useState<string | null>(null);

  const triggerPrint = () => {
    window.print();
    alert('اگر افزونه مسدودکننده پنجره فعال است یا در محیط نمایشی هستید، چاپ مستقیم کار نمی‌کند.');
  };

  const copyTimelineAsText = () => {
    let output = `📊 ${currentData.title || 'فرآیند تولید محتوا'}\n\n`;
    currentData.steps.forEach((step, idx) => {
      output += `[${step.phase}] ${step.title}\n`;
      if (step.duration) output += `⏱️ زمان یا ارزش: ${step.duration}\n`;
      output += `📝 شرح اقدامات: ${step.description}\n\n`;
    });
    navigator.clipboard.writeText(output);
    alert('سند فرآیند متنی با موفقیت در حافظه موقت کپی شد!');
  };

  const downloadInteractiveHTML = () => {
    const stepsHtml = currentData.steps.map((step, idx) => `
      <div 
        id="card-${step.id}"
        onclick="selectStep('${step.id}')"
        class="step-card flex items-start gap-4 p-5 rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-300"
      >
        <div class="flex-shrink-0 w-12 h-12 bg-black/40 text-emerald-400 text-xl border border-white/5 rounded-xl flex items-center justify-center">
          ${step.icon || '🎯'}
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">${step.phase}</span>
            ${step.duration ? `<span class="text-[9px] text-slate-500 font-medium">${step.duration}</span>` : ''}
          </div>
          <h4 class="font-bold text-slate-200 mt-1 text-sm">${step.title}</h4>
        </div>
      </div>
    `).join('');

    const stepsDataJson = JSON.stringify(currentData.steps);

    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${currentData.title || "نمودار فرآیند اختصاصی"}</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
    </style>
</head>
<body class="bg-[#020d0f] text-slate-100 min-h-screen p-4 md:p-8">
    <div class="max-w-6xl mx-auto bg-[#041d20] border border-emerald-500/15 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden my-6">
        <div class="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/5 mb-8 relative z-10">
            <div>
                <span class="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">Logical Flowchart</span>
                <h1 class="text-2xl md:text-3xl font-black text-white mt-2">${currentData.title}</h1>
            </div>
            <button onclick="window.print()" class="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-teal-950 font-black rounded-xl text-xs shadow-lg transition-all">چاپ مستقیم این صفحه</button>
        </div>

        <!-- Content -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            <!-- Timeline List -->
            <div class="lg:col-span-7 space-y-4 max-h-[600px] overflow-y-auto pr-2">
                ${stepsHtml}
            </div>

            <!-- Spotlight Pane -->
            <div class="lg:col-span-5">
                <div class="bg-gradient-to-b from-[#092e32] to-[#041a1c] border border-emerald-500/20 rounded-[2rem] p-6 space-y-6 shadow-xl relative min-h-[350px]">
                    <div class="flex justify-between items-center pb-3 border-b border-teal-500/10">
                        <span class="text-[10px] font-bold text-amber-500">جزییات گام فعال</span>
                        <span id="spotlight-phase" class="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full font-bold"></span>
                    </div>

                    <div class="flex items-center gap-4">
                        <div id="spotlight-icon-box" class="w-14 h-14 bg-gradient-to-tr from-amber-500 to-amber-600 text-teal-950 rounded-xl flex items-center justify-center text-3xl shadow-lg"></div>
                        <div>
                            <h3 id="spotlight-title" class="text-xl font-black text-white"></h3>
                            <p id="spotlight-duration" class="text-xs text-slate-400 mt-1"></p>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">شرح تفصیلی عملیات:</span>
                        <div id="spotlight-description" class="bg-black/40 p-4 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const steps = ${stepsDataJson};
        let activeId = steps[0]?.id;

        function selectStep(id) {
            activeId = id;
            steps.forEach(s => {
                const card = document.getElementById('card-' + s.id);
                if (card) {
                    if (s.id === id) {
                        card.classList.add('bg-[#0a2e31]', 'border-emerald-500/40', 'translate-x-2');
                        card.classList.remove('bg-white/5', 'border-white/5');
                    } else {
                        card.classList.remove('bg-[#0a2e31]', 'border-emerald-500/40', 'translate-x-2');
                        card.classList.add('bg-white/5', 'border-white/5');
                    }
                }
            });

            const step = steps.find(s => s.id === id);
            if (step) {
                document.getElementById('spotlight-phase').innerText = step.phase;
                document.getElementById('spotlight-icon-box').innerText = step.icon || '🎯';
                document.getElementById('spotlight-title').innerText = step.title;
                document.getElementById('spotlight-duration').innerHTML = step.duration ? 'زمان تخمینی یا ارزش: <strong>' + step.duration + '</strong>' : '';
                document.getElementById('spotlight-description').innerText = step.description;
            }
        }

        if (steps.length > 0) {
            selectStep(steps[0].id);
        }
    </script>
</body>
</html>`;

    // Attempt to download, but also show HTML code block for copying if it fails/blocked
    try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flowchart-${Date.now()}.html`;
        link.click();
        URL.revokeObjectURL(url);
    } catch(e) {
        console.error(e);
    }
    
    // Always provide the fallback modal, as click() silently fails in sandboxed iframes
    setShowHtmlCode(htmlContent);
  };

  return (
    <div className="bg-gradient-to-tr from-[#02181b]/95 via-[#03252a]/95 to-[#01090a]/95 border-2 border-emerald-500/20 rounded-[3.5rem] p-8 lg:p-12 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.7)] space-y-12 relative overflow-hidden ring-1 ring-white/5" id="flowchart-viewer-container">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/5 via-transparent to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-white/10 relative z-10 font-[Vazirmatn]">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400/20 to-teal-400/40 text-emerald-300 border-2 border-emerald-400/30 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/20 animate-pulse">
            📊
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
              Strategic Blueprint
            </span>
            <h3 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-400 mt-2">{currentData.title || "لوپ تولید و عرضه محتوا"}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto">
          {onEditRequest && (
            <button 
              onClick={onEditRequest}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all"
            >
              <Edit3 size={14} />
              <span>ویرایش فرآیند</span>
            </button>
          )}
          <button 
            onClick={copyTimelineAsText}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/25 text-xs font-bold transition-all"
          >
            <span>کپی متن فرآیند</span>
          </button>
          <button 
            onClick={downloadInteractiveHTML}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-teal-950 text-xs font-black shadow-lg shadow-amber-500/10 transition-all"
          >
            <Download size={14} />
            <span>دانلود وب تعاملی</span>
          </button>
          <button 
            onClick={triggerPrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
          >
            <span>پرینت عریض</span>
          </button>
        </div>
      </div>

      {/* Main Flow Layout - Serpentine/Timeline View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
        
        {/* Left column: SVG Serpentine Timeline Diagram */}
        <div className="lg:col-span-7 space-y-12 relative">
          
          {/* Timeline background connection pipe */}
          <div className="absolute right-10 top-16 bottom-16 w-1 bg-gradient-to-b from-emerald-500/40 via-teal-500/10 to-amber-500/40 rounded-full hidden sm:block">
            {/* Pulsing indicator dots */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-teal-950 animate-ping"></div>
            <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-500 rounded-full border-4 border-teal-950 animate-ping delay-500"></div>
          </div>

          <div className="space-y-8 relative">
            {currentData.steps.map((step, idx) => {
              const isSelected = selectedStepId === step.id;
              
              return (
                <div 
                  key={step.id}
                  onClick={() => setSelectedStepId(step.id)}
                  className={`group relative flex items-start gap-6 cursor-pointer sm:mr-3 transition-all duration-500 ${isSelected ? 'translate-x-[6px]' : 'hover:-translate-x-[2px]'}`}
                >
                  {/* Step Connector Node (Absolute-ish on Left for Persian RTL) */}
                  <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl transition-all duration-500 ${
                      isSelected 
                        ? 'bg-amber-500 text-teal-950 border-amber-400 scale-110 rotate-3 shadow-2xl shadow-amber-500/20' 
                        : 'bg-[#092528] text-teal-400 border-white/5 hover:border-white/15'
                    }`}>
                      {step.icon || '🎯'}
                    </div>
                    {idx < currentData.steps.length - 1 && (
                      <div className="w-0.5 h-12 bg-dashed border-r border-teal-500/10 sm:hidden mt-2"></div>
                    )}
                  </div>

                  {/* Node Content Card */}
                  <div className={`flex-1 p-8 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden ${
                    isSelected 
                      ? 'bg-gradient-to-br from-[#0c3a3e]/90 to-[#062124]/90 border-emerald-500/40 shadow-[0_20px_60px_rgba(4,24,28,0.8)] ring-1 ring-emerald-500/20' 
                      : 'bg-black/30 border-white/5 hover:border-emerald-500/20 hover:bg-[#072023]/60'
                  }`}>
                    {isSelected && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none"></div>}
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-full ${
                          isSelected ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-slate-400 border border-white/5'
                        }`}>
                          {step.phase}
                        </span>
                        {step.duration && (
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                            <Clock size={12} className="text-teal-500" />
                            {step.duration}
                          </span>
                        )}
                      </div>
                      
                      {isSelected && (
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                      )}
                    </div>

                    <h4 className={`text-xl font-black relative z-10 transition-colors ${
                      isSelected ? 'text-white text-2xl' : 'text-slate-300'
                    }`}>
                      {step.title}
                    </h4>

                    <p className="text-sm text-slate-400 leading-relaxed mt-3 relative z-10 font-medium">
                      {step.description}
                    </p>

                    {/* SVG Connector Line to the next card (curved path only on desktop when alternating) */}
                    {idx < currentData.steps.length - 1 && (
                      <div className="absolute -bottom-10 left-12 text-slate-600 animate-bounce cursor-pointer opacity-40 group-hover:opacity-100 transition-opacity hidden sm:block">
                        <ArrowDown size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Step Interactive Spotlight */}
        <div className="lg:col-span-5 self-start">
          <div className="sticky top-32 bg-gradient-to-b from-[#092e32] to-[#041a1c] border border-emerald-500/20 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden">
            {/* Visual shine */}
            <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-center pb-4 border-b border-teal-500/10">
              <span className="text-[10px] font-black text-amber-500 flex items-center gap-1 uppercase tracking-wider">
                <Sparkles size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
                جزییات گام فعال
              </span>
              <span className="text-[10px] px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full font-black">
                {selectedStep?.phase || 'مرحله نهایی'}
              </span>
            </div>

            {selectedStep ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 text-teal-950 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-amber-500/10">
                    {selectedStep.icon || '🎯'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedStep.title}</h3>
                    {selectedStep.duration && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Clock size={12} />
                        زمان تخمینی یا ارزش این مرحله: <strong>{selectedStep.duration}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">شرح تفصیلی عملیات:</span>
                  <div className="bg-black/40 p-6 rounded-2xl border border-white/5 text-sm text-slate-300 leading-relaxed max-h-[250px] overflow-y-auto whitespace-pre-wrap">
                    {selectedStep.description}
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Check size={16} />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">به تکمیل این مرحله گام بعدی به‌صورت سیستماتیک و زنجیره‌ای فعال می‌شود.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p>روی یکی از مراحل فرآیند کلیک کنید تا اطلاعات آن در این پنجره نمایش داده شود.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Legend / Flow explanation banner at the bottom */}
      <div className="bg-black/30 p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-3">
          <Layers className="text-emerald-400 flex-shrink-0" size={20} />
          <div>
            <h5 className="text-sm font-black text-white">سازماندهی هوشمند فرآیند تولید محتوا</h5>
            <p className="text-xs text-slate-400 mt-1">گذردهی منطقی از ایده‌پردازی به تولید دارایی، تدوین صوتی-تصویری، به ردیابی و انتشار نهایی.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-[9px] font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-slate-400">۱. تحقیق و سناریو</span>
          <span className="text-[9px] font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-slate-400">۲. آماده‌سازی مدیا</span>
          <span className="text-[9px] font-bold bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-slate-400">۳. تدوین نهایی و تست</span>
        </div>
      </div>

      {showHtmlCode && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#041a1c] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-white/5 bg-black/40">
                    <div>
                        <h3 className="font-bold text-white text-lg">کد فایل اینفوگرافیک</h3>
                        <p className="text-xs text-slate-400 mt-1">پیش‌نمایش امنیتی ممکن است مانع دانلود شود. می‌توانید این کد HTML را کپی کرده و در یک فایل متنی با پسوند `.html` ذخیره کنید.</p>
                    </div>
                    <button onClick={() => setShowHtmlCode(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors">✕</button>
                </div>
                <div className="p-4 sm:p-6 bg-black/60 relative">
                    <textarea 
                        readOnly 
                        value={showHtmlCode} 
                        className="w-full h-64 sm:h-80 bg-[#020a0b] text-teal-400 text-xs font-mono p-4 border border-white/5 rounded-xl outline-none resize-none"
                    />
                </div>
                <div className="p-4 sm:p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3">
                    <button onClick={() => setShowHtmlCode(null)} className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">بستن</button>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(showHtmlCode); alert('کد HTML کپی شد!'); }} 
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-teal-950 hover:bg-amber-400 transition-colors flex items-center gap-2"
                    >
                        <span>کپی کد کامل صفحه HTML</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
