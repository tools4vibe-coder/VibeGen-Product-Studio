
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, Loader2, Layout, History, Zap, XCircle, Users, BarChart3, Activity, Clock, ChevronDown, ChevronUp, Image as ImageIcon, Film, Key, Lock, CheckCircle, Trash2, Box, Sun } from 'lucide-react';
import { UploadedImage, GenerationOptions, GeneratedImage, GeneratedVideo, ShootType, ShootMode, ProductCategory, GroupGenerationOptions, StudioStyle, EnvironmentType, VideoProject, GenerationMode, ProductMaterial, PlacementType, SceneVariation, SceneContext } from './types';
import { FileUploader } from './components/FileUploader';
import { OptionsPanel } from './components/OptionsPanel';
import { ImageGallery } from './components/ImageGallery';
import { GroupStudio } from './components/GroupStudio';
import { VideoHistory } from './components/VideoHistory';
import { VideoGeneratorModal } from './components/VideoGeneratorModal';
import { generateProductShoot, generateCollectionShoot, expandImage, upscaleImage4K, analyzeProductImage } from './services/geminiService';
import { generateId } from './utils/helpers';
import * as db from './utils/db';

const STORAGE_KEY_OPTIONS = 'vibe_product_studio_v1';

const CollapsibleSection: React.FC<{
  title: string;
  number: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  completed?: boolean;
}> = ({ title, number, isOpen, onToggle, children, disabled = false, completed = false }) => (
  <section className={`transition-all duration-500 ease-in-out ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
    <div 
      onClick={disabled ? undefined : onToggle}
      className={`flex items-center justify-between mb-6 cursor-pointer group select-none border-b border-transparent hover:border-stone-200 pb-2 transition-colors ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 ${
            completed ? 'bg-green-500 text-white' : (isOpen ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-400')
          }`}>
          {completed ? <CheckCircle size={16} /> : number}
        </div>
        <h2 className={`text-xl font-serif font-bold tracking-tight transition-colors ${isOpen ? 'text-stone-900' : 'text-stone-400'}`}>
          {title}
        </h2>
        {disabled && <Lock size={16} className="text-stone-300 ml-2" />}
      </div>
      {!disabled && (
        <div className={`p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-stone-100 text-stone-900 rotate-0' : 'bg-transparent text-stone-300 -rotate-90'}`}>
          <ChevronDown size={20} />
        </div>
      )}
    </div>
    <div className={`overflow-hidden transition-all duration-500 ease-cubic ${isOpen ? 'max-h-[5000px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4'}`}>
      <div className="pl-2 pb-4">{children}</div>
    </div>
  </section>
);

