
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Video, Loader2, Download, Film, MoveHorizontal, ZoomIn, Repeat, Camera, Smartphone, Monitor, Plus, Minus, RotateCcw, Scissors, Play, Pause, ChevronRight, Trash2, Split, Layers, Clock, Settings2, GripVertical, Search, ArrowLeft, LayoutTemplate, Maximize, CheckCircle2, AlertTriangle, Save, Music, Zap, Sparkles } from 'lucide-react';
import { CameraMovement, GeneratedVideo, TimelineClip, VideoProject } from '../types';
import { generateProductVideo, extendProductVideo, expandImage } from '../services/geminiService';
import { generateId } from '../utils/helpers';
import * as db from '../utils/db';

interface VideoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage: string; // Base64 url
  onVideoGenerated: (video: GeneratedVideo) => void;
  initialProject?: VideoProject | null;
  onProjectSaved?: (project: VideoProject) => void;
}

type WorkflowMode = 'setup' | 'generating' | 'editor';
type AspectRatio = '9:16' | '16:9';

const VEO_MODELS = [
    { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 (Audio)', audio: true },
    { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast (Audio)', audio: true },
    { id: 'veo-3.0-generate-preview', label: 'Veo 3.0', audio: false }
];

const MICRO_ACTIONS = [
    "gentle rotation of the product",
    "light reflecting off the surface dynamically",
    "subtle steam rising (if applicable)",
    "soft shadow movement across the product",
    "a slow cinematic focus pull"
];

const CAMERA_MOTIONS = [
    "a slow cinematic push-in",
    "a subtle orbiting movement around the product",
    "a gentle horizontal pan to the right",
    "a very slow zoom-out to reveal more environment",
    "a smooth tracking shot"
];

const buildAutoExtensionPrompt = () => {
    const action = MICRO_ACTIONS[Math.floor(Math.random() * MICRO_ACTIONS.length)];
    const motion = CAMERA_MOTIONS[Math.floor(Math.random() * CAMERA_MOTIONS.length)];
    const uniqueSalt = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    return `Continue the product scene seamlessly. Keep the same product details, lighting, and camera angle. ` +
           `Add a natural movement of ${action} and ${motion}. Maintain continuity. No jump cuts. [SALT: ${uniqueSalt}]`;
};

export const VideoGeneratorModal: React.FC<VideoGeneratorModalProps> = ({ 
    isOpen, onClose, sourceImage, onVideoGenerated, initialProject, onProjectSaved 
}) => {
  // --- WORKFLOW STATE ---
  const [mode, setMode] = useState<WorkflowMode>('setup');
  
  // --- PROJECT SETTINGS ---
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [veoModel, setVeoModel] = useState(VEO_MODELS[0].id);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  
  // --- ARTBOARD STATE (SETUP MODE) ---
  const [currentSourceImage, setCurrentSourceImage] = useState(sourceImage);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const artboardRef = useRef<HTMLDivElement>(null);
  const sourceImgRef = useRef<HTMLImageElement>(null);

  // --- GENERATION STATE ---
  const [prompt, setPrompt] = useState('');
  const [movement, setMovement] = useState<CameraMovement>(CameraMovement.PAN);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  // --- EDITOR / TIMELINE STATE ---
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(50); 
  const [isRippleEnabled, setIsRippleEnabled] = useState(true);
  
  // --- EXPORT STATE ---
  const [isExporting, setIsExporting] = useState(false);
  const isExportingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const exportChunksRef = useRef<Blob[]>([]);

  // --- PLAYBACK REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement>(null); 
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const getRenderSize = useCallback(() => {
    const is1080 = resolution === '1080p';
    if (aspectRatio === '16:9') return is1080 ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
    return is1080 ? { w: 1080, h: 1920 } : { w: 720, h: 1280 };
  }, [aspectRatio, resolution]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (isOpen) {
       if (initialProject) {
           setMode('editor');
           setProjectId(initialProject.id);
           setCreatedAt(initialProject.createdAt);
           setAspectRatio(initialProject.aspectRatio);
           setResolution(initialProject.resolution);
           setMovement(initialProject.movement);
           setVeoModel(initialProject.veoModel || VEO_MODELS[0].id);
           setTransform(initialProject.transform);
           setFitMode(initialProject.fitMode);
           setTimeline(initialProject.timeline);
           setPlayhead(0);
           setIsPlaying(false);
           setCurrentSourceImage(initialProject.sourceImage);
       } else {
           setMode('setup');
           setProjectId(generateId());
           setCreatedAt(Date.now());
           setAspectRatio('9:16');
           setVeoModel(VEO_MODELS[0].id);
           setTimeline([]);
           setError(null);
           setPrompt('');
           setFitMode('cover');
           setTransform({ x: 0, y: 0, scale: 1 });
           setIsExporting(false);
           isExportingRef.current = false;
           setCurrentSourceImage(sourceImage);
       }
       
       const img = new Image();
       img.onload = () => {
           if (!initialProject) {
               const ratio = img.naturalWidth / img.naturalHeight;
               setAspectRatio(ratio >= 1.0 ? '16:9' : '9:16');
               setTimeout(handleFitCover, 100);
           }
       };
       img.src = sourceImage;
    }
  }, [isOpen]); 

  // --- AUTOSAVE LOGIC ---
  useEffect(() => {
    if (mode === 'editor' && projectId && !isExporting) {
      const saveTimeout = setTimeout(async () => {
        const proj: VideoProject = {
          id: projectId,
          name: `Studio Timeline`,
          createdAt,
          updatedAt: Date.now(),
          aspectRatio,
          resolution,
          movement,
          veoModel,
          sourceImage: currentSourceImage,
          transform,
          fitMode,
          timeline
        };
        await db.saveProject(proj);
        if (onProjectSaved) onProjectSaved(proj);
      }, 1500); 
      return () => clearTimeout(saveTimeout);
    }
  }, [timeline, aspectRatio, resolution, movement, transform, fitMode, currentSourceImage, projectId, createdAt, mode, veoModel, onProjectSaved, isExporting]);

  const handleFitCover = () => {
      if (!sourceImgRef.current || !artboardRef.current) return;
      setFitMode('cover');
      setTransform({ x: 0, y: 0, scale: 1 });
  };

  const handleFitContain = () => {
      setFitMode('contain');
      setTransform({ x: 0, y: 0, scale: 1 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (mode !== 'setup') return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || mode !== 'setup') return;
      setTransform(prev => ({
          ...prev,
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
      }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const getRenderedArtboard = async (): Promise<string> => {
      if (!sourceImgRef.current || !artboardRef.current) return currentSourceImage;
      const { w: targetW, h: targetH } = getRenderSize();
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);
      const img = new Image();
      img.src = currentSourceImage;
      await new Promise(r => img.onload = r);
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const targetRatio = targetW / targetH;
      let renderW, renderH;
      if (fitMode === 'cover') {
          if (imgRatio > targetRatio) { renderH = targetH; renderW = targetH * imgRatio; }
          else { renderW = targetW; renderH = targetW / imgRatio; }
      } else {
          if (imgRatio > targetRatio) { renderW = targetW; renderH = targetW / imgRatio; }
          else { renderH = targetH; renderW = targetH * imgRatio; }
      }
      const displayRect = artboardRef.current.getBoundingClientRect();
      const scaleFactorX = targetW / displayRect.width;
      const scaleFactorY = targetH / displayRect.height;
      const finalW = renderW * transform.scale;
      const finalH = renderH * transform.scale;
      const offsetX = transform.x * scaleFactorX;
      const offsetY = transform.y * scaleFactorY;
      const centerX = targetW / 2;
      const centerY = targetH / 2;
      const x = centerX - (finalW / 2) + offsetX;
      const y = centerY - (finalH / 2) + offsetY;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, finalW, finalH);
      return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleGenerateClick = async () => {
      try {
          setMode('generating');
          setError(null);
          setProgressMsg('Rendering Artboard...');
          const renderedFrame = await getRenderedArtboard();
          setProgressMsg('Generating AI Video...');
          const { url, videoMetadata } = await generateProductVideo(renderedFrame, prompt, movement, aspectRatio, resolution, veoModel);

          const newClip: TimelineClip = {
              id: generateId(),
              sourceType: 'video',
              sourceUrl: url,
              thumbnail: renderedFrame,
              label: prompt || 'Scene 1',
              startSec: 0,
              durationSec: 5,
              sourceDurationSec: 5,
              trimInSec: 0,
              trimOutSec: 5,
              metadata: videoMetadata,
              aspectRatio: aspectRatio,
              hasAudio: veoModel.includes('3.1'),
              modelUsed: veoModel
          };

          setTimeline([newClip]);
          setActiveClipId(newClip.id);
          onVideoGenerated({ 
              id: newClip.id, 
              url, 
              thumbnail: renderedFrame, 
              timestamp: Date.now(), 
              prompt, 
              movement, 
              aspectRatio, 
              resolution, 
              videoMetadata,
              projectId: projectId || undefined,
              modelUsed: veoModel
          });
          setMode('editor');
          setPlayhead(0);
          setIsPlaying(true);
      } catch (err: any) {
          setError(err.message || "Generation failed");
          setMode('setup'); 
      }
  };

  const handleGenerativeExpand = async () => {
      setIsExpanding(true);
      setError(null);
      try {
          const { w, h } = getRenderSize();
          const expandedImage = await expandImage(currentSourceImage, w, h);
          setCurrentSourceImage(expandedImage);
          // Auto-set to Fill Cover since it now matches
          setFitMode('cover');
          setTransform({ x: 0, y: 0, scale: 1 });
      } catch (err: any) {
          setError("Failed to expand image: " + err.message);
      } finally {
          setIsExpanding(false);
      }
  };

  const totalDuration = timeline.reduce((acc, clip) => Math.max(acc, clip.startSec + clip.durationSec), 0);
  const getActiveClipAtTime = useCallback((time: number) => {
      return timeline.find(c => time >= c.startSec && time < c.startSec + c.durationSec);
  }, [timeline]);

  const updatePlayback = useCallback((timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      
      const { w: targetW, h: targetH } = getRenderSize();

      setPlayhead(prev => {
          const nextTime = prev + deltaTime;
          if (mode === 'editor' && editorCanvasRef.current && videoRef.current) {
               const ctx = editorCanvasRef.current.getContext('2d');
               if (ctx) {
                   if (editorCanvasRef.current.width !== targetW) {
                       editorCanvasRef.current.width = targetW;
                       editorCanvasRef.current.height = targetH;
                   }
                   if (videoRef.current.readyState >= 2) {
                       ctx.imageSmoothingEnabled = true;
                       ctx.imageSmoothingQuality = 'high';
                       ctx.drawImage(videoRef.current, 0, 0, targetW, targetH);
                   }
               }
          }
          if (nextTime >= totalDuration) {
              if (isExportingRef.current) {
                  mediaRecorderRef.current?.stop();
                  isExportingRef.current = false;
                  setIsExporting(false);
                  setIsPlaying(false);
                  return 0;
              }
              setIsPlaying(false);
              return 0; 
          }
          return nextTime;
      });
      animationFrameRef.current = requestAnimationFrame(updatePlayback);
  }, [totalDuration, mode, getRenderSize]);

  useEffect(() => {
      if (isPlaying) {
          lastTimeRef.current = performance.now();
          animationFrameRef.current = requestAnimationFrame(updatePlayback);
      } else {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      }
      return () => {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
  }, [isPlaying, updatePlayback]);

  useEffect(() => {
      const activeClip = getActiveClipAtTime(playhead);
      if (activeClip && videoRef.current && activeClip.sourceType === 'video') {
           const localTime = (playhead - activeClip.startSec) + activeClip.trimInSec;
           if (videoRef.current.getAttribute('src') !== activeClip.sourceUrl) {
               videoRef.current.src = activeClip.sourceUrl;
               videoRef.current.load();
           }
           if (Math.abs(videoRef.current.currentTime - localTime) > 0.3) {
               videoRef.current.currentTime = localTime;
           }
           if (isPlaying && videoRef.current.paused) {
               videoRef.current.play().catch(() => {});
           } else if (!isPlaying && !videoRef.current.paused) {
               videoRef.current.pause();
           }
      }
  }, [playhead, timeline, isPlaying, getActiveClipAtTime]);

  const updateClipTrim = (id: string, newTrimIn: number, newTrimOut: number) => {
      setTimeline(prev => {
          const idx = prev.findIndex(c => c.id === id);
          if (idx === -1) return prev;
          const clip = prev[idx];
          if (newTrimIn < 0) newTrimIn = 0;
          if (newTrimOut > clip.sourceDurationSec) newTrimOut = clip.sourceDurationSec;
          if (newTrimOut - newTrimIn < 0.5) return prev; 
          const newDuration = newTrimOut - newTrimIn;
          const delta = newDuration - clip.durationSec;
          const updated = { ...clip, trimInSec: newTrimIn, trimOutSec: newTrimOut, durationSec: newDuration };
          const newTimeline = [...prev];
          newTimeline[idx] = updated;
          if (isRippleEnabled) {
              for (let i = idx + 1; i < newTimeline.length; i++) {
                  newTimeline[i] = { ...newTimeline[i], startSec: newTimeline[i].startSec + delta };
              }
          }
          return newTimeline;
      });
  };

  const deleteClip = (id: string) => {
      if (!window.confirm("Remove this clip from timeline?")) return;
      
      const clipToRemove = timeline.find(c => c.id === id);
      if (!clipToRemove) return;

      setTimeline(prev => {
          const next = prev.filter(c => c.id !== id);
          if (isRippleEnabled) {
              let currentStart = 0;
              return next.map(clip => {
                  const updated = { ...clip, startSec: currentStart };
                  currentStart += clip.durationSec;
                  return updated;
              });
          }
          return next;
      });

      if (activeClipId === id) setActiveClipId(null);
  };
  
  const captureThumbnail = async (videoUrl: string, timeSec: number): Promise<string> => {
      return new Promise((resolve) => {
          const vid = document.createElement('video');
          vid.crossOrigin = 'anonymous';
          vid.src = videoUrl;
          vid.muted = true;
          vid.currentTime = timeSec;
          vid.onloadeddata = () => {
              vid.currentTime = timeSec;
          };
          vid.onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = vid.videoWidth || 640;
              canvas.height = vid.videoHeight || 360;
              const ctx = canvas.getContext('2d');
              if(ctx) {
                  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                  const data = canvas.toDataURL('image/jpeg', 0.8);
                  resolve(data);
              } else {
                  resolve(''); // Fail gracefully
              }
          };
          vid.onerror = () => resolve('');
      });
  };

  const handleExtend = async () => {
      if (timeline.length === 0) return;
      const baseClipIndex = activeClipId ? timeline.findIndex(c => c.id === activeClipId) : timeline.length - 1;
      const baseClip = timeline[baseClipIndex];
      if (!baseClip) return;

      const extensionText = prompt.trim() ? prompt.trim() : buildAutoExtensionPrompt();
      
      setMode('generating'); 
      setProgressMsg('Extending Scene temporally...');
      
      try {
          const { url, videoMetadata } = await extendProductVideo(baseClip.metadata, extensionText, aspectRatio, veoModel);
          
          if (url === baseClip.sourceUrl) {
              throw new Error("Server returned identical content. Retrying...");
          }

          // 1. Analyze the New Video Duration
          const tempVid = document.createElement('video');
          tempVid.src = url;
          await new Promise(r => tempVid.onloadedmetadata = r);
          const newTotalDuration = tempVid.duration; 
          
          let trimIn = 0;
          let trimOut = newTotalDuration;
          const prevDuration = baseClip.sourceDurationSec;

          if (newTotalDuration > prevDuration + 1) {
              trimIn = prevDuration; 
              trimOut = newTotalDuration;
          }
          
          const clipDuration = trimOut - trimIn;
          const thumbTime = trimIn + 0.5; 
          const newThumbnail = await captureThumbnail(url, thumbTime) || baseClip.thumbnail;
          const newId = generateId();
          const startSec = baseClip.startSec + baseClip.durationSec;

          const newClip: TimelineClip = {
              id: newId,
              sourceType: 'video',
              sourceUrl: url,
              thumbnail: newThumbnail, 
              label: extensionText.length > 20 ? extensionText.slice(0, 20) + '...' : extensionText,
              startSec,
              durationSec: clipDuration,
              sourceDurationSec: newTotalDuration,
              trimInSec: trimIn,
              trimOutSec: trimOut,
              metadata: videoMetadata,
              aspectRatio: aspectRatio,
              hasAudio: veoModel.includes('3.1'),
              modelUsed: veoModel,
              videoId: generateId()
          };

          setTimeline(prev => {
              const newTimeline = [...prev];
              newTimeline.splice(baseClipIndex + 1, 0, newClip);
              for (let i = baseClipIndex + 2; i < newTimeline.length; i++) {
                  newTimeline[i] = {
                      ...newTimeline[i],
                      startSec: newTimeline[i].startSec + clipDuration
                  };
              }
              return newTimeline;
          });

          setMode('editor');
          setPrompt('');
          setActiveClipId(newId);
          setPlayhead(startSec); 
          setIsPlaying(true);
          
          onVideoGenerated({ 
              id: newClip.id, 
              url, 
              thumbnail: newThumbnail, 
              timestamp: Date.now(), 
              prompt: extensionText, 
              movement: movement, 
              aspectRatio, 
              resolution, 
              videoMetadata,
              projectId: projectId || undefined,
              modelUsed: veoModel
          });
      } catch (err: any) {
          setError(err.message);
          setMode('editor');
      }
  };

  const handleExport = () => {
      if (!editorCanvasRef.current) return;
      const { w, h } = getRenderSize();
      editorCanvasRef.current.width = w;
      editorCanvasRef.current.height = h;

      setIsExporting(true);
      isExportingRef.current = true;
      setPlayhead(0);
      setIsPlaying(true);
      setActiveClipId(null); 
      
      const stream = editorCanvasRef.current.captureStream(30); 
      
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
      
      const options: MediaRecorderOptions = { 
          mimeType, 
          videoBitsPerSecond: resolution === '1080p' ? 20000000 : 9000000 
      };
      
      const recorder = new MediaRecorder(stream, options);
      exportChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) exportChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
          const blob = new Blob(exportChunksRef.current, { type: options.mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const ext = options.mimeType.includes('webm') ? 'webm' : 'mp4';
          a.href = url;
          a.download = `studio-export-${Date.now()}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
          
          if (projectId) {
            const proj: VideoProject = {
              id: projectId,
              name: `Studio Timeline`,
              createdAt,
              updatedAt: Date.now(),
              aspectRatio,
              resolution,
              movement,
              veoModel,
              sourceImage: currentSourceImage,
              transform,
              fitMode,
              timeline,
              lastExportUrl: url,
              lastExportMime: options.mimeType
            };
            await db.saveProject(proj);
            if (onProjectSaved) onProjectSaved(proj);
          }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
  };

  const isModelAudioSupported = VEO_MODELS.find(m => m.id === veoModel)?.audio;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-stone-950 border border-stone-800 w-full max-w-[1400px] h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* --- HEADER --- */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-stone-950">
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg text-white ${mode === 'editor' ? 'bg-green-600' : 'bg-brand-500'}`}>
                    {mode === 'editor' ? <Scissors size={20} /> : <Film size={20} />}
                </div>
                <div>
                    <h2 className="text-white font-bold text-lg">
                        {mode === 'setup' && 'Project Setup'}
                        {mode === 'generating' && 'Rendering Video'}
                        {mode === 'editor' && 'Studio Timeline'}
                    </h2>
                    <p className="text-stone-400 text-xs flex items-center gap-2">
                        {mode === 'setup' && 'Step 1: Define Artboard & Framing'}
                        {mode === 'generating' && 'Step 2: Generating AI Video...'}
                        {mode === 'editor' && 'Step 3: Edit & Export'}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center bg-stone-900 rounded-full p-1 border border-white/5">
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'setup' ? 'bg-stone-800 text-white' : 'text-stone-600'}`}>1. Setup</div>
                <div className="w-4 h-px bg-stone-800"></div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'generating' ? 'bg-brand-900 text-brand-400 animate-pulse' : (mode === 'editor' ? 'text-stone-400' : 'text-stone-700')}`}>2. Generate</div>
                <div className="w-4 h-px bg-stone-800"></div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'editor' ? 'bg-green-900 text-green-400' : 'text-stone-700'}`}>3. Edit</div>
            </div>

            <div className="flex items-center gap-4">
                {mode === 'editor' && (
                     <>
                        <div className="bg-stone-800 rounded-lg p-1 flex items-center gap-2 px-3 border border-white/5">
                            <span className="text-xs font-mono text-brand-400 font-bold">{playhead.toFixed(2)}s</span>
                            <span className="text-stone-500 text-xs">/</span>
                            <span className="text-xs font-mono text-stone-400">{totalDuration.toFixed(2)}s</span>
                        </div>
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isExporting ? 'bg-brand-500/20 text-brand-400 animate-pulse' : 'bg-white text-stone-900 hover:bg-stone-200'}`}
                        >
                            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            {isExporting ? 'EXPORTING...' : 'EXPORT VIDEO'}
                        </button>
                     </>
                )}
                <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* --- MAIN WORKSPACE --- */}
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 bg-black relative flex items-center justify-center p-8 overflow-hidden">
                 <div 
                    ref={artboardRef}
                    className={`relative shadow-2xl overflow-hidden ring-1 ring-white/10 transition-all duration-500 ease-in-out ${mode === 'setup' ? 'cursor-move' : ''}`}
                    style={{ 
                        aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16',
                        height: aspectRatio === '16:9' ? 'auto' : '95%',
                        width: aspectRatio === '16:9' ? '95%' : 'auto',
                        maxHeight: '100%',
                        maxWidth: '100%'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                 >
                      {mode === 'editor' ? (
                          <>
                            <video ref={videoRef} className="hidden" playsInline muted={false} crossOrigin="anonymous" />
                            <canvas ref={editorCanvasRef} className="w-full h-full object-cover" onClick={() => !isExporting && setIsPlaying(!isPlaying)} />
                          </>
                      ) : (
                          <div className="w-full h-full relative bg-stone-900">
                             <img 
                                ref={sourceImgRef}
                                src={currentSourceImage}
                                alt="Artboard Source"
                                className="absolute max-w-none origin-center pointer-events-none"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    width: fitMode === 'cover' ? '100%' : 'auto',
                                    height: fitMode === 'cover' ? 'auto' : '100%',
                                    minWidth: fitMode === 'cover' ? '100%' : '0',
                                    minHeight: fitMode === 'cover' ? '100%' : '0',
                                    objectFit: fitMode,
                                    transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
                                }}
                             />
                             {mode === 'setup' && (
                                <div className="absolute inset-0 pointer-events-none opacity-30">
                                    <div className="w-full h-full border-2 border-brand-500/50"></div>
                                    <div className="absolute top-1/3 w-full h-px bg-white/20"></div>
                                    <div className="absolute top-2/3 w-full h-px bg-white/20"></div>
                                    <div className="absolute left-1/3 h-full w-px bg-white/20"></div>
                                    <div className="absolute left-2/3 h-full w-px bg-white/20"></div>
                                </div>
                             )}
                          </div>
                      )}

                      {(mode === 'generating' || isExpanding) && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in">
                               <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                               <h3 className="text-white font-bold text-lg animate-pulse">
                                   {isExpanding ? "Generative Outpainting..." : "Processing..."}
                               </h3>
                               <p className="text-stone-400 text-sm mt-2 font-mono">
                                   {isExpanding ? "Filling empty space..." : progressMsg}
                               </p>
                          </div>
                      )}
                      
                      {isExporting && (
                          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse z-50 shadow-lg flex items-center gap-2">
                               <div className="w-2 h-2 bg-white rounded-full"></div>REC
                          </div>
                      )}
                 </div>

                 {mode === 'editor' && timeline.length > 0 && !isExporting && (
                     <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-stone-900/90 backdrop-blur border border-white/10 p-2 rounded-2xl shadow-xl z-20">
                          <button onClick={() => { setPlayhead(0); setIsPlaying(true); }} className="p-2 text-stone-400 hover:text-white transition-colors"><RotateCcw size={16}/></button>
                          <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5" />}
                          </button>
                     </div>
                 )}
            </div>

            <div className="w-[340px] bg-stone-950 border-l border-white/10 flex flex-col z-20 shadow-2xl">
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl animate-in zoom-in-95">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-2">
                                <AlertTriangle size={14} /> Generation Error
                            </div>
                            <p className="text-red-200 text-xs leading-relaxed">
                                {error}
                            </p>
                            <button 
                                onClick={() => setError(null)}
                                className="mt-3 text-[10px] font-bold text-red-400 hover:text-red-300 underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    <div className="space-y-8 animate-in slide-in-from-right-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                                <Video size={14} /> AI Video Model
                            </label>
                            <select 
                                value={veoModel}
                                onChange={(e) => setVeoModel(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-800 p-3 rounded-xl text-white text-sm font-bold outline-none focus:border-brand-500"
                            >
                                {VEO_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </div>

                        {mode === 'setup' ? (
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                                        <LayoutTemplate size={14} /> Project Aspect Ratio
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setAspectRatio('9:16')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${aspectRatio === '9:16' ? 'bg-brand-600 border-brand-500 text-white shadow-lg' : 'bg-stone-900 border-stone-800 text-stone-500'}`}><Smartphone size={18} /><span className="text-xs font-bold">9:16 Vertical</span></button>
                                        <button onClick={() => setAspectRatio('16:9')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${aspectRatio === '16:9' ? 'bg-brand-600 border-brand-500 text-white shadow-lg' : 'bg-stone-900 border-stone-800 text-stone-500'}`}><Monitor size={18} /><span className="text-xs font-bold">16:9 Wide</span></button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                                        <Settings2 size={14} /> Target Resolution
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setResolution('720p')} className={`py-2 rounded-lg border text-xs font-bold transition-all ${resolution === '720p' ? 'bg-stone-800 border-stone-700 text-white shadow-lg' : 'bg-stone-900 border-stone-800 text-stone-500'}`}>720p</button>
                                        <button onClick={() => setResolution('1080p')} className={`py-2 rounded-lg border text-xs font-bold transition-all ${resolution === '1080p' ? 'bg-stone-800 border-stone-700 text-white shadow-lg' : 'bg-stone-900 border-stone-800 text-stone-500'}`}>1080p</button>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2"><Maximize size={14} /> Artboard Framing</label>
                                    <div className="flex bg-stone-900 rounded-lg p-1 border border-stone-800">
                                        <button onClick={handleFitCover} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${fitMode === 'cover' ? 'bg-stone-700 text-white' : 'text-stone-500'}`}>Fill (Cover)</button>
                                        <button onClick={handleFitContain} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${fitMode === 'contain' ? 'bg-stone-700 text-white' : 'text-stone-500'}`}>Fit (Contain)</button>
                                    </div>
                                    
                                    <button 
                                        onClick={handleGenerativeExpand}
                                        disabled={isExpanding}
                                        className="w-full py-2 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 hover:text-white border border-purple-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        {isExpanding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        MAGIC EXPAND (OUTPAINT)
                                    </button>

                                    <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
                                        <div className="flex justify-between mb-2"><span className="text-[10px] text-stone-400 uppercase font-bold">Zoom Scale</span><span className="text-[10px] text-white font-mono">{Math.round(transform.scale * 100)}%</span></div>
                                        <input type="range" min="0.5" max="2.5" step="0.05" value={transform.scale} onChange={(e) => setTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} className="w-full h-1 bg-stone-700 rounded-full appearance-none accent-brand-500 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Video Prompt</label>
                                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the camera motion..." className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-sm text-white placeholder:text-stone-600 outline-none focus:border-brand-500 h-24 resize-none" />
                                </div>
                                <button onClick={handleGenerateClick} className="w-full py-4 bg-white text-stone-950 hover:bg-stone-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"><Play size={20} fill="currentColor" />GENERATE VIDEO</button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {activeClipId ? (
                                    (() => {
                                        const clip = timeline.find(c => c.id === activeClipId);
                                        if (!clip) return null;
                                        return (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between"><h3 className="text-white font-bold text-sm flex items-center gap-2"><Scissors size={14} /> Clip Editor</h3><span className="text-[10px] bg-stone-800 px-2 py-1 rounded text-stone-400 font-mono">{clip.durationSec.toFixed(1)}s</span></div>
                                                <div className="aspect-video bg-black rounded-lg overflow-hidden border border-stone-800 relative"><img src={clip.thumbnail} className="w-full h-full object-cover opacity-50" /><div className="absolute inset-0 flex items-center justify-center"><span className="text-white text-xs font-bold drop-shadow-md text-center px-4">{clip.label}</span></div></div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div><label className="text-[10px] text-stone-500 uppercase font-bold block mb-1">Trim In</label><input type="number" step="0.1" value={clip.trimInSec} onChange={(e) => updateClipTrim(clip.id, parseFloat(e.target.value), clip.trimOutSec)} className="w-full bg-stone-900 border border-stone-800 rounded p-2 text-white text-xs" /></div>
                                                    <div><label className="text-[10px] text-stone-500 uppercase font-bold block mb-1">Trim Out</label><input type="number" step="0.1" value={clip.trimOutSec} onChange={(e) => updateClipTrim(clip.id, clip.trimInSec, parseFloat(e.target.value))} className="w-full bg-stone-900 border border-stone-800 rounded p-2 text-white text-xs" /></div>
                                                </div>
                                                <button onClick={() => deleteClip(clip.id)} className="w-full py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Trash2 size={14} /> Remove Clip</button>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="text-center py-10 text-stone-500"><p className="text-sm">Select a clip to edit</p></div>
                                )}
                                <div className="pt-6 border-t border-white/5 space-y-3">
                                    <label className="text-xs font-bold text-stone-500 uppercase">Sequencing</label>
                                    <div className="space-y-2">
                                        <textarea 
                                            value={prompt} 
                                            onChange={(e) => setPrompt(e.target.value)} 
                                            placeholder="Prompt for extension (empty for auto)..." 
                                            className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-white resize-none h-16" 
                                        />
                                        <button 
                                            onClick={handleExtend} 
                                            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg active:scale-95 transition-all"
                                        >
                                            <Zap size={16} className="fill-white" /> EXTEND SCENE
                                        </button>
                                    </div>
                                    <button onClick={() => { if (window.confirm("Go back to setup?")) { setMode('setup'); setTimeline([]); } }} className="w-full py-3 bg-stone-800 text-stone-400 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-6"><ArrowLeft size={14} /> Start New Project</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {mode === 'editor' && (
            <div className="h-[260px] bg-stone-950 border-t border-white/10 flex flex-col relative z-30 animate-in slide-in-from-bottom-10">
                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-stone-900/50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsRippleEnabled(!isRippleEnabled)} className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${isRippleEnabled ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-stone-500'}`}>RIPPLE {isRippleEnabled ? 'ON' : 'OFF'}</button>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold ${isModelAudioSupported ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-stone-800 text-stone-600 border border-stone-700'}`}>
                            <Music size={12} /> {isModelAudioSupported ? 'AUDIO ON' : 'AUDIO N/A'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2"><ZoomIn size={14} className="text-stone-500" /><input type="range" min="20" max="200" value={zoomLevel} onChange={(e) => setZoomLevel(parseInt(e.target.value))} className="w-24 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-brand-500" /></div>
                </div>
                <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative" ref={timelineRef}>
                    <div className="h-full relative min-w-full" style={{ width: `${Math.max(totalDuration * zoomLevel + 200, timelineRef.current?.clientWidth || 0)}px` }} onClick={(e) => { if (isExporting) return; const rect = e.currentTarget.getBoundingClientRect(); setPlayhead((e.clientX - rect.left) / zoomLevel); }}>
                        <div className="h-6 border-b border-white/5 relative">{Array.from({ length: Math.ceil(totalDuration + 10) }).map((_, sec) => (<div key={sec} className="absolute bottom-0 text-[9px] text-stone-600 font-mono pl-1 border-l border-white/10 h-3" style={{ left: sec * zoomLevel }}>{sec}s</div>))}</div>
                        <div className="pt-4 px-2 relative h-24">
                            <div className="absolute top-0 bottom-0 w-px bg-white z-40 pointer-events-none" style={{ left: playhead * zoomLevel, height: '100%' }}><div className="w-3 h-3 -ml-1.5 bg-white rotate-45 -mt-1.5 shadow-sm"></div></div>
                            {timeline.map((clip) => {
                                const width = clip.durationSec * zoomLevel;
                                const left = clip.startSec * zoomLevel;
                                const isActive = clip.id === activeClipId;
                                return (
                                    <div key={clip.id} className={`absolute top-2 h-16 rounded-lg overflow-hidden border-2 cursor-pointer group transition-colors select-none ${isActive ? 'border-brand-500 bg-stone-800' : 'border-stone-700 bg-stone-900 hover:border-stone-500'}`} style={{ left, width }} onClick={(e) => { e.stopPropagation(); if (!isExporting) setActiveClipId(clip.id); }}>
                                        <div className="absolute inset-0 flex opacity-30 grayscale group-hover:grayscale-0 transition-all pointer-events-none">{Array.from({ length: Math.ceil(width / 60) }).map((_, i) => (<img key={i} src={clip.thumbnail} className="h-full w-[60px] object-cover border-r border-black/20" />))}</div>
                                        <div className="absolute top-2 left-2 text-[10px] font-bold text-white truncate max-w-[90%] z-10 drop-shadow-md">{clip.label}</div>
                                        
                                        <div className="absolute bottom-1 left-2 text-[8px] text-stone-300 z-10 font-mono flex flex-col pointer-events-none bg-black/40 px-1 rounded">
                                            <span>ID: {clip.id.slice(-6).toUpperCase()}</span>
                                            <span className="truncate max-w-[80px]">URI: ...{clip.sourceUrl.slice(-8)}</span>
                                        </div>

                                        {clip.hasAudio && (
                                            <div className="absolute bottom-1 right-1 z-10 text-white/60"><Music size={10} /></div>
                                        )}
                                        {isActive && !isExporting && (<><div className="absolute left-0 top-0 bottom-0 w-3 bg-brand-500/50 hover:bg-brand-500 cursor-ew-resize z-20 flex items-center justify-center" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); const startX = e.clientX; const startIn = clip.trimInSec; const onMove = (me: MouseEvent) => { const delta = (me.clientX - startX) / zoomLevel; updateClipTrim(clip.id, startIn + delta, clip.trimOutSec); }; const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }}><div className="w-0.5 h-3 bg-white/50"></div></div><div className="absolute right-0 top-0 bottom-0 w-3 bg-brand-500/50 hover:bg-brand-500 cursor-ew-resize z-20 flex items-center justify-center" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); const startX = e.clientX; const startOut = clip.trimOutSec; const onMove = (me: MouseEvent) => { const delta = (me.clientX - startX) / zoomLevel; updateClipTrim(clip.id, clip.trimInSec, startOut + delta); }; const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }}><div className="w-0.5 h-3 bg-white/50"></div></div></>)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
