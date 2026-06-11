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

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#041d20]/90 border border-emerald-500/15 rounded-[3.5rem] p-8 lg:p-12 backdrop-blur-2xl shadow-3xl space-y-12 relative overflow-hidden" id="flowchart-viewer-container">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500/10 to-teal-500/30 text-emerald-400 border border-emerald-500/25 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-emerald-950/45 animate-pulse">
            📊
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              Logical Flowchart
            </span>
            <h3 className="text-2xl lg:text-3xl font-black text-white mt-1.5">{currentData.title || "لوپ تولید و عرضه محتوا"}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto">
          {onEditRequest && (
            <button 
              onClick={onEditRequest}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all"
            >
              <Edit3 size={14} />
              <span>ویرایش فرآیند</span>
            </button>
          )}
          <button 
            onClick={triggerPrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-teal-950 text-xs font-black shadow-lg shadow-amber-500/10 transition-all"
          >
            <Download size={14} />
            <span>چاپ عریض یا ذخیره</span>
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
                  <div className={`flex-1 p-6 rounded-[2rem] border transition-all duration-500 relative ${
                    isSelected 
                      ? 'bg-[#0a2e31]/90 border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)]' 
                      : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30'
                  }`}>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                          isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-500'
                        }`}>
                          {step.phase}
                        </span>
                        {step.duration && (
                          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md">
                            <Clock size={10} />
                            {step.duration}
                          </span>
                        )}
                      </div>
                      
                      {isSelected && (
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                      )}
                    </div>

                    <h4 className={`text-base font-black transition-colors ${
                      isSelected ? 'text-white text-lg' : 'text-slate-300'
                    }`}>
                      {step.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-2 md:line-clamp-3">
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
    </div>
  );
};