function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'group' | 'history'>('studio');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'images' | 'videos'>('images');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [lastBatch, setLastBatch] = useState<GeneratedImage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  
  // Track last analyzed image to prevent re-runs
  const lastAnalyzedImageRef = useRef<string | null>(null);

  // Video Modal State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);

  const [options, setOptions] = useState<GenerationOptions>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_OPTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure legacy data has new fields
        return { 
          ...parsed, 
          productConfirmed: false,
          includeHuman: parsed.includeHuman || false,
          humanModel: parsed.humanModel || { gender: 'Female', ethnicity: 'Diverse', action: 'Using Product', framing: 'Partial Body' },
          camera: parsed.camera || { angle: 'Auto', framing: 'Product Hero', look: 'Clean' },
          placement: Array.isArray(parsed.placement) ? parsed.placement : [parsed.placement || PlacementType.TABLETOP]
        };
      } catch (e) { console.error("Parse failure", e); }
    }
    return {
      generationMode: 'AUTO',
      prompt: '',
      productCategory: ProductCategory.KITCHEN_APPLIANCE,
      productMaterial: ProductMaterial.METALLIC,
      placement: [PlacementType.TABLETOP],
      colors: ['#FFFFFF', '#F5F5F4'],
      useCustomColors: false,
      shootType: ShootType.LIFESTYLE,
      shootMode: ShootMode.SINGLE,
      studioStyle: StudioStyle.COMMERCIAL,
      sceneContexts: [SceneContext.LIVING_ROOM], 
      environmentTypes: [EnvironmentType.INDOOR],
      environmentRandom: true,
      
      // New Human Defaults
      includeHuman: false,
      humanModel: { gender: 'Female', ethnicity: 'Diverse', action: 'Using Product', framing: 'Partial Body' },
      
      numberOfImages: 4,
      width: 1024, 
      height: 1024,
      canvasPreset: '1:1',
      autoStyle: true,
      variationStrength: 'High',
      camera: { angle: 'Auto' as any, framing: 'Product Hero', look: 'Clean' },
      overrides: { consistency: 20, lighting: 'Auto', locationStyle: 'Auto' },
      productConfirmed: false
    };
  });

  const [groupOptions, setGroupOptions] = useState<GroupGenerationOptions>({
    generationMode: 'AUTO',
    members: [
      { id: '1', productImage: null, category: ProductCategory.KITCHEN_APPLIANCE, description: 'Main item' },
      { id: '2', productImage: null, category: ProductCategory.OTHER, description: 'Accessory' }
    ],
    scenePrompt: '',
    width: 1280, 
    height: 720, 
    numberOfImages: 2,
    productMaterial: ProductMaterial.MATTE,
    shootType: ShootType.LIFESTYLE,
    studioStyle: StudioStyle.EDITORIAL,
    sceneContexts: [], 
    environmentRandom: true,
    autoStyle: true,
    colors: ['#FFFFFF'],
    useCustomColors: false,
    camera: { angle: 'Auto' as any, framing: 'Wide Context', look: 'Cinematic' },
    overrides: { consistency: 20, lighting: 'Auto', locationStyle: 'Auto' }
  });

  // --- AUTO ANALYSIS EFFECT ---
  useEffect(() => {
    const analyze = async () => {
      if (uploadedImages.length > 0) {
         const currentImage = uploadedImages[0].base64;
         if (currentImage !== lastAnalyzedImageRef.current) {
            lastAnalyzedImageRef.current = currentImage;
            
            // Auto-analysis
            setIsAnalyzing(true);
            try {
               const analysis = await analyzeProductImage(currentImage);
               setOptions(prev => ({
                 ...prev,
                 productCategory: analysis.category,
                 productMaterial: analysis.material,
                 placement: [analysis.placement],
                 autoDescription: analysis.description,
                 analysis: analysis // Store rich analysis
               }));
            } catch (e) {
               console.warn("Auto-analysis failed", e);
            } finally {
               setIsAnalyzing(false);
            }
         }
      }
    };
    analyze();
  }, [uploadedImages]);


  // --- PERSISTENCE VIA INDEXEDDB ---
  useEffect(() => {
    const loadData = async () => {
      const imgs = await db.getImages();
      const vids = await db.getVideos();
      const loadedProjects = await db.getProjects();
      setGeneratedImages(imgs);
      setGeneratedVideos(vids);
      setProjects(loadedProjects);
    };
    loadData();
  }, []);

  useEffect(() => {
    const optionsToSave = { ...options, productConfirmed: false };
    localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(optionsToSave));
  }, [options]);

  // --- TAB LOGIC ---
  useEffect(() => {
    if (activeTab === 'studio') {
      setOptions(prev => ({ ...prev, shootMode: ShootMode.SINGLE }));
    } else if (activeTab === 'group') {
      setOptions(prev => ({ ...prev, shootMode: ShootMode.MULTIPLE }));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'studio' && uploadedImages.length > 0 && !isConfigOpen) {
      setIsConfigOpen(true);
    } else if (activeTab === 'group' && groupOptions.members.every(m => m.productImage !== null) && !isConfigOpen) {
      setIsConfigOpen(true);
    }
  }, [uploadedImages.length, groupOptions.members, activeTab]);

  const isGroupConfigValid = () => groupOptions.members.every(m => m.productImage !== null);
  const isSingleConfigValid = () => uploadedImages.length > 0;
  const isConfigLocked = () => activeTab === 'group' ? !isGroupConfigValid() : !isSingleConfigValid();

  const handleCancel = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsGenerating(false);
        setError("Generation Cancelled");
        setTimeout(() => setError(null), 3000);
    }
  };

  const handleGenerate = async () => {
    if (activeTab === 'studio' && uploadedImages.length === 0) return;
    if (activeTab === 'group' && !isGroupConfigValid()) {
      setError("Every item in the collection needs an image.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLastBatch([]); 
    setCompletedCount(0);
    abortControllerRef.current = new AbortController();

    try {
      const handleResult = async (base64Url: string, variation?: SceneVariation) => {
         const newImage: GeneratedImage = {
             id: generateId(),
             url: base64Url,
             timestamp: Date.now(),
             width: options.width,
             height: options.height,
             location: variation?.location,
             timeOfDay: variation?.timeOfDay,
             environmentVibe: variation?.environmentVibe
         };
         await db.saveImage(newImage);
         setLastBatch(prev => [...prev, newImage]);
         setCompletedCount(prev => prev + 1);
         setGeneratedImages(prev => [newImage, ...prev]);
      };

      if (activeTab === 'group') {
          await generateCollectionShoot(groupOptions, handleResult, abortControllerRef.current.signal);
      } else {
          await generateProductShoot(uploadedImages, options, handleResult, abortControllerRef.current.signal);
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg !== 'Generation Cancelled') {
        setError(errMsg || "Generation Failed.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Clear all data?")) {
      await db.clearAllData();
      setGeneratedImages([]);
      setGeneratedVideos([]);
      setProjects([]);
      setLastBatch([]);
    }
  };

  const handleExpand = async (url: string, width: number, height: number) => {
    try {
      const expanded = await expandImage(url, width, height);
      const newImg: GeneratedImage = {
        id: generateId(),
        url: expanded,
        timestamp: Date.now(),
        width: width,
        height: height,
      };
      await db.saveImage(newImg);
      setGeneratedImages(prev => [newImg, ...prev]);
    } catch (e: any) {
      console.error(e);
      setError("Expansion failed: " + e.message);
    }
  };

  const handleUpscale = async (url: string, width: number, height: number) => {
    const upscaled = await upscaleImage4K(url, width, height);
    const newImg: GeneratedImage = {
      id: generateId(),
      url: upscaled,
      timestamp: Date.now(),
      width: 4096,
      height: 4096,
    };
    await db.saveImage(newImg);
    setGeneratedImages(prev => [newImg, ...prev]);
    return upscaled;
  };

  const handleCloseVideoModal = () => {
    setVideoModalOpen(false);
    setActiveProject(null);
    setVideoSourceImage(null);
  };

  return (
    <div className="min-h-screen text-stone-800 font-sans pb-32 overflow-y-auto relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-stone-900 text-white rounded-lg">
                <Camera size={18} />
            </div>
            <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">VibeGen Studio</h1>
            {isAnalyzing && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold border border-brand-100 animate-pulse">
                     <Sparkles size={12} /> ANALYZING PRODUCT...
                 </div>
            )}
          </div>
          
          <nav className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 shadow-inner">
            <button onClick={() => setActiveTab('studio')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'studio' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><Box size={14} /> Product</button>
            <button onClick={() => setActiveTab('group')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'group' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><Users size={14} /> Collection</button>
            <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeTab === 'history' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><History size={14} /> History</button>
          </nav>

          <div className="flex items-center gap-2">
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 relative z-10">
        {activeTab === 'history' ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 w-fit">
                    <button onClick={() => setActiveHistoryTab('images')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeHistoryTab === 'images' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><ImageIcon size={14} /> Images</button>
                    <button onClick={() => setActiveHistoryTab('videos')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${activeHistoryTab === 'videos' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}><Film size={14} /> Videos</button>
                  </div>
                  <button onClick={handleClearHistory} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"><Trash2 size={16} /> CLEAR HISTORY</button>
                </div>
                {activeHistoryTab === 'images' ? (
                  <ImageGallery 
                    images={generatedImages} 
                    title="Image Archive" 
                    showStats={true} 
                    targetWidth={options.width} 
                    targetHeight={options.height} 
                    onExpand={handleExpand}
                    onUpscale={handleUpscale}
                    onGenerateVideo={(url) => { setVideoSourceImage(url); setVideoModalOpen(true); }} 
                  />
                ) : (
                  <VideoHistory 
                    videos={generatedVideos} 
                    projects={projects}
                    onClear={async () => { await db.clearAllData(); setGeneratedVideos([]); setProjects([]); }}
                    onOpenProject={async (pid) => {
                      const proj = await db.getProjectById(pid);
                      if (proj) {
                        setActiveProject(proj);
                        setVideoSourceImage(proj.sourceImage);
                        setVideoModalOpen(true);
                      }
                    }}
                    onDeleteProject={async (pid) => {
                      if (confirm("Delete this project?")) {
                        await db.deleteProject(pid);
                        setProjects(prev => prev.filter(p => p.id !== pid));
                      }
                    }}
                  />
                )}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-5 space-y-8">
                <CollapsibleSection title={activeTab === 'studio' ? "Input Product" : "Collection Setup"} number="01" isOpen={isUploadOpen} onToggle={() => setIsUploadOpen(!isUploadOpen)} completed={activeTab === 'studio' ? uploadedImages.length > 0 : isGroupConfigValid()}>
                    {activeTab === 'studio' ? (
                      <FileUploader 
                        images={uploadedImages} 
                        setImages={setUploadedImages} 
                        confirmed={options.productConfirmed} 
                        onConfirm={() => { setOptions(prev => ({...prev, productConfirmed: true})); setIsUploadOpen(false); setIsConfigOpen(true); }} 
                        onEdit={() => setOptions(prev => ({...prev, productConfirmed: false}))} 
                        inferredCategory={options.productCategory}
                        analysis={options.analysis}
                      />
                    ) : (
                      <GroupStudio options={groupOptions} setOptions={setGroupOptions} />
                    )}
                </CollapsibleSection>
                <CollapsibleSection title="Studio Details" number="02" isOpen={isConfigOpen} onToggle={() => setIsConfigOpen(!isConfigOpen)} disabled={isConfigLocked()}><OptionsPanel options={options} setOptions={setOptions} /></CollapsibleSection>
            </div>
            <div className="lg:col-span-7">
              <ImageGallery 
                images={lastBatch} 
                title="Current Session" 
                pendingCount={isGenerating ? (options.numberOfImages - completedCount) : 0} 
                targetWidth={options.width} 
                targetHeight={options.height} 
                onExpand={handleExpand}
                onUpscale={handleUpscale}
                onGenerateVideo={(url) => { setVideoSourceImage(url); setVideoModalOpen(true); }} 
              />
            </div>
          </div>
        )}
      </main>

      {activeTab !== 'history' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-auto">
          {error && <div className="mb-4 bg-red-900/90 text-white p-3 rounded-xl text-xs font-bold text-center animate-in slide-in-from-bottom-2">{error}</div>}
          
          <div className="flex gap-2">
            <button 
                onClick={handleGenerate} 
                disabled={isGenerating || (activeTab === 'studio' && uploadedImages.length === 0) || (activeTab === 'group' && !isGroupConfigValid())} 
                className={`flex-1 p-4 rounded-xl shadow-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 ${ (activeTab === 'studio' && uploadedImages.length === 0) || (activeTab === 'group' && !isGroupConfigValid()) ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none' : 'bg-stone-900 text-white hover:bg-stone-800' }`}
            >
                {isGenerating ? <><Loader2 size={20} className="animate-spin" /> GENERATING ({completedCount}/{options.numberOfImages})</> : <><Zap size={20} /> GENERATE SHOOT</>}
            </button>
            
            {isGenerating && (
                <button 
                    onClick={handleCancel}
                    className="p-4 rounded-xl shadow-2xl font-bold flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-all active:scale-95 animate-in fade-in slide-in-from-right-4"
                    title="Cancel Generation"
                >
                    <XCircle size={24} />
                </button>
            )}
          </div>
        </div>
      )}

      {videoModalOpen && videoSourceImage && (
        <VideoGeneratorModal
          isOpen={videoModalOpen}
          onClose={handleCloseVideoModal}
          sourceImage={videoSourceImage}
          initialProject={activeProject}
          onVideoGenerated={async (video) => {
            await db.saveVideo(video);
            setGeneratedVideos(prev => [video, ...prev]);
          }}
          onProjectSaved={(proj) => {
            setProjects(prev => {
              const others = prev.filter(p => p.id !== proj.id);
              return [proj, ...others].sort((a,b) => b.updatedAt - a.updatedAt);
            });
          }}
        />
      )}
    </div>
  );
}
export default App;
