
export type Platform = 'Instagram' | 'YouTube' | 'TikTok' | 'LinkedIn' | 'Twitter';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface ProjectPreferences {
  topic: string;
  targetAudience: string;
  platform: Platform;
  
  // Script & Text
  needsScript: boolean;
  needsCaption: boolean;
  
  // Audio
  needsAudio: boolean;
  needsBackgroundMusic: boolean; 
  audioGender: 'Male' | 'Female';
  audioTone: 'Energetic' | 'Calm' | 'Corporate' | 'Emotional' | 'Epic' | 'Friendly';
  
  // Visuals
  needsImage: boolean;
  imageCount: number; // 1 to 20
  imageStyle: 'Cinematic' | 'Minimalist' | 'Fantasy' | 'Photorealistic' | 'Anime' | '3D Render';
  customImageDescription: string; 
  
  needsInfographic: boolean; 
  infographicLanguage: 'Persian' | 'English' | 'Italian';

  needsVideo: boolean;
  videoEngine: 'veo' | 'stock';
  videoStyle: 'Cinematic' | 'Vlog' | 'Promo' | 'Drone' | 'Animation';
  videoDuration: 'Short (15s)' | 'Medium (30s)' | 'Long (60s)';
}

export interface InfographicStep {
  id: string;
  phase: string;
  title: string;
  description: string;
  duration?: string;
  icon?: string;
}

export interface InfographicData {
  title: string;
  steps: InfographicStep[];
}

export interface ContentProject {
  id: string;
  preferences: ProjectPreferences;
  status: 'planning' | 'reviewing' | 'production' | 'completed';
  
  // Editable Content Data
  editableData: {
    script: string;            
    audioScript: string;       
    caption: string;           
    hashtags: string[];
    onScreenText: string;      
    
    // Technical Prompts
    imagePrompts: string[]; // Changed from string to string[] for storytelling sequence
    videoPrompt: string;  
    videoPromptExplanation: string;
    videoStructure: string;
    
    musicPrompt: string; 
    
    // Infographic Data
    infographicPrompt: string; 
    infographicContent: string | InfographicData; 
  };

  // Final Assets
  assets: {
    audioUrl?: string;
    videoUrl?: string;
    images: string[]; 
    infographicUrl?: string; 
    
    // Asset Statuses
    videoStatus: 'idle' | 'loading' | 'success' | 'error' | 'skipped';
    audioStatus: 'idle' | 'loading' | 'success' | 'error';
    imageStatus: 'idle' | 'loading' | 'success' | 'error';
    infographicStatus: 'idle' | 'loading' | 'success' | 'error';
  };
  
  createdAt: number;
}
