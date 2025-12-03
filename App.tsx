import React, { useState, useCallback, useRef } from 'react';
import { UploadedFile, ProcessingStatus } from './types';
import { extractTextFromImage } from './services/geminiService';
import { generateAndDownloadDocx } from './services/docxService';
import { ImageCard } from './components/ImageCard';
import { Button } from './components/Button';
import { UploadCloud, FileDown, Trash2, Wand2, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      // Explicitly cast to File[] to resolve type inference issues with Array.from on FileList
      const filesArray = Array.from(event.target.files) as File[];
      
      const newFiles: UploadedFile[] = filesArray.map(file => ({
        id: uuidv4(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: ProcessingStatus.IDLE,
        extractedText: null
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input to allow selecting the same file again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
        }
        return prev.filter(f => f.id !== id);
    });
  };

  const handleClearAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles(prev => {
        const newFiles = [...prev];
        if (direction === 'up' && index > 0) {
            [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
        } else if (direction === 'down' && index < newFiles.length - 1) {
            [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
        }
        return newFiles;
    });
  };

  const processImages = async () => {
    setIsProcessing(true);
    
    // Process strictly one by one
    const newFiles = [...files];

    // Filter for files that are not yet completed
    const pendingIndices = newFiles
      .map((file, index) => ({ file, index }))
      .filter(item => item.file.status !== ProcessingStatus.COMPLETED);

    for (const { file, index } of pendingIndices) {
      // Update status to processing
      setFiles(prev => {
        const update = [...prev];
        update[index] = { ...update[index], status: ProcessingStatus.PROCESSING };
        return update;
      });

      try {
        const text = await extractTextFromImage(file.file);
        
        setFiles(prev => {
          const update = [...prev];
          update[index] = { 
            ...update[index], 
            status: ProcessingStatus.COMPLETED, 
            extractedText: text 
          };
          return update;
        });
      } catch (error) {
        setFiles(prev => {
            const update = [...prev];
            update[index] = { 
              ...update[index], 
              status: ProcessingStatus.ERROR, 
              errorMessage: error instanceof Error ? error.message : "Unknown error"
            };
            return update;
        });
      }
    }
    setIsProcessing(false);
  };

  const handleDownload = async () => {
      try {
          await generateAndDownloadDocx(files);
      } catch (e) {
          alert("Error generating document: " + (e instanceof Error ? e.message : "Unknown error"));
      }
  };

  const completedCount = files.filter(f => f.status === ProcessingStatus.COMPLETED).length;
  const hasFiles = files.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
           <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-6">
              <Wand2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
             SnapScript OCR
           </h1>
           <p className="text-lg text-slate-600 max-w-2xl mx-auto">
             Upload images containing text or chemical formulas. We'll transcribe them and compile everything into a single Word document.
           </p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 sticky top-4 z-10 backdrop-blur-md bg-white/90">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()}
                        icon={<UploadCloud size={20} />}
                        className="w-full sm:w-auto"
                    >
                        Upload Images
                    </Button>
                    
                    {hasFiles && (
                        <Button 
                            variant="ghost" 
                            onClick={handleClearAll}
                            title="Clear all files"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={20} />
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {hasFiles && (
                        <>
                           <div className="text-sm font-medium text-slate-500 hidden sm:block">
                                {completedCount} / {files.length} Ready
                           </div>
                           <Button 
                                variant="secondary"
                                onClick={processImages}
                                disabled={isProcessing}
                                isLoading={isProcessing}
                                icon={<RefreshCw size={18} />}
                                className="w-full sm:w-auto"
                           >
                                {isProcessing ? 'Processing...' : 'Process All'}
                           </Button>
                           <Button 
                                variant="primary"
                                onClick={handleDownload}
                                disabled={completedCount === 0}
                                icon={<FileDown size={20} />}
                                className="w-full sm:w-auto"
                           >
                                Download Word
                           </Button>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* File List */}
        <div className="space-y-4">
            {files.length === 0 ? (
                <div 
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-indigo-400 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No images uploaded yet</h3>
                    <p className="text-slate-500 mt-2">Click here or drag and drop images to start converting.</p>
                </div>
            ) : (
                files.map((file, index) => (
                    <ImageCard 
                        key={file.id} 
                        item={file} 
                        index={index}
                        totalCount={files.length}
                        onRemove={handleRemoveFile}
                        onMoveUp={() => moveFile(index, 'up')}
                        onMoveDown={() => moveFile(index, 'down')}
                    />
                ))
            )}
        </div>

      </div>
    </div>
  );
};

export default App;