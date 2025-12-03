import React from 'react';
import { UploadedFile, ProcessingStatus } from '../types';
import { CheckCircle2, AlertCircle, Loader2, X, FileText, ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';

interface ImageCardProps {
  item: UploadedFile;
  index: number;
  totalCount: number;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ 
  item, 
  index, 
  totalCount, 
  onRemove, 
  onMoveUp, 
  onMoveDown 
}) => {
  return (
    <div className="group relative flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
      
      {/* Order Controls (Left Side) */}
      <div className="hidden sm:flex flex-col justify-center items-center gap-1 pr-2 border-r border-slate-100 mr-2">
        <button
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move Up"
        >
          <ArrowUp size={16} />
        </button>
        <span className="text-xs font-mono text-slate-400 font-medium">{index + 1}</span>
        <button
          onClick={() => onMoveDown(index)}
          disabled={index === totalCount - 1}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move Down"
        >
          <ArrowDown size={16} />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-100">
        {item.file.type.startsWith('image/') ? (
          <img 
            src={item.previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-slate-400">
             <ImageIcon size={32} />
           </div>
        )}
        
        {/* Status Badge Overlay */}
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
             {item.status === ProcessingStatus.PROCESSING && (
               <div className="bg-white/90 p-2 rounded-full shadow-lg backdrop-blur-sm">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
               </div>
             )}
             {item.status === ProcessingStatus.COMPLETED && (
               <div className="bg-green-500/90 p-2 rounded-full shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
               </div>
             )}
             {item.status === ProcessingStatus.ERROR && (
               <div className="bg-red-500/90 p-2 rounded-full shadow-lg">
                  <AlertCircle className="w-5 h-5 text-white" />
               </div>
             )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start">
            <div className="pr-8 flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="sm:hidden text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">#{index + 1}</span>
                    <h4 className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={item.file.name}>
                    {item.file.name}
                    </h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                {(item.file.size / 1024).toFixed(1)} KB
                </p>
            </div>
            
            <div className="flex items-center gap-1">
                {/* Mobile Order Controls */}
                <div className="flex sm:hidden mr-2 bg-slate-50 rounded-lg border border-slate-100">
                    <button
                    onClick={() => onMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 disabled:opacity-30"
                    >
                    <ArrowUp size={14} />
                    </button>
                    <button
                    onClick={() => onMoveDown(index)}
                    disabled={index === totalCount - 1}
                    className="p-1.5 text-slate-400 disabled:opacity-30 border-l border-slate-100"
                    >
                    <ArrowDown size={14} />
                    </button>
                </div>

                <button 
                    onClick={() => onRemove(item.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-slate-50"
                >
                    <X size={18} />
                </button>
            </div>
        </div>

        {/* Extraction Preview Snippet */}
        <div className="mt-3 flex-1">
             {item.status === ProcessingStatus.COMPLETED && item.extractedText ? (
                 <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 h-24 overflow-hidden relative">
                     <p className="text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                        {item.extractedText.slice(0, 200)}...
                     </p>
                     <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent"></div>
                 </div>
             ) : item.status === ProcessingStatus.ERROR ? (
                 <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg">
                    Failed to extract text. {item.errorMessage}
                 </div>
             ) : (
                <div className="h-24 flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                     <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText size={16} />
                        <span className="text-xs">Waiting to extract...</span>
                     </div>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};