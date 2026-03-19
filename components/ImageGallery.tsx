
import React, { useState, useRef, useEffect } from 'react';
import { Download, Share2, ZoomIn, Trash2, FolderDown, Video, Loader2, Move, RotateCcw, Check, MousePointer2, Minus, Plus, Sparkles, Undo, Redo, MapPin, Clock, MonitorUp, X, LayoutGrid, List as ListIcon, Square, ChevronLeft, ChevronRight, Maximize, Smartphone, Monitor } from 'lucide-react';
import { GeneratedImage } from '../types';

interface ImageGalleryProps {
  images: GeneratedImage[];
  onClearHistory?: () => void;
  title?: string;
  showStats?: boolean;
  onGenerateVideo?: (imageUrl: string) => void;
  onExpand?: (imageUrl: string, width: number, height: number) => Promise<void>;
  onUpscale?: (imageUrl: string, width: number, height: number) => Promise<string>;
  pendingCount?: number;
  targetWidth?: number;
  targetHeight?: number;
}

interface InteractiveImageCardProps {
  image: GeneratedImage;
  targetWidth: number;
  targetHeight: number;
  idx: number;
  onGenerateVideo?: (url: string) => void;
  onExpand?: (url: string, width: number, height: number) => Promise<void>;
  onUpscale?: (url: string, width: number, height: number) => Promise<string>;
  viewMode?: 'grid' | 'list' | 'single';
}

interface ImageState {
    offset: { x: number; y: number };
    scale: number;
}

