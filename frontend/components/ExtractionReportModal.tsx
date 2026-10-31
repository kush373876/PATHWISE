'use client';

import React, { useEffect, useState } from 'react';
import { ExtractionReport, getExtractionReport } from '@/lib/api';
import { X, FileCheck, Layers, Image as ImageIcon, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ExtractionReportModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtractionReportModal({
  documentId,
  isOpen,
  onClose,
}: ExtractionReportModalProps) {
  const [report, setReport] = useState<ExtractionReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !documentId) return;
    let isMounted = true;
    async function fetchReport() {
      setIsLoading(true);
      try {
        const data = await getExtractionReport(documentId);
        if (isMounted) setReport(data);
      } catch (e) {
        console.error('Failed to load extraction report', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [documentId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Document Extraction Report</h3>
              <p className="text-xs text-slate-500">Pipeline diagnostic analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Loading report diagnostics...</p>
          </div>
        ) : report ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Total Pages</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{report.total_pages}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Processed Pages</span>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{report.processed_pages}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase">OCR Fallback Pages</span>
                <p className="text-xl font-bold text-amber-600 mt-0.5">{report.ocr_pages}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase">Diagrams Detected</span>
                <p className="text-xl font-bold text-indigo-600 mt-0.5">{report.diagram_pages}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Pipeline Status:</span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {report.status}
              </span>
            </div>

            {report.errors && report.errors.length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Warnings & Errors
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-700">
                  {report.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No diagnostic report available for this document.
          </div>
        )}

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
