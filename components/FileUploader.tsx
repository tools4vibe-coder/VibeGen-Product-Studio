
import React, { useRef, useState } from 'react';
import { Upload, Search, Loader2, ShieldCheck, CheckCircle2, Edit3, Box, Eye, EyeOff, X, Plus, Image as ImageIcon, Sparkles, Tag, List, Globe, Puzzle } from 'lucide-react';
import { UploadedImage, ProductCategory } from '../types';
import { fileToBase64, scrapeProductInfo, fetchImageFromUrl } from '../utils/helpers';

interface FileUploaderProps {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
  confirmed: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  inferredCategory: ProductCategory;
  analysis?: any; // New prop for showing deep analysis
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  images, 
  setImages, 
  confirmed,
  onConfirm,
  onEdit,
  inferredCategory,
  analysis
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 5;

  const handleImageAddition = async (base64: string, file?: File, mimeType?: string) => {
    setImages(prev => {
        if (prev.length >= MAX_IMAGES) return prev;
        const newImg: UploadedImage = {
            file: file || new File([], "product.png"),
            preview: base64,
            base64: base64,
            mimeType: mimeType || 'image/png',
            processedBase64: base64 
        };
        return [...prev, newImg];
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Explicitly cast to File[] to fix type inference errors where 'file' becomes 'unknown'
      const files = Array.from(e.target.files) as File[];
      
      // Process all files sequentially
      for (const file of files) {
          if (images.length >= MAX_IMAGES) break; // Stop if limit reached (client-side check might lag slightly vs state, but ok for UX)
          
          if (!file.type.startsWith('image/')) continue;
          
          try {
            const base64 = await fileToBase64(file);
            await handleImageAddition(base64, file, file.type);
          } catch (err) { console.error("Error reading file", err); }
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUrlImport = async () => {
    if (!urlInput) return;
    setIsLoadingUrl(true);
    setUrlError(null);

    try {
      const { image: imageUrl } = await scrapeProductInfo(urlInput, false);
      const { base64, mimeType } = await fetchImageFromUrl(imageUrl);
      await handleImageAddition(base64, undefined, mimeType);
      setUrlInput('');
    } catch (err: any) {
      setUrlError(err.message || "Failed to import product image.");
    } finally { setIsLoadingUrl(false); }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length <= 1) onEdit(); // If removing last image, ensure edit mode
  };

  // CONFIRMED STATE (Compact Stack)
  if (confirmed && images.length > 0) {
      return (
        <div className="flex items-start gap-4 bg-green-50/50 border border-green-100 p-4 rounded-2xl animate-in fade-in">
           <div className="flex -space-x-3 overflow-hidden py-1 pl-1">
             {images.map((img, i) => (
                <div key={i} className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0 bg-white relative z-10 transition-transform hover:-translate-y-1 hover:z-20">
                    <img src={img.preview} className="w-full h-full object-cover" alt={`Ref ${i}`} />
                </div>
             ))}
           </div>
           <div className="flex-1">
             <div className="flex items-center justify-between">
               <h4 className="text-xs font-bold text-green-800">Product Assets Secured ({images.length})</h4>
               <button onClick={onEdit} className="text-[10px] font-bold text-green-600 hover:underline">CHANGE</button>
             </div>
             {analysis?.productName ? (
                 <div className="mt-1">
                    <p className="text-[11px] font-bold text-stone-800">{analysis.productName}</p>
                    <div className="flex gap-2 text-[10px] text-stone-500 mt-0.5">
                       {analysis.brand && <span>{analysis.brand}</span>}
                       <span>•</span>
                       <span>{analysis.features?.length || 0} Features Learned</span>
                    </div>
                 </div>
             ) : (
                <p className="text-[10px] text-green-700 mt-0.5">{inferredCategory}</p>
             )}
           </div>
        </div>
      );
  }

  // UPLOAD / EDIT STATE
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* 1. IMAGE GRID */}
      {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-xl border border-stone-200 bg-stone-50 relative group overflow-hidden shadow-sm">
                      <img src={img.preview} className="w-full h-full object-contain p-2" alt={`Upload ${idx}`} />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-sm"
                        title="Remove image"
                      >
                          <X size={12} />
                      </button>
                      {idx === 0 && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-stone-900/80 text-white text-[8px] font-bold rounded">HERO</div>
                      )}
                  </div>
              ))}
              
              {images.length < MAX_IMAGES && (
                 <button 
                    onClick={() => inputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-stone-200 hover:border-brand-300 hover:bg-brand-50/50 flex flex-col items-center justify-center gap-1 transition-all group"
                 >
                     <div className="p-2 bg-stone-100 rounded-full group-hover:bg-white text-stone-400 group-hover:text-brand-500 transition-colors">
                        <Plus size={16} />
                     </div>
                     <span className="text-[9px] font-bold text-stone-400 group-hover:text-brand-600">ADD VIEW</span>
                 </button>
              )}
          </div>
      )}

      {/* 2. UPLOAD CONTROLS */}
      {images.length === 0 && (
          <div className="space-y-4">
            <div className="flex p-1 bg-stone-100 rounded-lg border border-stone-200 w-fit mb-4">
                <button onClick={() => setActiveTab('upload')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'upload' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>Upload</button>
                <button onClick={() => setActiveTab('url')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'url' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>URL</button>
            </div>

            {activeTab === 'upload' ? (
                <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
                <input type="file" multiple accept="image/*" className="hidden" ref={inputRef} onChange={handleFileChange} />
                <div className="border-2 border-dashed border-stone-200 bg-stone-50 rounded-2xl p-8 text-center hover:border-brand-400 transition-all">
                    <Upload size={28} className="mx-auto text-brand-500 mb-2" />
                    <h3 className="text-sm font-bold text-stone-900">Upload Product Shot(s)</h3>
                    <p className="text-[10px] text-stone-500 mt-1">Select multiple images to show different angles or parts.</p>
                </div>
                </div>
            ) : (
                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-3">Product Image URL</label>
                <div className="flex gap-2">
                    <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." className="flex-1 rounded-xl border-stone-200 bg-stone-50 text-sm p-3 focus:ring-brand-500" />
                    <button onClick={handleUrlImport} disabled={isLoadingUrl} className="bg-stone-900 text-white p-3 rounded-xl disabled:bg-stone-300">
                    {isLoadingUrl ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                </div>
                {urlError && <p className="text-[10px] text-red-500 mt-2">{urlError}</p>}
                </div>
            )}
            
            <div className="mt-4 p-3 bg-stone-50 border border-stone-100 rounded-xl flex items-start gap-3 opacity-60">
                <ShieldCheck size={16} className="text-stone-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-stone-500 leading-relaxed">
                    Upload up to {MAX_IMAGES} reference images (e.g. front, side, details). The AI will create a 3D understanding of the product structure.
                </p>
            </div>
          </div>
      )}

      {/* 3. CONFIRMATION AREA */}
      {images.length > 0 && (
         <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xl shadow-stone-200/50 mt-6">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-100 text-brand-600 rounded-xl"><Box size={20} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-stone-900 uppercase">Analysis Ready</h3>
                        <p className="text-[10px] text-stone-500">
                             {inferredCategory} • {images.length} Reference Shot{images.length > 1 ? 's' : ''}
                        </p>
                    </div>
                 </div>
             </div>
             
             {analysis?.productName ? (
                <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-brand-600 text-xs font-bold">
                        <Sparkles size={12} />
                        Product Identified
                    </div>
                    <div className="flex items-start gap-2">
                        <Tag size={12} className="text-stone-400 mt-0.5" />
                        <p className="text-[11px] font-bold text-stone-800">{analysis.productName}</p>
                    </div>
                    
                    {/* Display Components */}
                    {analysis.components && analysis.components.length > 0 && (
                        <div className="flex items-start gap-2">
                             <Puzzle size={12} className="text-stone-400 mt-0.5" />
                             <p className="text-[10px] text-stone-500 leading-relaxed">
                                <span className="font-bold text-stone-600">Parts:</span> {analysis.components.join(', ')}
                             </p>
                        </div>
                    )}

                    {analysis.features && (
                        <div className="flex items-start gap-2">
                            <List size={12} className="text-stone-400 mt-0.5" />
                            <p className="text-[10px] text-stone-500 leading-relaxed">
                                <span className="font-bold text-stone-600">Features:</span> {analysis.features.slice(0, 3).join(', ')}...
                            </p>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-[9px] text-stone-400 font-bold uppercase mt-1">
                        <Globe size={10} /> Web specs loaded
                    </div>
                </div>
             ) : (
                <p className="text-[11px] text-stone-500 leading-relaxed mb-6">
                    The AI will analyze all {images.length} images to understand the 3D shape, materials, and details. It will selectively use components to create the best composition.
                </p>
             )}

             <button 
                onClick={onConfirm}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 shadow-lg shadow-stone-900/20 transition-all active:scale-95"
              >
                 <CheckCircle2 size={16} /> ANALYZE & CONTINUE
              </button>
         </div>
      )}
      
      {/* Hidden input for "Add View" button in grid */}
      <input type="file" multiple accept="image/*" className="hidden" ref={inputRef} onChange={handleFileChange} />
    </div>
  );
};
