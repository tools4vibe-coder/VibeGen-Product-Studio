
import React, { useRef, useState } from 'react';
import { Layers, Upload, X, Plus, Trash2, Box, ChevronDown } from 'lucide-react';
import { GroupGenerationOptions, GroupMember, ProductCategory } from '../types';
import { fileToBase64, generateId, scrapeProductInfo, fetchImageFromUrl } from '../utils/helpers';

interface GroupStudioProps {
  options: GroupGenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GroupGenerationOptions>>;
}

export const GroupStudio: React.FC<GroupStudioProps> = ({ options, setOptions }) => {
  const [isMembersOpen, setIsMembersOpen] = useState(true);

  const addMember = () => {
    if (options.members.length >= 6) return;
    const newMember: GroupMember = {
      id: generateId(),
      productImage: null,
      category: ProductCategory.OTHER,
      description: ''
    };
    setOptions(prev => ({ ...prev, members: [...prev.members, newMember] }));
  };

  const removeMember = (id: string) => {
    if (options.members.length <= 2) return;
    setOptions(prev => ({ ...prev, members: prev.members.filter(m => m.id !== id) }));
  };

  const updateMember = (id: string, field: keyof GroupMember, value: any) => {
    setOptions(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const handleProductUpload = async (id: string, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      updateMember(id, 'productImage', base64);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start gap-3 mb-6">
        <div className="bg-stone-200 p-2 rounded-full text-stone-600">
          <Layers size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Product Collection</h3>
          <p className="text-xs text-stone-500 mt-1">
            Arrange multiple products (2-6) in a single composition. Perfect for bundle shots, gift sets, or full lifestyle scenes.
          </p>
        </div>
      </div>

      <section className="transition-all duration-300">
        <div 
           onClick={() => setIsMembersOpen(!isMembersOpen)}
           className="flex justify-between items-center mb-4 cursor-pointer group select-none"
        >
           <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wide">Collection Items ({options.members.length}/6)</h3>
           <div className="flex items-center gap-2">
              {isMembersOpen && options.members.length < 6 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); addMember(); }}
                  className="text-xs font-bold flex items-center gap-1 bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
                >
                  <Plus size={14} /> Add Item
                </button>
              )}
              <ChevronDown className={`text-stone-400 transition-transform ${isMembersOpen ? 'rotate-180' : ''}`} size={18} />
           </div>
        </div>

        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isMembersOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-1 gap-4">
            {options.members.map((member, index) => (
                <MemberCard 
                key={member.id} 
                member={member} 
                index={index} 
                onUpdate={updateMember}
                onRemove={() => removeMember(member.id)}
                canRemove={options.members.length > 2}
                onUpload={(f) => handleProductUpload(member.id, f)}
                />
            ))}
            </div>
        </div>
      </section>
    </div>
  );
};

interface MemberCardProps {
  member: GroupMember;
  index: number;
  onUpdate: (id: string, field: keyof GroupMember, value: any) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  canRemove: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, index, onUpdate, onRemove, onUpload, canRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const handleUrlImport = async () => {
    if (!urlInput) return;
    setIsLoadingUrl(true);
    try {
       const { image } = await scrapeProductInfo(urlInput, false);
       const { base64 } = await fetchImageFromUrl(image);
       onUpdate(member.id, 'productImage', base64);
       setUrlInput('');
       setIsUrlMode(false);
    } catch (e: any) {
       alert(e.message || "Import failed");
    } finally {
       setIsLoadingUrl(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm relative group">
      <div className="flex gap-4">
        <div className="w-24 shrink-0 flex flex-col gap-2">
          <div 
            className={`w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all ${
              member.productImage 
                 ? 'border-stone-900 bg-stone-50'
                 : 'border-stone-200 bg-stone-50 hover:border-brand-300'
            }`}
          >
            {member.productImage ? (
              <>
                <img src={member.productImage} alt="Product" className="w-full h-full object-contain p-2" />
                <button 
                  onClick={() => onUpdate(member.id, 'productImage', null)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : isUrlMode ? (
               <div className="p-1 flex flex-col items-center justify-center h-full">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="URL"
                    className="w-full text-[9px] p-1 border rounded mb-1"
                  />
                  <button onClick={handleUrlImport} className="bg-brand-600 text-white text-[9px] px-2 py-0.5 rounded">
                    {isLoadingUrl ? '...' : 'OK'}
                  </button>
               </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="text-center cursor-pointer"
              >
                <Upload size={16} className="mx-auto text-stone-400" />
                <span className="text-[8px] font-bold text-stone-500">IMAGE</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}/>
          </div>
          {!member.productImage && !isUrlMode && (
             <button onClick={() => setIsUrlMode(true)} className="text-[9px] font-bold text-brand-600">PASTE URL</button>
          )}
        </div>

        <div className="flex-1 space-y-3">
           <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-700">Item {index + 1}</span>
              {canRemove && <button onClick={onRemove} className="text-stone-300 hover:text-red-500"><X size={14} /></button>}
           </div>
           
           <div className="space-y-1">
              <label className="text-[9px] font-bold text-stone-400 uppercase">Category</label>
              <select 
                value={member.category} 
                onChange={(e) => onUpdate(member.id, 'category', e.target.value)} 
                className="w-full p-2 rounded-lg border border-stone-200 text-[10px] font-bold text-stone-700 outline-none"
              >
                {Object.values(ProductCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
           
           <input 
              type="text" 
              value={member.description}
              onChange={(e) => onUpdate(member.id, 'description', e.target.value)}
              placeholder="Short description (e.g. Red Toaster, Leather Bag)..."
              className="w-full p-2 border border-stone-200 rounded-lg bg-stone-50 text-[10px] outline-none focus:border-brand-300"
           />
        </div>
      </div>
    </div>
  );
};
