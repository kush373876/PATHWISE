'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument, DocumentRecord } from '@/lib/api';

interface FileUploadProps {
  onSuccess?: (doc: DocumentRecord) => void;
}

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<DocumentRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploadedFile(null);

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'ppt', 'pptx'].includes(ext)) {
      setError('Only PDF, PPT, and PPTX files are supported.');
      return;
    }

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);

      const result = await uploadDocument(file, (p) => {
        setProgress(p);
      });

      setUploadedFile(result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please check if the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
        } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.ppt,.pptx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800">
              {isUploading ? 'Uploading and analyzing document...' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports textbooks, lecture slides, research papers (PDF, PPT, PPTX up to 50MB)
            </p>
          </div>

          {isUploading && (
            <div className="w-full max-w-xs mt-3">
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {uploadedFile && (
        <div className="mt-3 flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold">{uploadedFile.original_filename}</span>
              <span className="text-emerald-600 ml-2">Status: {uploadedFile.status}</span>
            </div>
          </div>
          <span className="text-emerald-700 font-medium">Ready</span>
        </div>
      )}
    </div>
  );
}
