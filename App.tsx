
import React, { useState, useEffect, useRef } from 'react';
import { generateStrategicPlan, generateMediaAssets, refineContent } from './geminiService';
import { ProjectPreferences, ContentProject } from './types';
import { FlowchartEditor, FlowchartViewer } from './FlowchartStudio';
import VoiceAssistant from './src/VoiceAssistant';
import { auth, db } from './src/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';

// --- Error Handler Helper for Rules ---
enum OperationType { CREATE='create', UPDATE='update', DELETE='delete', LIST='list', GET='get', WRITE='write' };
interface FirestoreErrorInfo { error: string; operationType: OperationType; path: string | null; authInfo: any; }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId: auth.currentUser?.uid },
    operationType, path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


// --- UI Components ---

const LoadingOverlay = ({ visible, message }: { visible: boolean, message: string }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-[#020d0f]/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 border-4 border-teal-500/10 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-t-teal-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin reverse duration-1000"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full animate-pulse flex items-center justify-center text-3xl">✨</div>
        </div>
      </div>
      <h3 className="text-2xl font-black text-white mb-3 tracking-tight text-center px-6 leading-relaxed max-w-md">{message}</h3>
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce"></div>
        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce delay-100"></div>
        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );
};

const ActionButton = ({ onClick, icon, label, variant = 'secondary', loading = false, disabled = false, className = "" }: any) => {
  const baseClass = "flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants: any = {
    primary: "bg-amber-500 text-teal-950 hover:bg-amber-400 shadow-xl shadow-amber-500/20",
    secondary: "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10",
    refine: "bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
  };

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${baseClass} ${variants[variant]} ${className}`}>
      {loading ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : icon}
      <span>{label}</span>
    </button>
  );
};

const SectionHeading = ({ title, icon, color = "amber", sub }: any) => {
  const colors: any = {
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    teal: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    indigo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
  };
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-black text-white">{title}</h3>
        {sub && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{sub}</p>}
      </div>
    </div>
  );
};

const ToggleCard = ({ label, checked, onChange, icon, children, description }: any) => (
  <div className="space-y-5">
    <div 
      onClick={() => onChange(!checked)} 
      className={`cursor-pointer rounded-[2.5rem] p-6 border transition-all duration-500 flex items-center gap-6 group relative overflow-hidden ${checked ? 'bg-[#0f3d3e]/40 border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-[#051e22]/30 border-white/5 hover:border-white/10'}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 ${checked ? 'bg-amber-500 text-teal-950 scale-110 shadow-lg' : 'bg-[#0a282b] text-teal-600/70'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className={`font-black text-lg ${checked ? 'text-amber-50' : 'text-slate-400'}`}>{label}</h4>
        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{description}</p>
      </div>
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'border-amber-400 bg-amber-400 scale-100' : 'border-slate-700 scale-90'}`}>
        {checked && <svg className="w-5 h-5 text-teal-900 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
      </div>
    </div>
    {checked && children && (
      <div className="mr-8 pl-6 border-r-2 border-amber-500/20 animate-in fade-in slide-in-from-top-4 duration-500 pb-2">
        {children}
      </div>
    )}
  </div>
);

const AudioWaveform = ({ src }: { src: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };
  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center gap-6 shadow-xl backdrop-blur-md">
      <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} className="hidden" />
      <button onClick={togglePlay} className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center text-teal-950 shadow-2xl hover:scale-110 transition-transform group">
        {isPlaying ? (
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        ) : (
          <svg className="w-8 h-8 fill-current translate-x-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>
      <div className="flex items-end gap-1.5 h-12 w-full max-w-xs justify-center">
        {[...Array(24)].map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-amber-400' : 'bg-teal-800/40'}`} 
            style={{ 
                height: isPlaying ? `${20 + Math.random() * 80}%` : '20%',
                animation: isPlaying ? `bounce 1s infinite alternate ${i * 0.05}s` : 'none'
            }} 
          />
        ))}
      </div>
    </div>
  );
};

