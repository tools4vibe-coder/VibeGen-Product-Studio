
import React, { useState } from 'react';
import { Palette, Layers, Settings, SlidersHorizontal, Zap, Maximize, Lock, Box, Sun, Aperture, Briefcase, Coffee, Tent, PartyPopper, Sparkles, Monitor, Armchair, Utensils, Bath, Trees, Building2, Package, Smartphone, Footprints, Watch, Camera, User, ScanFace, Focus, Eye } from 'lucide-react';
import { GenerationOptions, ShootType, ProductCategory, SceneContext, StudioStyle, PlacementType, ProductMaterial, CameraAngle, LightingStyle, LocationStyle, CanvasPreset } from '../types';

interface OptionsPanelProps {
  options: GenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
}

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ options, setOptions }) => {
  const [isDimSet, setIsDimSet] = useState(false);

  const PRESET_COLORS = ['#FFFFFF', '#F5F5F4', '#E7E5E4', '#A8A29E', '#78716C', '#292524', '#000000', '#1a2e35', '#3f1a1a'];

  const handlePresetSelect = (preset: CanvasPreset, w: number, h: number) => {
    setOptions(prev => ({ ...prev, canvasPreset: preset, width: w, height: h }));
    setIsDimSet(true);
    setTimeout(() => setIsDimSet(false), 2000);
  };

  const handleCustomDimensionChange = (field: 'width' | 'height', val: string) => {
    const num = parseInt(val) || 0;
    setOptions(prev => ({ ...prev, [field]: num }));
  };

  const getAspectRatioLabel = (w: number, h: number) => {
    if (!w || !h) return '';
    const common = gcd(w, h);
    return `${w / common}:${h / common}`;
  };

  const toggleSceneContext = (type: SceneContext) => {
    setOptions(prev => {
        const current = prev.sceneContexts;
        if (current.includes(type)) {
            if (current.length === 1) return prev; 
            return { ...prev, sceneContexts: current.filter(t => t !== type) };
        } else {
            return { ...prev, sceneContexts: [...current, type] };
        }
    });
  };

  const togglePlacement = (p: PlacementType) => {
    setOptions(prev => {
        const current = prev.placement;
        if (current.includes(p)) {
            if (current.length === 1) return prev; 
            return { ...prev, placement: current.filter(t => t !== p) };
        } else {
            return { ...prev, placement: [...current, p] };
        }
    });
  };

  const toggleAllContexts = () => {
    const allTypes = Object.values(SceneContext);
    const isAllSelected = options.sceneContexts.length === allTypes.length;
    setOptions(prev => ({
        ...prev,
        sceneContexts: isAllSelected ? [SceneContext.STUDIO] : allTypes
    }));
  };

  const contextIcons: Record<SceneContext, React.ElementType> = {
      [SceneContext.STUDIO]: Aperture,
      [SceneContext.KITCHEN]: Utensils,
      [SceneContext.LIVING_ROOM]: Armchair,
      [SceneContext.OFFICE]: Briefcase,
      [SceneContext.BATHROOM]: Bath,
      [SceneContext.OUTDOOR]: Trees,
      [SceneContext.MINIMAL]: Box,
      [SceneContext.INDUSTRIAL]: Building2,
      [SceneContext.LUXURY]: Sparkles
  };

  const labelClass = "block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2 group-focus-within:text-brand-600 transition-colors";
  const selectClass = "appearance-none w-full p-3 pr-10 rounded-xl bg-white/50 border border-stone-200 text-sm font-medium text-stone-700 shadow-sm hover:border-brand-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all cursor-pointer";

  const isWidthInvalid = options.width < 256 || options.width > 4096;
  const isHeightInvalid = options.height < 256 || options.height > 4096;

  return (
    <div className="relative space-y-8 pb-4">
      
      {/* 0. MODE TOGGLE (AUTO / CUSTOM) */}
      <div className="flex p-1 bg-stone-200/50 rounded-2xl border border-stone-200">
         <button 
           onClick={() => setOptions(prev => ({ ...prev, generationMode: 'AUTO' }))}
           className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${options.generationMode === 'AUTO' ? 'bg-white text-brand-600 shadow-md scale-100' : 'text-stone-500 hover:text-stone-700'}`}
         >
           <Zap size={14} className={options.generationMode === 'AUTO' ? 'fill-brand-500 text-brand-500' : ''} /> AUTO MODE
         </button>
         <button 
           onClick={() => setOptions(prev => ({ ...prev, generationMode: 'CUSTOM' }))}
           className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${options.generationMode === 'CUSTOM' ? 'bg-white text-stone-900 shadow-md scale-100' : 'text-stone-500 hover:text-stone-700'}`}
         >
           <SlidersHorizontal size={14} /> CUSTOM MODE
         </button>
      </div>

      {/* CUSTOM PROMPT INPUT */}
      {options.generationMode === 'CUSTOM' && (
          <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className={labelClass}><Sparkles size={14} /> Custom Scene Description</label>
              <textarea
                  value={options.overrides.customText || ''}
                  onChange={(e) => setOptions(prev => ({
                      ...prev,
                      overrides: { ...prev.overrides, customText: e.target.value }
                  }))}
                  placeholder="Describe your exact scene (e.g. 'Standing on a mossy rock in a rainforest with morning mist')..."
                  className="w-full bg-white border border-brand-200 rounded-xl p-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 min-h-[100px] shadow-sm resize-y"
              />
              <p className="text-[10px] text-stone-500">
                  In Custom Mode, this description replaces the automatic scene selection.
              </p>
          </div>
      )}

      {/* 1. PRODUCT DETAILS */}
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest flex items-center gap-2">
                <Box size={14} className="text-brand-500" /> Product Specifications
            </h3>
            {options.autoDescription && (
                <span className="text-[9px] bg-brand-50 text-brand-600 px-2 py-1 rounded-md font-bold flex items-center gap-1 border border-brand-100">
                    <Sparkles size={10} /> AUTO DETECTED
                </span>
            )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className={labelClass}>Category</label>
                <div className="relative">
                  <select 
                      value={options.productCategory}
                      onChange={(e) => setOptions(prev => ({ ...prev, productCategory: e.target.value as ProductCategory }))}
                      className={selectClass}
                  >
                      {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
            </div>
            <div>
                <label className={labelClass}>Material Finish</label>
                <div className="relative">
                  <select 
                      value={options.productMaterial}
                      onChange={(e) => setOptions(prev => ({ ...prev, productMaterial: e.target.value as ProductMaterial }))}
                      className={selectClass}
                  >
                      {Object.values(ProductMaterial).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
            </div>
        </div>

        <div>
            <label className={labelClass}>Placement Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(PlacementType).map(p => (
                    <button
                        key={p}
                        onClick={() => togglePlacement(p)}
                        className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${options.placement.includes(p) ? 'bg-stone-900 border-stone-900 text-white shadow-md' : 'bg-white border-stone-200 text-stone-500 hover:border-brand-300'}`}
                    >
                        {p.split(' / ')[0]}
                    </button>
                ))}
            </div>
        </div>

        {options.autoDescription && (
             <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                 <p className="text-[10px] text-stone-400 font-bold uppercase mb-1">Detected Visuals</p>
                 <p className="text-xs text-stone-600 leading-relaxed italic">"{options.autoDescription}"</p>
             </div>
        )}
      </div>

      {/* 2. SCENE SETTINGS */}
      <div className="space-y-6 border-t border-dashed border-stone-200 pt-6">
        <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Sun size={14} className="text-brand-500" /> Scene Context
        </h3>

        {/* SHOOT TYPE SELECTOR */}
        <div className="bg-stone-50 p-1.5 rounded-xl border border-stone-200 flex mb-4">
            <button
                onClick={() => setOptions(p => ({ ...p, shootType: ShootType.LIFESTYLE }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${options.shootType === ShootType.LIFESTYLE ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
                <Sun size={14} /> Lifestyle Context
            </button>
            <button
                onClick={() => setOptions(p => ({ ...p, shootType: ShootType.STUDIO }))}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase transition-all ${options.shootType === ShootType.STUDIO ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
                <Aperture size={14} /> Pure Studio
            </button>
        </div>

        <div className="space-y-4">
          {options.shootType === ShootType.LIFESTYLE ? (
             <>
                <div className="flex items-center justify-between">
                    <label className={labelClass}><Box size={14} /> Environments {options.generationMode === 'CUSTOM' && '(Fallback)'}</label>
                    <button 
                        onClick={toggleAllContexts}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${options.sceneContexts.length === Object.values(SceneContext).length ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-400 border-stone-200'}`}
                    >
                        {options.sceneContexts.length === Object.values(SceneContext).length ? 'CLEAR' : 'SELECT ALL'}
                    </button>
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${options.generationMode === 'CUSTOM' ? 'opacity-50 grayscale' : ''}`}>
                    {Object.values(SceneContext).filter(c => c !== SceneContext.STUDIO).map(ctx => {
                        const Icon = contextIcons[ctx] || Box;
                        const isSelected = options.sceneContexts.includes(ctx);
                        return (
                            <button
                                key={ctx}
                                onClick={() => toggleSceneContext(ctx)}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all h-20 ${isSelected ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm' : 'bg-white border-stone-200 text-stone-400 hover:border-brand-200 hover:text-stone-600'}`}
                            >
                                <Icon size={18} />
                                <span className="text-[9px] font-bold uppercase text-center">{ctx.replace('Modern', '').replace('Luxury', '').trim()}</span>
                            </button>
                        );
                    })}
                </div>
             </>
          ) : (
             <div>
                <label className={labelClass}>Studio Style</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(StudioStyle).map(s => (
                        <button
                            key={s}
                            onClick={() => setOptions(p => ({ ...p, studioStyle: s }))}
                            className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${options.studioStyle === s ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                
                {/* STUDIO COLOR PICKER */}
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                         <label className={labelClass}><Palette size={14} /> Backdrop Color</label>
                         <div className="flex items-center gap-2">
                             <span className="text-[9px] font-bold text-stone-400 uppercase">Use Custom</span>
                             <button 
                                onClick={() => setOptions(p => ({ ...p, useCustomColors: !p.useCustomColors }))}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors ${options.useCustomColors ? 'bg-brand-500' : 'bg-stone-300'}`}
                             >
                                 <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${options.useCustomColors ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                         </div>
                    </div>
                    
                    {options.useCustomColors && (
                         <div className="flex gap-2 mb-3">
                             <div className="flex-1 relative">
                                <input 
                                    type="color" 
                                    value={options.colors[0] || '#FFFFFF'} 
                                    onChange={(e) => setOptions(p => ({ ...p, colors: [e.target.value] }))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="w-full h-10 rounded-lg border border-stone-200 flex items-center px-3 gap-3 bg-white">
                                    <div className="w-6 h-6 rounded-md border border-stone-100 shadow-sm" style={{ backgroundColor: options.colors[0] }}></div>
                                    <span className="text-xs font-mono text-stone-600 uppercase flex-1">{options.colors[0]}</span>
                                </div>
                             </div>
                         </div>
                    )}

                    <div className="flex gap-1.5 flex-wrap">
                        {PRESET_COLORS.map(c => (
                            <button
                            key={c}
                            onClick={() => setOptions(p => ({ ...p, colors: [c], useCustomColors: true }))}
                            className={`w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110 ${options.useCustomColors && options.colors[0] === c ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-stone-200'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                            />
                        ))}
                    </div>
                </div>
             </div>
          )}
        </div>
      </div>
      
      {/* 3. HUMAN MODEL */}
      <div className="space-y-6 border-t border-dashed border-stone-200 pt-6">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest flex items-center gap-2">
                 <User size={14} className="text-brand-500" /> Human Context
              </h3>
              <div className="flex items-center gap-2">
                 <span className={`text-[9px] font-bold uppercase transition-colors ${options.includeHuman ? 'text-brand-600' : 'text-stone-400'}`}>
                    {options.includeHuman ? 'Included' : 'Disabled'}
                 </span>
                 <button 
                    onClick={() => setOptions(p => ({ ...p, includeHuman: !p.includeHuman }))}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${options.includeHuman ? 'bg-brand-500' : 'bg-stone-300'}`}
                 >
                     <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${options.includeHuman ? 'translate-x-5' : 'translate-x-0'}`} />
                 </button>
              </div>
          </div>
          
          <div className={`space-y-4 transition-all duration-300 overflow-hidden ${options.includeHuman ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                     <label className={labelClass}>Gender Identity</label>
                     <select 
                        value={options.humanModel.gender}
                        onChange={(e) => setOptions(p => ({ ...p, humanModel: { ...p.humanModel, gender: e.target.value as any } }))}
                        className={selectClass}
                     >
                         <option value="Female">Female</option>
                         <option value="Male">Male</option>
                         <option value="Neutral">Neutral</option>
                     </select>
                 </div>
                 <div>
                     <label className={labelClass}>Ethnicity</label>
                     <select 
                        value={options.humanModel.ethnicity}
                        onChange={(e) => setOptions(p => ({ ...p, humanModel: { ...p.humanModel, ethnicity: e.target.value as any } }))}
                        className={selectClass}
                     >
                         <option value="Diverse">Diverse (Random)</option>
                         <option value="Caucasian">Caucasian</option>
                         <option value="Asian">Asian</option>
                         <option value="Black">Black/African Descent</option>
                         <option value="Latino">Latino/Hispanic</option>
                         <option value="Middle Eastern">Middle Eastern</option>
                     </select>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div>
                     <label className={labelClass}>Action</label>
                     <select 
                        value={options.humanModel.action}
                        onChange={(e) => setOptions(p => ({ ...p, humanModel: { ...p.humanModel, action: e.target.value as any } }))}
                        className={selectClass}
                     >
                         <option value="Using Product">Using Product</option>
                         <option value="Holding Product">Holding Product</option>
                         <option value="Standing Near">Standing Near</option>
                         <option value="Walking With">Walking With</option>
                         <option value="Sitting With">Sitting With</option>
                     </select>
                 </div>
                 <div>
                     <label className={labelClass}>Framing</label>
                     <select 
                        value={options.humanModel.framing}
                        onChange={(e) => setOptions(p => ({ ...p, humanModel: { ...p.humanModel, framing: e.target.value as any } }))}
                        className={selectClass}
                     >
                         <option value="Partial Body">Partial Body</option>
                         <option value="Hands Only">Hands Only</option>
                         <option value="Full Body">Full Body</option>
                     </select>
                 </div>
              </div>
          </div>
      </div>

      {/* 4. CAMERA & COMPOSITION */}
      <div className="space-y-6 border-t border-dashed border-stone-200 pt-6">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Camera size={14} className="text-brand-500" /> Camera & Composition
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
             <div>
                 <label className={labelClass}><ScanFace size={12}/> Angle</label>
                 <select 
                    value={options.camera.angle}
                    onChange={(e) => setOptions(p => ({ ...p, camera: { ...p.camera, angle: e.target.value as CameraAngle } }))}
                    className={`${selectClass} border-brand-200 bg-brand-50/50`}
                 >
                     <option value="Auto">Auto Smart</option>
                     <option value="Eye-level">Eye-level (Standard)</option>
                     <option value="Low-angle">Low-angle (Hero)</option>
                     <option value="High-angle (Flatlay)">High-angle (Flatlay)</option>
                     <option value="45-degree ISO">Isometric</option>
                     <option value="Macro Detail">Macro Detail</option>
                     <option value="Wide Angle">Wide Angle</option>
                 </select>
             </div>
             <div>
                 <label className={labelClass}><Focus size={12}/> Framing</label>
                 <select 
                    value={options.camera.framing}
                    onChange={(e) => setOptions(p => ({ ...p, camera: { ...p.camera, framing: e.target.value as any } }))}
                    className={selectClass}
                 >
                     <option value="Product Hero">Product Hero (Centered)</option>
                     <option value="Wide Context">Wide Context</option>
                     <option value="Detail Shot">Close-up Detail</option>
                 </select>
             </div>
          </div>
          
          <div>
               <label className={labelClass}><Eye size={12}/> Aesthetic Look</label>
               <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
                   <button 
                      onClick={() => setOptions(p => ({ ...p, camera: { ...p.camera, look: 'Clean' } }))}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${options.camera.look === 'Clean' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
                   >
                       Clean & Sharp
                   </button>
                   <button 
                      onClick={() => setOptions(p => ({ ...p, camera: { ...p.camera, look: 'Cinematic' } }))}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${options.camera.look === 'Cinematic' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}
                   >
                       Cinematic & Soft
                   </button>
               </div>
          </div>
      </div>

      {/* 5. OUTPUT SETTINGS */}
      <div className="space-y-6 border-t border-dashed border-stone-200 pt-6">
         <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Maximize size={14} className="text-brand-500" /> Output Dimensions
         </h3>
         
         <div className="grid grid-cols-4 gap-2 mb-4">
             {(['3:4', '1:1', '16:9', 'custom'] as CanvasPreset[]).map(preset => (
                 <button
                    key={preset}
                    onClick={() => {
                        if (preset === '3:4') handlePresetSelect(preset, 896, 1152);
                        else if (preset === '1:1') handlePresetSelect(preset, 1024, 1024);
                        else if (preset === '16:9') handlePresetSelect(preset, 1280, 720);
                        else setOptions(p => ({ ...p, canvasPreset: 'custom' }));
                    }}
                    className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${options.canvasPreset === preset ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}
                 >
                    {preset}
                 </button>
             ))}
         </div>

         <div className="grid grid-cols-2 gap-3 relative">
             <div>
                 <label className="text-[9px] font-bold text-stone-400 uppercase block mb-1">Width (px)</label>
                 <input 
                    type="number" 
                    value={options.width} 
                    onChange={(e) => handleCustomDimensionChange('width', e.target.value)}
                    className={`w-full p-2 text-sm font-bold bg-stone-50 border rounded-lg outline-none focus:border-brand-500 ${isWidthInvalid ? 'text-red-500 border-red-300' : 'text-stone-700 border-stone-200'}`}
                 />
             </div>
             <div>
                 <label className="text-[9px] font-bold text-stone-400 uppercase block mb-1">Height (px)</label>
                 <input 
                    type="number" 
                    value={options.height} 
                    onChange={(e) => handleCustomDimensionChange('height', e.target.value)}
                    className={`w-full p-2 text-sm font-bold bg-stone-50 border rounded-lg outline-none focus:border-brand-500 ${isHeightInvalid ? 'text-red-500 border-red-300' : 'text-stone-700 border-stone-200'}`}
                 />
             </div>
             
             {isDimSet && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl animate-in fade-in">
                     <span className="text-xs font-bold text-brand-600 flex items-center gap-1">
                         <Maximize size={12} /> {options.width}x{options.height} ({getAspectRatioLabel(options.width, options.height)})
                     </span>
                 </div>
             )}
         </div>

         <div className="space-y-2">
             <div className="flex justify-between">
                <label className={labelClass}>Batch Size</label>
                <span className="text-xs font-bold text-stone-900">{options.numberOfImages}</span>
             </div>
             <input 
                type="range" 
                min="1" 
                max="8" 
                step="1" 
                value={options.numberOfImages} 
                onChange={(e) => setOptions(p => ({ ...p, numberOfImages: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-brand-500"
             />
             <div className="flex justify-between text-[9px] text-stone-400 font-bold uppercase">
                 <span>1 Shot</span>
                 <span>8 Shots</span>
             </div>
         </div>
      </div>

      {/* 6. ADVANCED */}
      <div className="space-y-4 border-t border-dashed border-stone-200 pt-6">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-widest flex items-center gap-2 mb-4">
             <Settings size={14} className="text-brand-500" /> Advanced Control
          </h3>
          
          <div className="space-y-2">
              <label className={labelClass}>Negative Prompt</label>
              <textarea 
                  value={options.overrides.negative || ''}
                  onChange={(e) => setOptions(p => ({ ...p, overrides: { ...p.overrides, negative: e.target.value } }))}
                  placeholder="e.g. blurry, low quality, dark, messy..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-700 placeholder:text-stone-400 outline-none focus:border-brand-300 min-h-[80px]"
              />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                 <label className={labelClass}>Lighting Mode</label>
                 <select 
                    value={options.overrides.lighting || 'Auto'}
                    onChange={(e) => setOptions(p => ({ ...p, overrides: { ...p.overrides, lighting: e.target.value as LightingStyle } }))}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-700 outline-none"
                 >
                     <option value="Auto">Auto Match</option>
                     <option value="Softbox">Softbox Studio</option>
                     <option value="Hard Rim Light">Hard Rim Light</option>
                     <option value="Natural Window">Natural Window</option>
                     <option value="Golden Hour">Golden Hour</option>
                     <option value="Dark & Moody">Dark & Moody</option>
                 </select>
             </div>
          </div>
      </div>

    </div>
  );
};
