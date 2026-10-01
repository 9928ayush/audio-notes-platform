"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Markdown from 'react-markdown';
import { UploadCloud, FileAudio, RefreshCw, AlertCircle, CheckCircle, Trash2 } from "lucide-react";

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

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      setActiveJob({ status: "UPLOADING" } as AudioJob);
      const res = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setActiveJob(data);
      } else {
        setActiveJob({ status: "FAILED", error_message: data.detail || "Upload failed." } as AudioJob);
      }
    } catch (err) {
      setActiveJob({ status: "FAILED", error_message: "Network error during upload." } as AudioJob);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(history.filter(job => job.id !== id));
        if (activeJob?.id === id) setActiveJob(null);
      }
    } catch (err) {
      console.error("Failed to delete job", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="text-green-500" />;
      case "FAILED": return <AlertCircle className="text-red-500" />;
      default: return <RefreshCw className="text-blue-500 animate-spin" />;
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-8">
        <div className="flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold">Audio Notes</h1>
            <p className="text-gray-500 mt-1">AI-powered transcription and summarization</p>
          </div>
          <Link href="/architecture" className="text-sm font-medium text-blue-600 hover:underline">
            View Architecture &rarr;
          </Link>
        </div>

        <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl p-10 text-center flex flex-col items-center">
          <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
          <input 
            type="file" 
            accept="audio/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            className="mb-4 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
          />
          <button 
            onClick={handleUpload}
            disabled={!file || (activeJob!=null && !["COMPLETED", "FAILED"].includes(activeJob.status))}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium w-full max-w-xs"
          >
            Process Audio
          </button>
        </div>

        {activeJob && (
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon(activeJob?.status)}
              <h2 className="text-lg font-semibold capitalize">{activeJob?.status?.toLowerCase() || "Processing..."}</h2>
            </div>
            
            {activeJob.status === "FAILED" && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm border border-red-100">
                {activeJob.error_message || "An unknown error occurred during processing."}
              </div>
            )}

            {activeJob.status === "COMPLETED" && (
              <div className="space-y-6 mt-4">
                <div className="bg-blue-50/50 p-5 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-blue-900 mb-3 text-sm uppercase">AI Summary</h3>
                  <div className="text-sm text-gray-800">
                    <Markdown 
                      components={{
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mt-4 mb-2 text-blue-950" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-blue-950" {...props} />,
                      }}
                    >
                      {activeJob.summary}
                    </Markdown>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm uppercase">Full Transcript</h3>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">{activeJob.transcript}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 h-fit shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-gray-500" /> Past Uploads
        </h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">No past uploads found.</p>
          ) : (
            history.map((job) => (
              <div 
                key={job.id} 
                className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                onClick={() => setActiveJob(job)}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm text-gray-900 truncate pr-2" title={job.filename}>{job.filename}</div>
                  <button 
                    onClick={(e) => handleDelete(job.id, e)} 
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                  <span className="capitalize font-medium">{job?.status?.toLowerCase() || "unknown"}</span>
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}