const EditableArea = ({ label, value, onChange, onRefine, refineLoading, rows = 4, helpText, icon }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className={`group relative bg-[#051a1d]/60 border rounded-[2.5rem] p-6 lg:p-8 transition-all duration-500 shadow-2xl backdrop-blur-md ${isFocused ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-white/5 hover:border-white/10'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${isFocused ? 'bg-amber-500 text-teal-950 border-amber-500' : 'bg-white/5 text-slate-400 border-white/10'}`}>
            {icon || "📝"}
          </div>
          <div>
            <label className="block text-xs font-black text-amber-500/90 uppercase tracking-wider">{label}</label>
            {helpText && <p className="text-[10px] text-teal-300/40 mt-0.5">{helpText}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onRefine && (
            <ActionButton 
              onClick={onRefine} 
              loading={refineLoading} 
              label="بهبود هوشمند" 
              variant="refine" 
              icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} 
            />
          )}
          <ActionButton 
            onClick={() => { navigator.clipboard.writeText(value); alert('کپی شد!'); }} 
            label="کپی" 
            variant="secondary" 
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>} 
          />
        </div>
      </div>
      <div className="relative">
        <textarea 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={rows}
          className="w-full bg-transparent text-slate-200 text-base lg:text-lg leading-relaxed outline-none resize-none scrollbar-hide border-none p-0 focus:ring-0 font-medium placeholder-white/10"
        />
      </div>
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [refineLoading, setRefineLoading] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [prefs, setPrefs] = useState<ProjectPreferences>({
    topic: '', targetAudience: '', platform: 'Instagram', needsScript: true, needsCaption: true, needsAudio: true, needsBackgroundMusic: false, audioGender: 'Male', audioTone: 'Energetic',
    needsImage: true, imageCount: 4, imageStyle: 'Cinematic', customImageDescription: '', needsInfographic: false, infographicLanguage: 'Persian',
    needsVideo: true, videoEngine: 'stock', videoStyle: 'Cinematic', videoDuration: 'Short (15s)'
  });
  const [projectData, setProjectData] = useState<any>(null);
  const [assets, setAssets] = useState<ContentProject['assets']>({ images: [], videoStatus: 'idle', audioStatus: 'idle', imageStatus: 'idle', infographicStatus: 'idle' });
  const [infographicTab, setInfographicTab] = useState<'interactive' | 'poster'>('interactive');

  const [toast, setToast] = useState<{ text: string, type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const login = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { showToast('Login failed', 'error'); }
  };
  
  const saveProject = async () => {
    if (!user) return showToast('ابتدا وارد شوید', 'error');
    if (!projectData) return;
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        userId: user.uid,
        topic: prefs.topic,
        projectData,
        createdAt: serverTimestamp()
      });
      showToast('پروژه ذخیره شد', 'success');
    } catch(e) {
      handleFirestoreError(e, OperationType.CREATE, 'projects');
    }
  };

  useEffect(() => {
    // @ts-ignore
    if (window.aistudio) window.aistudio.hasSelectedApiKey().then(setHasKey);
  }, []);

  const handleGoHome = () => {
    if (step === 1) return;
    if (confirm('آیا می‌خواهید از این پروژه انصراف دهید؟')) {
        setStep(1);
        setProjectData(null);
        setAssets({ images: [], videoStatus: 'idle', audioStatus: 'idle', imageStatus: 'idle', infographicStatus: 'idle' });
    }
  };

  const handleNewProject = () => {
    setStep(1);
    setProjectData(null);
    setAssets({ images: [], videoStatus: 'idle', audioStatus: 'idle', imageStatus: 'idle', infographicStatus: 'idle' });
  };

  const handleGenerateStrategy = async () => {
    if (!prefs.topic) {
        showToast("لطفاً موضوع محتوا را مشخص کنید.", 'warning');
        return;
    }
    setLoading(true);
    setLoadingMsg("تیم خلاقیت ما در حال ایده‌پردازی و تدوین استراتژی برای موضوع شماست...");
    setError(null);
    try {
      const data = await generateStrategicPlan(prefs);
      if (!data || !data.topic) {
        throw new Error("داده‌های دریافت شده معتبر نیستند.");
      }
      setProjectData(data);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { 
        console.error(e);
        setError("متأسفانه خطایی در تولید استراتژی رخ داد. لطفاً دوباره تلاش کنید."); 
    }
    finally { setLoading(false); }
  };

  const handleRefine = async (field: 'script' | 'caption' | 'audio') => {
    if (!projectData) return;
    setRefineLoading(prev => ({...prev, [field]: true}));
    try {
        const currentText = field === 'script' ? projectData.script : (field === 'caption' ? projectData.caption : projectData.audioScript);
        const improved = await refineContent(currentText, field, prefs.topic);
        if (!improved) throw new Error("محتوای بهینه‌شده خالی است.");
        setProjectData(prev => prev ? ({
            ...prev,
            [field === 'script' ? 'script' : (field === 'caption' ? 'caption' : 'audioScript')]: improved
        }) : null);
        showToast("متن با موفقیت بهینه شد.", 'success');
    } catch (e) {
        console.error(e);
        showToast("خطا در بهینه‌سازی متن. لطفاً دوباره تلاش کنید.", 'error');
    } finally { setRefineLoading(prev => ({...prev, [field]: false})); }
  };

  const handleStartProduction = async () => {
    if (prefs.needsVideo && prefs.videoEngine === 'veo' && !hasKey) {
        // @ts-ignore
        if (window.aistudio) await window.aistudio.openSelectKey();
        return;
    }
    setLoading(true);
    setLoadingMsg("در حال تولید مدیا نهایی؛ این فرآیند ممکن است چند دقیقه طول بکشد...");
    try {
      const generatedAssets = await generateMediaAssets(projectData, prefs);
      setAssets(generatedAssets);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setStep(3); setError("برخی از فایل‌ها تولید نشدند."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020d0f] text-slate-100 font-['Vazirmatn'] selection:bg-amber-500/20" dir="rtl">
      <LoadingOverlay visible={loading} message={loadingMsg} />
      
      <nav className="fixed top-0 w-full z-50 bg-[#020d0f]/80 backdrop-blur-xl border-b border-white/5 h-20 sm:h-24 flex items-center justify-between px-4 sm:px-12 font-[Vazirmatn]">
        <div className="flex items-center gap-4 sm:gap-5 cursor-pointer group" onClick={handleGoHome}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-teal-950 text-lg sm:text-xl shadow-xl shadow-amber-500/10 group-hover:scale-105 transition-transform">G</div>
          <div className="hidden md:block">
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Genius Studio</h1>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">AI Content Hub</p>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center gap-2 sm:gap-6 bg-white/5 px-4 sm:px-6 py-2 rounded-2xl border border-white/5">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-amber-400' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'}`}>1</div>
            <span className="text-[10px] font-bold hidden sm:block">تنظیمات</span>
          </div>
          <div className={`w-4 h-0.5 ${step >= 2 ? 'bg-amber-500/50' : 'bg-white/10'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'}`}>2</div>
            <span className="text-[10px] font-bold hidden sm:block">استراتژی</span>
          </div>
          <div className={`w-4 h-0.5 ${step >= 3 ? 'bg-amber-500/50' : 'bg-white/10'}`} />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 3 ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5'}`}>3</div>
            <span className="text-[10px] font-bold hidden sm:block">خروجی</span>
          </div>
        </div>

        {step > 1 ? (
          <div className="flex items-center gap-3">
            <button onClick={saveProject} className="hidden sm:flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-indigo-500/30 font-black text-xs hover:bg-indigo-500/30 transition-colors">
              <span>ذخیره پروژه</span>
            </button>
            <button onClick={handleNewProject} className="flex items-center gap-2 bg-emerald-500 text-emerald-950 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
              <span className="text-lg">+</span>
              <span className="hidden sm:inline">پروژه جدید</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
             {user ? (
               <button onClick={() => signOut(auth)} className="flex items-center gap-2 bg-white/5 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10">خروج</button>
             ) : (
               <button onClick={login} className="flex items-center gap-2 bg-[#4285F4] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#3367D6]">ورود با گوگل</button>
             )}
          </div>
        )}
      </nav>

      <main className="relative z-10 pt-36 pb-24 px-4 sm:px-8 max-w-[1400px] mx-auto">
        
        {/* STEP 1: CONFIGURATION (COMMAND CENTER) */}
        {step === 1 && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-6">
                <h2 className="text-5xl lg:text-7xl font-black text-white leading-tight">استودیو <span className="text-amber-500">فوق هوشمند</span> محتوا</h2>
                <p className="text-teal-200/40 text-xl max-w-3xl mx-auto font-medium leading-relaxed">یک موضوع بدهید، تمام دارایی‌های محتوایی (سناریو، تصویر، صدا، ویدیو و اینفوگرافی) را در چند ثانیه تحویل بگیرید.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* LEFT: MAIN INPUTS */}
              <div className="lg:col-span-8 space-y-10">
                <div className="bg-[#051a1d]/60 border border-white/5 rounded-[3rem] p-8 lg:p-12 space-y-10 backdrop-blur-xl shadow-2xl">
                    <SectionHeading title="اطلاعات پایه محتوا" icon="📋" color="amber" sub="Topic & Context" />
                    
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest mr-2">موضوع اصلی (Topic)</label>
                            <input 
                                value={prefs.topic} 
                                onChange={e => setPrefs({...prefs, topic: e.target.value})} 
                                className="w-full bg-black/40 border-2 border-white/5 rounded-3xl px-8 py-6 text-2xl lg:text-3xl font-black outline-none focus:border-amber-500 transition-all text-white placeholder:text-white/5" 
                                placeholder="مثلاً: تکنولوژی‌های سال ۲۰۲۵" 
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest mr-2">توضیح کوتاه یا مخاطب هدف (Optional Context)</label>
                            <textarea 
                                value={prefs.targetAudience} 
                                onChange={e => setPrefs({...prefs, targetAudience: e.target.value})} 
                                className="w-full bg-black/40 border-2 border-white/5 rounded-3xl px-8 py-5 text-lg font-medium outline-none focus:border-amber-500 transition-all text-white placeholder:text-white/5 resize-none" 
                                placeholder="مثلاً: برای دانشجویان علاقه‌مند به هوش مصنوعی"
                                rows={3}
                            />
                        </div>

                        <div className="pt-6 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest mr-2">پلتفرم انتشار</label>
                                <select value={prefs.platform} onChange={e => setPrefs({...prefs, platform: e.target.value as any})} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:border-teal-500">
                                    {['Instagram', 'YouTube', 'TikTok', 'LinkedIn', 'Twitter'].map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-teal-500 uppercase tracking-widest mr-2">سبک بصری تصاویر</label>
                                <select value={prefs.imageStyle} onChange={e => setPrefs({...prefs, imageStyle: e.target.value as any})} className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white outline-none focus:border-teal-500">
                                    {['Cinematic', 'Minimalist', 'Fantasy', 'Photorealistic', 'Anime', '3D Render'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AUDIO SECTION */}
                <div className="bg-[#051a1d]/60 border border-white/5 rounded-[3rem] p-8 lg:p-12 backdrop-blur-xl shadow-2xl">
                    <SectionHeading title="استودیو صدا و نریشن" icon="🎙️" color="teal" sub="Voice & Music" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ToggleCard label="نریشن صوتی (Voiceover)" icon="🗣️" description="تبدیل سناریو به پادکست یا دکلمه" checked={prefs.needsAudio} onChange={v => setPrefs({...prefs, needsAudio: v})}>
                            <div className="grid grid-cols-1 gap-4 mt-2">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-teal-500 uppercase">جنسیت و گوینده</span>
                                    <select value={prefs.audioGender} onChange={e => setPrefs({...prefs, audioGender: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        <option value="Male">آقا (Kore)</option>
                                        <option value="Female">خانم (Puck)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-teal-500 uppercase">لحن و حس</span>
                                    <select value={prefs.audioTone} onChange={e => setPrefs({...prefs, audioTone: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        {['Energetic', 'Calm', 'Emotional', 'Epic', 'Friendly', 'Corporate'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </ToggleCard>
                        <ToggleCard label="موسیقی پس‌زمینه" icon="🎵" description="پیشنهاد هوشمند سبک موسیقی" checked={prefs.needsBackgroundMusic} onChange={v => setPrefs({...prefs, needsBackgroundMusic: v})} />
                    </div>
                </div>
              </div>

              {/* RIGHT: SECONDARY INPUTS */}
              <div className="lg:col-span-4 space-y-10">
                 {/* VISUALS SECTION */}
                 <div className="bg-[#051a1d]/60 border border-white/5 rounded-[3rem] p-8 backdrop-blur-xl shadow-2xl h-full flex flex-col">
                    <SectionHeading title="بخش بصری و مدیا" icon="🖼️" color="indigo" sub="Video & Images" />
                    
                    <div className="flex-1 space-y-6">
                        <ToggleCard label="تولید تصاویر" icon="🎨" description="تولید استوری‌برد محتوا" checked={prefs.needsImage} onChange={v => setPrefs({...prefs, needsImage: v})}>
                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-center text-[10px] font-black text-indigo-400">
                                    <span>تعداد فریم:</span>
                                    <span>{prefs.imageCount} تصویر</span>
                                </div>
                                <input type="range" min="1" max="12" value={prefs.imageCount} onChange={e => setPrefs({...prefs, imageCount: parseInt(e.target.value)})} className="w-full h-1.5 bg-black/40 rounded-full appearance-none accent-amber-500 cursor-pointer" />
                            </div>
                        </ToggleCard>

                        <ToggleCard label="فیلم و ویدیوی تیزر" icon="📹" description="تولید تیزر متحرک طبق موضوع انتخابی" checked={prefs.needsVideo} onChange={v => setPrefs({...prefs, needsVideo: v})}>
                            <div className="space-y-4 pt-2 font-[Vazirmatn]">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">موتور پخش ویدیو (فرمت MP4)</span>
                                    <select value={prefs.videoEngine} onChange={e => setPrefs({...prefs, videoEngine: e.target.value as 'veo' | 'stock'})} className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs font-bold text-teal-400 outline-none">
                                        <option value="stock">تیزرهای ویدیویی رایگان (رایگان، بدون کلید، سینمایی)</option>
                                        <option value="veo">هوش مصنوعی Google Veo (نیازمند فعال‌سازی کلید پریمیوم)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">سبک ویدیو</span>
                                    <select value={prefs.videoStyle} onChange={e => setPrefs({...prefs, videoStyle: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                        {['Cinematic', 'Animation', 'Drone', 'Vlog'].map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                        </ToggleCard>

                        <ToggleCard label="اینفوگرافی هوشمند" icon="📊" description="تولید تصاویر داده‌محور" checked={prefs.needsInfographic} onChange={v => setPrefs({...prefs, needsInfographic: v})}>
                            <div className="space-y-2 pt-2">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase">زبان اینفوگرافی</span>
                                <select value={prefs.infographicLanguage} onChange={e => setPrefs({...prefs, infographicLanguage: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none">
                                    <option value="Persian">فارسی</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                        </ToggleCard>
                    </div>

                    <ActionButton 
                        onClick={handleGenerateStrategy} 
                        variant="primary" 
                        label="تولید محتوا" 
                        className="w-full mt-10 py-6 text-xl rounded-[2rem]"
                        icon={<span className="text-2xl">⚡</span>}
                    />
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & EDIT */}
        {step === 2 && projectData && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between bg-[#051a1d]/90 p-8 lg:p-10 rounded-[3.5rem] border border-white/5 backdrop-blur-2xl sticky top-28 z-40 shadow-2xl">
              <div className="mb-6 md:mb-0 text-center md:text-right">
                <h2 className="text-3xl font-black text-white">میز تدوین نهایی</h2>
                <p className="text-teal-400/60 text-sm mt-1 font-medium">محتوای متنی و پرامپت‌ها را شخصی‌سازی کنید.</p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <ActionButton onClick={handleGoHome} variant="danger" label="انصراف" />
                <ActionButton onClick={handleStartProduction} variant="primary" label="تایید و تولید مدیا ✓" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 space-y-10">
                <EditableArea label="سناریوی ویدیویی" icon="📄" value={projectData.script} onChange={v => setProjectData({...projectData, script: v})} onRefine={() => handleRefine('script')} refineLoading={refineLoading['script']} rows={20} />
                <div className="bg-[#051a1d]/40 border border-white/5 rounded-[2.5rem] p-8">
                    <SectionHeading title="پرامپت‌های مهندسی شده" icon="🤖" color="teal" sub="Technical Output" />
                    <div className="space-y-6">
                        <EditableArea label="پرامپت ویدیو (English)" icon="🎬" value={projectData.videoPrompt} onChange={v => setProjectData({...projectData, videoPrompt: v})} rows={4} />
                        {projectData.imagePrompts && projectData.imagePrompts.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Storyboarding Sequences</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {projectData.imagePrompts.map((p, idx) => (
                                        <div key={idx} className="bg-black/20 p-4 rounded-2xl border border-white/5 text-[10px] text-slate-400 font-mono">{p}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              </div>
              <div className="lg:col-span-5 space-y-10">
                  <EditableArea label="کپشن شبکه‌های اجتماعی" icon="🏷️" value={projectData.caption} onChange={v => setProjectData({...projectData, caption: v})} onRefine={() => handleRefine('caption')} refineLoading={refineLoading['caption']} rows={8} />
                  <EditableArea label="متن نریشن صوتی" icon="🎙️" value={projectData.audioScript} onChange={v => setProjectData({...projectData, audioScript: v})} onRefine={() => handleRefine('audio')} refineLoading={refineLoading['audio']} rows={10} />
                  {prefs.needsInfographic && (
                      <FlowchartEditor data={projectData.infographicContent} onChange={v => setProjectData({...projectData, infographicContent: v})} />
                  )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS (CONTENT DISTRIBUTION CENTER) */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-20">
            <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Ready for Distribution
                </div>
                <h2 className="text-5xl lg:text-8xl font-black text-white leading-tight">پروژه <span className="text-amber-500">طلایی</span> شما</h2>
                <div className="flex flex-wrap justify-center gap-6 pt-4">
                    <ActionButton onClick={() => setStep(2)} variant="secondary" label="بازگشت به میز تدوین" icon={<span className="text-lg">←</span>} />
                    <ActionButton onClick={handleNewProject} variant="primary" label="پروژه جدید +" className="px-10" />
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* LEFT: MASTER MEDIA */}
                <div className="lg:col-span-8 space-y-12">
                    {prefs.needsVideo && (
                        <div className="bg-[#051a1d] rounded-[3.5rem] border border-white/10 overflow-hidden aspect-video relative group shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
                            {assets.videoStatus === 'success' && assets.videoUrl ? (
                                <>
                                    <video src={assets.videoUrl} controls className="w-full h-full object-cover" />
                                    <div className="absolute top-8 left-8 flex gap-3">
                                        <span className="px-4 py-2 bg-black/70 backdrop-blur-xl rounded-xl text-[10px] font-black border border-white/10 text-white shadow-2xl">4K MASTER</span>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-16 text-center">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 text-5xl">
                                        {assets.videoStatus === 'loading' ? <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div> : "🎬"}
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-3">ویدیو {assets.videoStatus === 'loading' ? 'در حال تدوین...' : 'یافت نشد'}</h3>
                                    <p className="text-slate-500 text-lg max-w-md">{assets.videoStatus === 'loading' ? 'هوش مصنوعی Veo در حال خلق فریم‌های ویدیوی شماست.' : 'برای این پروژه ویدیو تولید نشده است.'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* INFOGRAPHIC - Professional Dual Display */}
                    {prefs.needsInfographic && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center text-xl border border-emerald-500/20">📊</div>
                                    <h3 className="text-xl font-bold text-white leading-none">مدیریت و نمایش خروجی اینفوگرافیک</h3>
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
                                    <button 
                                        onClick={() => setInfographicTab('interactive')}
                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${infographicTab === 'interactive' ? 'bg-amber-500 text-teal-950 font-black' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        نقشه راه تعاملی
                                    </button>
                                    <button 
                                        onClick={() => setInfographicTab('poster')}
                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${infographicTab === 'poster' ? 'bg-amber-500 text-teal-950 font-black' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        پوستر گرافیکی هوش مصنوعی
                                    </button>
                                </div>
                            </div>

                            {infographicTab === 'interactive' ? (
                                <FlowchartViewer data={projectData.infographicContent} onEditRequest={() => setStep(2)} />
                            ) : (
                                <div className="bg-[#051a1d]/60 border border-white/5 rounded-[3.5rem] p-8 backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-center">
                                    {assets.infographicStatus === 'success' && assets.infographicUrl ? (
                                        <div className="w-full max-w-lg space-y-6 text-center">
                                            <div className="border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group bg-black/30">
                                                <img referrerPolicy="no-referrer" src={assets.infographicUrl} className="w-full h-auto" alt="AI Generated Infographic Poster" />
                                                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                                    <ActionButton onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = assets.infographicUrl!;
                                                        link.download = `infographic-${Date.now()}.png`;
                                                        link.click();
                                                    }} variant="success" label="دانلود فایل پوستر" />
                                                </div>
                                            </div>
                                            <ActionButton onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = assets.infographicUrl!;
                                                link.download = `infographic-${Date.now()}.png`;
                                                link.click();
                                            }} variant="primary" label="دریافت مسقیم تصویر پوستر (PNG)" className="w-full py-4 rounded-xl font-black" icon="📥" />
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center space-y-6 max-w-md mx-auto">
                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-4xl animate-pulse">
                                                🎨
                                            </div>
                                            <h4 className="text-xl font-bold text-white">پوستر اینفوگرافیک هوش مصنوعی</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                {assets.infographicStatus === 'loading' 
                                                    ? 'ما در حال تصویرسازی نقشه راه طراحی شده جهت خروجی نهایی پوستر با هوش مصنوعی هستیم...' 
                                                    : 'تصویر پوستر آماده نشده است یا غیرفعال است.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* IMAGES GALLERY */}
                    {prefs.needsImage && assets.images.length > 0 && (
                        <div className="bg-[#051a1d]/40 border border-white/5 rounded-[3.5rem] p-10 lg:p-14 backdrop-blur-xl">
                            <SectionHeading title="گالری تصاویر اختصاصی" icon="🖼️" color="indigo" sub="Generated Asset Pack" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {assets.images.map((img, i) => (
                                    <div key={i} className="rounded-[2.5rem] overflow-hidden aspect-square border border-white/10 relative group shadow-2xl">
                                        <img src={img} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-md p-6">
                                            <span className="text-amber-500 text-[10px] font-black uppercase mb-4 tracking-widest">FRAME {i + 1}</span>
                                            <ActionButton onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = img;
                                                link.download = `frame-${i}.png`;
                                                link.click();
                                            }} variant="success" label="دانلود PNG" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: DISTRIBUTION TOOLS */}
                <div className="lg:col-span-4 space-y-12">
                    
                    {/* SOCIAL PACKAGE */}
                    <div className="bg-[#051a1d] border border-white/10 rounded-[3.5rem] p-10 shadow-2xl space-y-8 sticky top-32">
                        <SectionHeading title="بسته انتشار" icon="🏷️" color="amber" sub="Social Media Kit" />
                        
                        <div className="space-y-6">
                            <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">کپشن نهایی</span>
                                    <ActionButton onClick={() => { navigator.clipboard.writeText(projectData.caption); showToast('کپشن کپی شد!', 'success'); }} variant="secondary" label="کپی" className="px-3 py-1.5 h-auto text-[10px]" />
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{projectData.caption}</p>
                            </div>

                            <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">هشتگ‌های پربازدید</span>
                                    <ActionButton onClick={() => { navigator.clipboard.writeText(projectData.hashtags.join(' ')); showToast('هشتگ‌ها کپی شدند!', 'success'); }} variant="secondary" label="کپی همه" className="px-3 py-1.5 h-auto text-[10px]" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {projectData.hashtags.map((h: string, idx: number) => (
                                        <span key={idx} className="bg-amber-500/10 text-amber-500 text-[10px] px-3 py-1.5 rounded-full border border-amber-500/20 font-bold">{h}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SEARCH SOURCES (GROUNDING) */}
                        {projectData.sources && projectData.sources.length > 0 && (
                            <div className="pt-8 border-t border-white/10">
                                <h4 className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-4">منابع و مراجع (Google Search)</h4>
                                <div className="space-y-3">
                                    {projectData.sources.slice(0, 4).map((source: any, idx: number) => (
                                        <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                            <p className="text-[10px] font-bold text-slate-300 truncate">{source.title}</p>
                                            <p className="text-[8px] text-teal-400/50 mt-1 truncate">{source.uri}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AUDIO PLAYER */}
                        {prefs.needsAudio && assets.audioUrl && (
                            <div className="pt-8 border-t border-white/10 space-y-6">
                                <h4 className="text-[10px] font-black text-teal-500 uppercase tracking-widest">فایل صوتی ضبط شده</h4>
                                <AudioWaveform src={assets.audioUrl} />
                                <ActionButton onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = assets.audioUrl!;
                                    link.download = 'voiceover-final.wav';
                                    link.click();
                                }} variant="success" label="دانلود نریشن (WAV)" className="w-full" icon="🎧" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Notifications Area */}
      <div className="fixed bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {error && (
            <div className="pointer-events-auto bg-red-950/90 border border-red-500/30 text-red-200 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in flex items-center justify-between gap-4 font-bold text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <span>{error}</span>
                </div>
                <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100 transition-opacity p-1">✕</button>
            </div>
        )}

        {toast && (
            <div className={`pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in font-bold text-xs sm:text-sm
                ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : ''}
                ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-300' : ''}
                ${toast.type === 'warning' ? 'bg-amber-950/90 border-amber-500/30 text-amber-300' : ''}
            `}>
                {toast.type === 'success' && <span className="text-lg">✅</span>}
                {toast.type === 'error' && <span className="text-lg">❌</span>}
                {toast.type === 'warning' && <span className="text-lg">⚠️</span>}
                <span>{toast.text}</span>
            </div>
        )}
      </div>

      <VoiceAssistant />
    </div>
  );
}
