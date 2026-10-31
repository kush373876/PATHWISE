'use client';

import React, { useEffect, useState } from 'react';
import { getSettings, AppSettings } from '@/lib/api';
import { 
  Settings, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e: any) {
      setError(e.message || 'Failed to connect to Pathwise backend API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Settings &amp; System Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure AI providers, inspect extraction limits, and verify API connectivity
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          Test Connection
        </button>
      </div>

      {/* Backend Status Card */}
      <div className={`p-6 rounded-3xl border shadow-xs ${
        settings ? 'bg-white border-slate-200' : 'bg-rose-50 border-rose-200'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${
              settings ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {settings ? <ShieldCheck className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {settings ? 'Pathwise Backend API is Operational' : 'Backend API Disconnected'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {settings
                  ? 'FastAPI server running at http://localhost:8000'
                  : 'Ensure the backend server is running via `python app/main.py` or `uvicorn app.main:app`'}
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
            settings
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-rose-100 text-rose-800 border border-rose-200'
          }`}>
            {settings ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Engine Settings */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">AI Intelligence Engine</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Active Provider:</span>
              <span className="font-bold uppercase font-mono text-slate-800">
                {settings?.ai_provider || 'gemini'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Model:</span>
              <span className="font-semibold font-mono text-indigo-600">
                {settings?.ai_model || 'gemini-1.5-flash'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Gemini Key Configured:</span>
              <span className={`font-semibold ${settings?.has_gemini ? 'text-emerald-600' : 'text-slate-400'}`}>
                {settings?.has_gemini ? 'Yes (Active)' : 'Not Set'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 font-medium">OpenAI Key Configured:</span>
              <span className={`font-semibold ${settings?.has_openai ? 'text-emerald-600' : 'text-slate-400'}`}>
                {settings?.has_openai ? 'Yes (Active)' : 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Limits & Extraction */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <HardDrive className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Document Processing Limits</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Max Upload Size:</span>
              <span className="font-bold text-slate-800">
                {settings?.max_upload_size_mb || 50} MB
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Supported Formats:</span>
              <div className="flex gap-1.5 font-mono text-[10px] font-bold">
                {(settings?.allowed_extensions || ['pdf', 'ppt', 'pptx']).map((ext) => (
                  <span key={ext} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                    .{ext}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 font-medium">OCR Engine:</span>
              <span className="font-semibold text-slate-800">PyTesseract (Tesseract OCR)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guide to configure custom AI keys */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Configuring Your AI Provider Key
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Pathwise includes built-in mock responses so you can develop and explore offline. To enable real generative AI reasoning, open <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-indigo-600">backend/.env</code> and set your API key:
        </p>
        <div className="mt-3 bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
          <code>
            AI_PROVIDER=gemini<br />
            GEMINI_API_KEY=your_gemini_api_key_here<br />
            AI_MODEL=gemini-1.5-flash
          </code>
        </div>
      </div>
    </div>
  );
}
