'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  getDocuments, 
  reprocessDocument, 
  DocumentRecord 
} from '@/lib/api';
import FileUpload from '@/components/FileUpload';
import ExtractionReportModal from '@/components/ExtractionReportModal';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileCheck,
  Loader2,
  Trash2
} from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReportDocId, setSelectedReportDocId] = useState<string | null>(null);
  const [reprocessingIds, setReprocessingIds] = useState<Record<string, boolean>>({});

  const loadDocuments = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error('Failed to load documents', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // Poll every 5s if any doc is actively processing
    const interval = setInterval(() => {
      if (documents.some((d) => d.status !== 'completed' && d.status !== 'failed')) {
        loadDocuments();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [documents]);

  const handleReprocess = async (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReprocessingIds((prev) => ({ ...prev, [docId]: true }));
    try {
      await reprocessDocument(docId);
      await loadDocuments();
    } catch (err: any) {
      alert(`Reprocessing failed: ${err.message}`);
    } finally {
      setReprocessingIds((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && doc.status === 'completed') ||
      (statusFilter === 'processing' && doc.status !== 'completed' && doc.status !== 'failed') ||
      (statusFilter === 'failed' && doc.status === 'failed');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your course materials, textbooks, and presentations
          </p>
        </div>

        <button
          onClick={loadDocuments}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          Refresh
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-1">Add New Material</h2>
        <p className="text-xs text-slate-500 mb-4">
          Upload PDF or PPT slides to automatically extract concepts and generate interactive study guides.
        </p>
        <FileUpload onSuccess={() => loadDocuments()} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl">
          {(['all', 'completed', 'processing', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                statusFilter === s
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading document library...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No documents matching "${searchQuery}". Try a different keyword.`
              : 'Upload your first study document above to begin.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const isProcessing = doc.status !== 'completed' && doc.status !== 'failed';
            const statusConfig = {
              completed: {
                label: 'Completed',
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: CheckCircle2,
              },
              failed: {
                label: 'Failed',
                bg: 'bg-rose-50 text-rose-700 border-rose-200',
                icon: AlertCircle,
              },
              pending: {
                label: 'Queued',
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Clock,
              },
              extracting_text: {
                label: 'Extracting Text',
                bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                icon: Loader2,
              },
              generating_roadmap: {
                label: 'Building Roadmap',
                bg: 'bg-violet-50 text-violet-700 border-violet-200',
                icon: Sparkles,
              },
            }[doc.status] || {
              label: doc.status.replace(/_/g, ' '),
              bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              icon: Loader2,
            };

            const StatusIcon = statusConfig.icon;
            const fileSizeMb = (doc.file_size / (1024 * 1024)).toFixed(1);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                      <FileText className="h-5 w-5" />
                    </div>

                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.bg}`}>
                      <StatusIcon className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`} />
                      {statusConfig.label}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1" title={doc.original_filename}>
                    {doc.original_filename}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="uppercase font-mono font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {doc.file_type}
                    </span>
                    <span>&bull;</span>
                    <span>{fileSizeMb} MB</span>
                    <span>&bull;</span>
                    <span>{doc.total_pages || 0} pages</span>
                  </div>

                  {doc.error_message && (
                    <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700">
                      {doc.error_message}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedReportDocId(doc.id)}
                      title="View extraction report"
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                    >
                      <FileCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleReprocess(doc.id, e)}
                      disabled={reprocessingIds[doc.id]}
                      title="Reprocess document"
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw className={`h-4 w-4 ${reprocessingIds[doc.id] ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                  </div>

                  <Link
                    href={`/documents/${doc.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-all"
                  >
                    <span>Study Hub</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extraction Report Modal */}
      {selectedReportDocId && (
        <ExtractionReportModal
          documentId={selectedReportDocId}
          isOpen={!!selectedReportDocId}
          onClose={() => setSelectedReportDocId(null)}
        />
      )}
    </div>
  );
}
