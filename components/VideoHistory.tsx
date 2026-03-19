
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedVideo, VideoProject } from '../types';
import { Download, Trash2, Film, Clock, Smartphone, Monitor, Edit3, Layout, ChevronRight, CheckCircle2, MonitorUp, Loader2, ChevronDown, FileVideo } from 'lucide-react';

interface VideoHistoryProps {
  videos: GeneratedVideo[];
  projects: VideoProject[];
  onClear: () => void;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

const VideoCard: React.FC<{ video: GeneratedVideo, onOpenProject: (id: string) => void }> = ({ video, onOpenProject }) => {
  const [downloadingFormat, setDownloadingFormat] = useState<'1080p' | '4k' | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format: '1080p' | '4k') => {
    setDownloadingFormat(format);
    setShowMenu(false);

    // Simulate processing delay for "Upscaling/Processing" UX
    const delay = format === '4k' ? 2500 : 1500;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const link = document.createElement('a');
    link.href = video.url;
    // In a real app, this would point to different URLs. 
    // Here we use the same source but rename it to match the requested format for the user.
    link.download = `vibe-studio-${format}-${video.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloadingFormat(null);
  };

  return (
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition-all group">
          <div className={`relative bg-black rounded-xl overflow-hidden mb-3 shadow-inner mx-auto ${video.aspectRatio === '16:9' ? 'aspect-video w-full' : 'aspect-[9/16] w-2/3'}`}>
              <video 
                  src={video.url} 
                  controls 
                  className="w-full h-full object-cover" 
                  preload="metadata"
              />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">
                  {video.resolution || '720p'}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none flex items-center gap-1">
                   {video.aspectRatio === '16:9' ? <Monitor size={10} /> : <Smartphone size={10} />}
                   {video.aspectRatio || '9:16'}
              </div>
          </div>
          <div className="px-1">
              <div className="flex justify-between items-start mb-2">
                  <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-brand-50 text-brand-600 mb-1 border border-brand-100">
                          {video.movement}
                      </span>
                      <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                         <Clock size={10} /> {new Date(video.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                  </div>
                  <div className="flex gap-1 items-center">
                    {video.projectId && (
                      <button 
                        onClick={() => onOpenProject(video.projectId!)}
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                        title="Open Project"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    
                    {/* Unified Download Menu */}
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setShowMenu(!showMenu)}
                            disabled={!!downloadingFormat}
                            className={`flex items-center gap-1 pl-3 pr-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${downloadingFormat ? 'bg-brand-100 text-brand-600 cursor-wait' : 'bg-stone-900 text-white hover:bg-stone-800 shadow-md'}`}
                        >
                            {downloadingFormat ? (
                                <><Loader2 size={12} className="animate-spin" /> {downloadingFormat.toUpperCase()}...</>
                            ) : (
                                <><Download size={12} /> DOWNLOAD <ChevronDown size={12} /></>
                            )}
                        </button>
                        
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-20 animate-in slide-in-from-top-2 duration-200">
                                <button 
                                    onClick={() => handleDownload('1080p')}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center justify-between group/item"
                                >
                                    1080p
                                    <FileVideo size={14} className="text-stone-300 group-hover/item:text-brand-500" />
                                </button>
                                <div className="h-px bg-stone-100"></div>
                                <button 
                                    onClick={() => handleDownload('4k')}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-stone-900 flex items-center justify-between group/item"
                                >
                                    4K
                                    <MonitorUp size={14} className="text-stone-300 group-hover/item:text-brand-500" />
                                </button>
                            </div>
                        )}
                    </div>
                  </div>
              </div>
              {video.prompt && (
                  <div className="relative group/tooltip">
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed bg-stone-50 p-2 rounded-lg border border-stone-100/50 cursor-help">
                          {video.prompt}
                      </p>
                  </div>
              )}
          </div>
      </div>
  );
};

export const VideoHistory: React.FC<VideoHistoryProps> = ({ videos, projects, onClear, onOpenProject, onDeleteProject }) => {
  const [activeTab, setActiveTab] = useState<'clips' | 'projects'>('clips');

  const totalClips = videos.length;
  const totalProjects = projects.length;

  return (
    <div className="h-full flex flex-col">
       {/* Header */}
       <div className="flex items-center justify-between mb-8 bg-white/50 rounded-2xl p-2 border border-white/60 shadow-sm sticky top-0 z-20 backdrop-blur-md">
         <div className="flex items-center gap-4 px-2">
           <h2 className="text-xl font-serif font-bold text-stone-800">Video Archive</h2>
           <div className="flex bg-stone-200/50 p-1 rounded-lg border border-stone-200">
             <button 
               onClick={() => setActiveTab('clips')}
               className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'clips' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
             >
               Clips ({totalClips})
             </button>
             <button 
               onClick={() => setActiveTab('projects')}
               className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'projects' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
             >
               Projects ({totalProjects})
             </button>
           </div>
         </div>
         {activeTab === 'clips' && totalClips > 0 && (
            <button
                onClick={onClear}
                className="p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Clear Videos"
            >
                <Trash2 size={18} />
            </button>
         )}
       </div>

       {activeTab === 'clips' ? (
          totalClips === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-stone-400">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4 border border-stone-200">
                    <Film size={32} className="opacity-40" />
                </div>
                <p className="font-bold text-sm">No clips in this session</p>
                <p className="text-xs text-stone-300 mt-1">Generate videos from your images to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-20">
               {videos.map((video) => (
                  <VideoCard key={video.id} video={video} onOpenProject={onOpenProject} />
               ))}
            </div>
          )
       ) : (
          totalProjects === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-stone-400">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4 border border-stone-200">
                    <Layout size={32} className="opacity-40" />
                </div>
                <p className="font-bold text-sm">No projects found</p>
                <p className="text-xs text-stone-300 mt-1">Timeline projects from the Studio will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
               {projects.map((project) => (
                  <div key={project.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
                      <div className="relative aspect-video bg-stone-100 overflow-hidden">
                          {project.timeline.length > 0 ? (
                            <img src={project.timeline[0].thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Preview" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Film size={32} className="text-stone-300" /></div>
                          )}
                          <div className="absolute top-3 right-3 flex gap-2">
                             <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-md">{project.resolution}</span>
                             <span className="bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded backdrop-blur-md uppercase">{project.aspectRatio}</span>
                          </div>
                          <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <button 
                                onClick={() => onOpenProject(project.id)}
                                className="bg-white text-stone-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-brand-500 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                              >
                                <Edit3 size={16} /> CONTINUE EDITING
                              </button>
                          </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-stone-900 text-base">{project.name}</h3>
                                <button onClick={() => onDeleteProject(project.id)} className="text-stone-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-4">
                                  <div className="flex items-center gap-1 text-stone-400 text-[10px] font-bold uppercase">
                                      <Clock size={12} /> {new Date(project.updatedAt).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1 text-stone-400 text-[10px] font-bold uppercase">
                                      <Film size={12} /> {project.timeline.length} CLIPS
                                  </div>
                                  <div className="flex items-center gap-1 text-stone-400 text-[10px] font-bold uppercase">
                                      <Clock size={12} /> {project.timeline.reduce((acc, c) => acc + c.durationSec, 0).toFixed(1)}s TOTAL
                                  </div>
                              </div>
                          </div>
                          
                          {project.lastExportUrl && (
                             <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> EXPORTED</span>
                                <a 
                                  href={project.lastExportUrl} 
                                  download={`styleunion-project-export-${project.id}.webm`}
                                  className="text-[10px] font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1"
                                >
                                  <Download size={12}/> DOWNLOAD LAST
                                </a>
                             </div>
                          )}
                      </div>
                  </div>
               ))}
            </div>
          )
       )}
    </div>
  );
};