const InteractiveImageCard: React.FC<InteractiveImageCardProps> = ({ 
  image, targetWidth, targetHeight, idx, onGenerateVideo, onExpand, onUpscale, viewMode = 'grid'
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);
  
  const [showExpandUI, setShowExpandUI] = useState(false);
  
  // Shared state for target dimensions (used by expand)
  const [customW, setCustomW] = useState(2048);
  const [customH, setCustomH] = useState(2048);

  // History State
  const [history, setHistory] = useState<ImageState[]>([{ offset: { x: 0, y: 0 }, scale: 1 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
      // Default dimensions: initialize based on image aspect ratio
      const w = image.width || 1024;
      const h = image.height || 1024;
      setCustomW(w);
      setCustomH(h);
  }, [image]);

  // Update history function
  const addToHistory = (newState: ImageState) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const updateState = (newOffset: {x:number, y:number}, newScale: number, record = true) => {
      setOffset(newOffset);
      setScale(newScale);
      if (record) {
          addToHistory({ offset: newOffset, scale: newScale });
      }
  };

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if not clicking controls
    if ((e.target as HTMLElement).closest('.controls-ignore-drag')) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
      if (isDragging) {
          setIsDragging(false);
          addToHistory({ offset, scale });
      }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const initialState = { offset: { x: 0, y: 0 }, scale: 1 };
    updateState(initialState.offset, initialState.scale, true);
    setHistory([initialState]); 
    setHistoryIndex(0);
  };

  const handleUndo = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          const prevState = history[prevIndex];
          setHistoryIndex(prevIndex);
          setOffset(prevState.offset);
          setScale(prevState.scale);
      }
  };

  const handleRedo = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          const nextState = history[nextIndex];
          setHistoryIndex(nextIndex);
          setOffset(nextState.offset);
          setScale(nextState.scale);
      }
  };

  const getCanvasBlob = async (): Promise<string | null> => {
     const finalWidth = image.width || targetWidth || 1280;
     const finalHeight = image.height || targetHeight || 720;
    
     const imageObj = new Image();
     imageObj.crossOrigin = "anonymous";
     imageObj.src = image.url;

     return new Promise((resolve) => {
        imageObj.onload = () => {
             const canvas = document.createElement('canvas');
             canvas.width = finalWidth;
             canvas.height = finalHeight;
             const ctx = canvas.getContext('2d');
             if (!ctx || !containerRef.current) { resolve(null); return; }

             const containerRect = containerRef.current.getBoundingClientRect();
             const scaleX = finalWidth / containerRect.width;
             const scaleY = finalHeight / containerRect.height;
             const renderScale = Math.max(scaleX, scaleY);

             ctx.imageSmoothingEnabled = true;
             ctx.imageSmoothingQuality = 'high';

             const sWidth = imageObj.naturalWidth;
             const sHeight = imageObj.naturalHeight;
             
             // 1. Draw Background
             ctx.save();
             const bgScale = Math.max(finalWidth / sWidth, finalHeight / sHeight);
             const bgW = sWidth * bgScale;
             const bgH = sHeight * bgScale;
             const bgX = (finalWidth - bgW) / 2;
             const bgY = (finalHeight - bgH) / 2;
             
             ctx.filter = 'blur(10px)'; 
             ctx.drawImage(imageObj, bgX, bgY, bgW, bgH);
             ctx.restore();

             // 2. Draw Foreground
             ctx.filter = 'none';
             
             const coverScale = Math.max(finalWidth / sWidth, finalHeight / sHeight);
             const dWidth = sWidth * coverScale;
             const dHeight = sHeight * coverScale;
             const centerX = finalWidth / 2;
             const centerY = finalHeight / 2;

             ctx.save();
             ctx.translate(centerX, centerY);
             ctx.translate(offset.x * renderScale, offset.y * renderScale);
             ctx.scale(scale, scale);
             ctx.drawImage(imageObj, -dWidth / 2, -dHeight / 2, dWidth, dHeight);
             ctx.restore();

             resolve(canvas.toDataURL('image/png'));
        };
        imageObj.onerror = () => resolve(null);
     });
  };

  const handleExpandConfirm = async () => {
    if (!onExpand) return;
    setIsExpanding(true);
    setShowExpandUI(false);
    
    await onExpand(image.url, customW, customH);
    
    setIsExpanding(false);
  };

  const handleDownload4K = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onUpscale) return;
      setIsUpscaling(true);
      try {
          const newUrl = await onUpscale(image.url, image.width || 1024, image.height || 1024);
          if (newUrl) {
              const link = document.createElement('a');
              link.href = newUrl;
              link.download = `vastra-4k-${image.id}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }
      } catch (err) {
          console.error(err);
          alert("Failed to upscale image to 4K.");
      } finally {
          setIsUpscaling(false);
      }
  };

  const handleVideoTrigger = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onGenerateVideo) return;
      
      setPreparingVideo(true);
      const canvasBase64 = await getCanvasBlob();
      setPreparingVideo(false);

      if (canvasBase64) {
          onGenerateVideo(canvasBase64);
      } else {
          onGenerateVideo(image.url);
      }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const dataUrl = await getCanvasBlob();
    if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `vastra-${image.width}x${image.height}-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <div 
      className={`group relative bg-white p-3 rounded-2xl shadow-xl transform transition-all duration-500 hover:shadow-2xl border border-stone-100 flex flex-col h-full ${viewMode === 'list' ? 'flex-row gap-4 items-start' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setIsDragging(false); }}
    >
      {/* Aspect Ratio Container (The Mask) */}
      <div 
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl bg-stone-100 cursor-move ${viewMode === 'list' ? 'w-1/2' : 'w-full'}`}
        style={{ aspectRatio: `${image.width || targetWidth} / ${image.height || targetHeight}` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        
        {isExpanding && (
             <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                 <Loader2 size={32} className="animate-spin text-purple-500 mb-2" />
                 <span className="text-xs font-bold animate-pulse">EXPANDING SCENE...</span>
             </div>
        )}

        {isUpscaling && (
             <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                 <Loader2 size={32} className="animate-spin text-brand-500 mb-2" />
                 <span className="text-xs font-bold animate-pulse">UPSCALING TO 4K...</span>
             </div>
        )}

        {showExpandUI && (
            <div className="absolute inset-0 z-40 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-4 controls-ignore-drag">
                <div className="bg-white rounded-xl shadow-2xl p-4 border border-stone-200 w-full max-w-[280px]">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-stone-900 uppercase flex items-center gap-2"><Maximize size={14} className="text-purple-500"/> Generative Expand</h4>
                        <button onClick={() => setShowExpandUI(false)} className="text-stone-400 hover:text-stone-900"><X size={16}/></button>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] text-stone-500">Define the target canvas size. AI will fill the empty space around your image.</p>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                 <label className="text-[9px] font-bold text-stone-500 uppercase block mb-1">Target Width</label>
                                 <input type="number" value={customW} onChange={(e) => setCustomW(parseInt(e.target.value))} className="w-full border border-stone-200 rounded p-1.5 text-xs font-bold bg-stone-50 focus:border-purple-500 outline-none" />
                             </div>
                             <div>
                                 <label className="text-[9px] font-bold text-stone-500 uppercase block mb-1">Target Height</label>
                                 <input type="number" value={customH} onChange={(e) => setCustomH(parseInt(e.target.value))} className="w-full border border-stone-200 rounded p-1.5 text-xs font-bold bg-stone-50 focus:border-purple-500 outline-none" />
                             </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setCustomW(1080); setCustomH(1920); }}
                                className="flex-1 py-1.5 border border-stone-200 rounded text-[9px] font-bold text-stone-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                            >
                                9:16
                            </button>
                            <button 
                                onClick={() => { setCustomW(1920); setCustomH(1080); }}
                                className="flex-1 py-1.5 border border-stone-200 rounded text-[9px] font-bold text-stone-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                            >
                                16:9
                            </button>
                             <button 
                                onClick={() => { setCustomW(1500); setCustomH(500); }}
                                className="flex-1 py-1.5 border border-stone-200 rounded text-[9px] font-bold text-stone-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                            >
                                Banner
                            </button>
                        </div>

                        <button 
                            onClick={handleExpandConfirm}
                            className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-500 transition-colors shadow-lg flex items-center justify-center gap-2"
                        >
                            <Sparkles size={14} /> EXPAND CANVAS
                        </button>
                    </div>
                </div>
            </div>
        )}

        <img 
            ref={imgRef}
            src={image.url} 
            alt={`Shot ${idx}`} 
            draggable={false}
            className={`absolute max-w-none transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
                left: '50%',
                top: '50%',
                minWidth: '100%',
                minHeight: '100%',
                // Apply Transform: Center -> Pan -> Scale
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                width: (image.width || 0) > (image.height || 0) ? 'auto' : '100%', 
                height: (image.width || 0) > (image.height || 0) ? '100%' : 'auto',
            }}
            onLoad={(e) => {
                setImageLoaded(true);
                const img = e.currentTarget;
                const parent = img.parentElement;
                if(parent) {
                    const pRatio = parent.clientWidth / parent.clientHeight;
                    const iRatio = img.naturalWidth / img.naturalHeight;
                    if (iRatio > pRatio) {
                        img.style.height = '100%';
                        img.style.width = 'auto';
                    } else {
                        img.style.width = '100%';
                        img.style.height = 'auto';
                    }
                }
            }}
        />
        
        {/* Hover Controls Overlay */}
        <div className={`absolute inset-0 bg-black/0 transition-all duration-300 pointer-events-none flex flex-col justify-between ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
             
             {/* Top Instruction */}
             <div className="pt-3 flex justify-center">
                <div className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                    <Move size={12} /> Drag to Pan
                </div>
             </div>

             {/* Bottom Zoom Bar */}
             <div className="px-6 pb-4 flex justify-center pointer-events-auto controls-ignore-drag">
                <div className="bg-stone-900/80 backdrop-blur-md p-2 rounded-xl flex items-center gap-3 border border-white/10 shadow-xl w-full max-w-[250px]">
                    <button 
                       onClick={(e) => { 
                           e.stopPropagation(); 
                           const s = Math.max(0.5, scale - 0.1); // Allow zoom out to 0.5
                           updateState(offset, s); 
                       }}
                       className="p-1 text-stone-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                        <Minus size={14} />
                    </button>
                    
                    <input 
                       type="range" 
                       min="0.5" // Allow Zoom Out
                       max="2.5" // Allow Zoom In
                       step="0.1" 
                       value={scale}
                       onChange={(e) => { 
                           e.stopPropagation(); 
                           updateState(offset, parseFloat(e.target.value), false); 
                       }}
                       onMouseUp={() => addToHistory({offset, scale})}
                       className="flex-1 h-1 bg-stone-600 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    
                    <button 
                       onClick={(e) => { 
                           e.stopPropagation(); 
                           const s = Math.min(2.5, scale + 0.1); 
                           updateState(offset, s); 
                       }}
                       className="p-1 text-stone-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                        <Plus size={14} />
                    </button>

                    {(onExpand) && (
                        <div className="w-px h-4 bg-white/20 mx-1"></div>
                    )}

                    {onExpand && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowExpandUI(true); }}
                            disabled={isExpanding}
                            className="p-1.5 text-purple-400 bg-purple-500/20 hover:bg-purple-500/40 rounded-lg transition-colors flex items-center gap-1"
                            title="Generative Expand (Outpaint)"
                        >
                           <Maximize size={14} />
                        </button>
                    )}
                </div>
             </div>
        </div>

        {/* Undo/Redo/Reset Controls (Top Right) */}
        <div className={`absolute top-2 right-2 flex gap-2 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'} controls-ignore-drag`}>
            <button 
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="bg-stone-900/80 text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors z-20 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo"
            >
                <Undo size={12} />
            </button>
            <button 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="bg-stone-900/80 text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors z-20 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo"
            >
                <Redo size={12} />
            </button>
            <button 
                onClick={handleReset}
                className="bg-stone-900/80 text-white p-1.5 rounded-full hover:bg-stone-800 transition-colors z-20 shadow-lg"
                title="Reset Position"
            >
                <RotateCcw size={12} />
            </button>
        </div>
      </div>

      {/* Footer Controls */}
      <div className={`mt-3 px-1 flex flex-col gap-1 ${viewMode === 'list' ? 'flex-1 justify-center' : ''}`}>
         <div className="flex justify-between items-center">
            <div>
               <h4 className="text-sm font-serif font-bold text-stone-900">Shot #{image.id.slice(0,4).toUpperCase()}</h4>
               <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{image.width} x {image.height}</p>
            </div>
            <div className="flex gap-2">
               {onGenerateVideo && (
                   <button 
                   onClick={handleVideoTrigger}
                   disabled={preparingVideo}
                   className="text-stone-400 hover:text-stone-800 transition-colors p-1.5 hover:bg-stone-100 rounded-lg disabled:opacity-50"
                   title="Generate Video from Current View"
                   >
                   {preparingVideo ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
                   </button>
               )}
               {onUpscale && (
                   <button 
                       onClick={handleDownload4K}
                       disabled={isUpscaling}
                       className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide hover:bg-brand-600 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       {isUpscaling ? <Loader2 size={12} className="animate-spin" /> : <MonitorUp size={12} />}
                       4K DL
                   </button>
               )}
               <button 
                   onClick={handleDownload}
                   className="bg-stone-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide hover:bg-stone-800 shadow-md transition-all flex items-center gap-1.5"
               >
                   <Check size={12} /> SAVE
               </button>
            </div>
         </div>
         {image.location && (
            <div className="flex items-center gap-1.5 mt-2 text-brand-600 overflow-hidden">
               <MapPin size={10} className="shrink-0" />
               <span className="text-[9px] font-bold uppercase tracking-tight truncate">{image.location}</span>
            </div>
         )}
         {image.timeOfDay && (
             <div className="flex items-center gap-1.5 text-stone-400">
                <Clock size={10} className="shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-tight">{image.timeOfDay}</span>
             </div>
         )}
         
         {viewMode === 'list' && (
             <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-500">
                <p>Environment: {image.environmentVibe}</p>
                <p className="mt-1">Generated: {new Date(image.timestamp).toLocaleString()}</p>
             </div>
         )}
      </div>
    </div>
  );
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images, 
  title = "Gallery", 
  showStats = false, 
  onClearHistory, 
  onGenerateVideo,
  onExpand,
  onUpscale,
  pendingCount = 0,
  targetWidth = 1024,
  targetHeight = 1024
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
               <h3 className="text-lg font-serif font-bold text-stone-800">{title}</h3>
               {images.length > 0 && (
                   <span className="bg-stone-100 text-stone-500 px-2 py-1 rounded-lg text-xs font-bold">
                       {images.length} SHOTS
                   </span>
               )}
           </div>
           
           <div className="flex items-center gap-2">
               <div className="bg-stone-100 p-1 rounded-lg flex border border-stone-200">
                   <button 
                       onClick={() => setViewMode('grid')}
                       className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
                   >
                       <LayoutGrid size={16} />
                   </button>
                   <button 
                       onClick={() => setViewMode('list')}
                       className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
                   >
                       <ListIcon size={16} />
                   </button>
               </div>
           </div>
       </div>

       {images.length === 0 && pendingCount === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                   <LayoutGrid size={24} className="opacity-20" />
               </div>
               <p className="font-bold text-sm">No images generated yet</p>
               <p className="text-xs mt-1">Configure your shoot and hit Generate</p>
           </div>
       ) : (
           <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6" : "space-y-6"}>
               {/* Pending Placeholders */}
               {pendingCount > 0 && Array.from({ length: pendingCount }).map((_, i) => (
                   <div key={`pending-${i}`} className={`aspect-[3/4] bg-stone-100 rounded-2xl border border-stone-200 animate-pulse flex items-center justify-center ${viewMode === 'list' ? 'h-64 w-full' : ''}`}>
                       <div className="flex flex-col items-center text-stone-300">
                           <Loader2 size={32} className="animate-spin mb-2" />
                           <span className="text-xs font-bold uppercase tracking-widest">Generating...</span>
                       </div>
                   </div>
               ))}

               {/* Generated Images */}
               {images.map((img, idx) => (
                   <div key={img.id} className={viewMode === 'list' ? "h-96" : "aspect-[3/4]"}>
                       <InteractiveImageCard 
                           image={img} 
                           idx={idx} 
                           targetWidth={targetWidth}
                           targetHeight={targetHeight}
                           onGenerateVideo={onGenerateVideo}
                           onExpand={onExpand}
                           onUpscale={onUpscale}
                           viewMode={viewMode}
                       />
                   </div>
               ))}
           </div>
       )}
    </div>
  );
};
