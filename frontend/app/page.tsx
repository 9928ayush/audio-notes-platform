"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Markdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AudioJob {
  id: string;
  filename: string;
  status: 'UPLOADED' | 'UPLOADING' | 'TRANSCRIBING' | 'SUMMARIZING' | 'COMPLETED' | 'FAILED';
  transcript?: string;
  summary?: string;
  error_message?: string;
  created_at: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [activeJob, setActiveJob] = useState<AudioJob | null>(null);
  const [history, setHistory] = useState<AudioJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs`);
      if (res.ok) {
        const data: AudioJob[] = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history");
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeJob && activeJob.id && !["COMPLETED", "FAILED"].includes(activeJob.status)) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/jobs/${activeJob.id}`);
          if (res.ok) {
            const updatedJob: AudioJob = await res.json();
            setActiveJob(updatedJob);
            if (["COMPLETED", "FAILED"].includes(updatedJob.status)) {
              clearInterval(interval);
              fetchHistory();
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeJob]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      setActiveJob({ status: "UPLOADING", filename: file.name, created_at: new Date().toISOString() } as AudioJob);
      
      const res = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setActiveJob(data);
        setFile(null); // Clear file selection after upload starts
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setActiveJob({ status: "FAILED", error_message: data.detail || "Upload failed." } as AudioJob);
      }
    } catch (err) {
      setActiveJob({ status: "FAILED", error_message: "Network error during upload." } as AudioJob);
    }
  };

  const isProcessing = activeJob !== null && !["COMPLETED", "FAILED"].includes(activeJob.status);

  // Status mapping for simple timeline
  const getStatusStep = (status: string) => {
    switch (status) {
      case 'UPLOADED': case 'UPLOADING': return 0;
      case 'TRANSCRIBING': return 1;
      case 'SUMMARIZING': return 2;
      case 'COMPLETED': return 3;
      case 'FAILED': return -1;
      default: return 0;
    }
  };

  const currentStep = activeJob ? getStatusStep(activeJob.status) : 0;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111] font-sans antialiased selection:bg-neutral-200">
      
      {/* Navbar */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between text-sm">
          <div className="font-semibold tracking-tight">Audio Notes</div>
          <nav className="flex gap-6 text-neutral-500">
            <button 
              onClick={() => { setActiveJob(null); setFile(null); }} 
              className="hover:text-neutral-900 transition-colors"
            >
              Upload
            </button>
            <Link href="/architecture" className="hover:text-neutral-900 transition-colors">
              Architecture
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
        
        {/* Left Column (Main Workspace) */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          
          {!activeJob ? (
            // INITIAL STATE: Introduction & Upload
            <>
              <div>
                <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest mb-3">Audio Notes</div>
                <h1 className="text-2xl md:text-3xl font-medium tracking-tight mb-3">Turn conversations into notes.</h1>
                <p className="text-neutral-500 text-sm md:text-base leading-relaxed max-w-lg">
                  Upload an audio recording and get a searchable transcript and concise summary.
                </p>
              </div>

              <div 
                className={`border border-neutral-200 bg-white p-8 md:p-12 transition-colors ${!file ? 'hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                {!file ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium mb-1">Drop an audio file here</p>
                    <p className="text-sm text-neutral-500 mb-6">or choose a file from your device</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="text-sm px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 transition-colors rounded-sm"
                    >
                      Choose file
                    </button>
                    <p className="text-[11px] text-neutral-400 mt-6 uppercase tracking-wider">Supports all standard and mobile audio formats</p>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium truncate max-w-sm">{file.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => setFile(null)}
                        className="text-sm px-4 py-2 border border-neutral-200 text-neutral-500 hover:bg-neutral-50 rounded-sm flex-1 md:flex-none"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleUpload}
                        className="text-sm px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 rounded-sm flex-1 md:flex-none"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="audio/*,video/mp4,video/3gpp,.aac,.m4a,.ogg,.mp3,.wav,.3gp,.amr,.mp4" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden"
                />
              </div>
            </>
          ) : (
            // ACTIVE JOB STATE: Processing or Completed
            <div className="flex flex-col gap-10">
              
              {/* Header */}
              <div className="border-b border-neutral-200 pb-6">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-xl font-medium tracking-tight truncate pr-4">{activeJob.filename}</h2>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">
                    {new Date(activeJob.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Minimal Timeline */}
                <div className="flex gap-6 mt-4 text-xs font-medium">
                  <div className={`flex items-center gap-2 ${currentStep >= 0 ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {currentStep > 0 ? '✓' : currentStep === 0 ? '•' : '○'} Upload
                  </div>
                  <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {currentStep > 1 ? '✓' : currentStep === 1 ? '•' : '○'} Transcription
                  </div>
                  <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {currentStep > 2 ? '✓' : currentStep === 2 ? '•' : '○'} Summary
                  </div>
                </div>
              </div>

              {/* Status Content */}
              {activeJob.status === "FAILED" && (
                <div className="border border-neutral-200 bg-white p-6">
                  <h3 className="text-sm font-medium mb-2">Processing failed</h3>
                  <p className="text-sm text-neutral-500 mb-4">{activeJob.error_message || "The audio could not be processed."}</p>
                  <button 
                    onClick={() => setActiveJob(null)}
                    className="text-sm px-4 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-sm"
                  >
                    Try another file
                  </button>
                </div>
              )}

              {activeJob.status === "COMPLETED" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div>
                    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">Summary</h3>
                    <div className="prose prose-sm prose-neutral max-w-none text-sm leading-relaxed">
                      <Markdown>{activeJob.summary}</Markdown>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-4">Transcript</h3>
                    <div className="text-sm leading-relaxed text-neutral-600 font-serif whitespace-pre-wrap">
                      {activeJob.transcript}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (History) */}
        <div className="lg:col-span-4">
          <div className="sticky top-14 pt-8 lg:pt-0 border-t border-neutral-200 lg:border-t-0">
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-6">Recent notes</h2>
            
            {history.length === 0 ? (
              <p className="text-sm text-neutral-500">Your uploaded recordings will appear here.</p>
            ) : (
              <div className="flex flex-col">
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-neutral-200 text-xs text-neutral-400 mb-2">
                  <div className="col-span-6">File</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-3 text-right">Date</div>
                </div>
                <div className="max-h-[600px] overflow-y-auto pr-2 flex flex-col gap-1">
                  {history.map((job) => (
                    <div 
                      key={job.id}
                      onClick={() => {
                        setActiveJob(job);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`grid grid-cols-12 gap-4 py-2 px-2 -mx-2 text-sm cursor-pointer hover:bg-neutral-100 rounded-sm transition-colors ${activeJob?.id === job.id ? 'bg-neutral-100' : ''}`}
                    >
                      <div className="col-span-6 truncate font-medium text-neutral-800" title={job.filename}>
                        {job.filename}
                      </div>
                      <div className="col-span-3 text-neutral-500 capitalize">
                        {job.status.toLowerCase()}
                      </div>
                      <div className="col-span-3 text-right text-neutral-400 truncate">
                        {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
}