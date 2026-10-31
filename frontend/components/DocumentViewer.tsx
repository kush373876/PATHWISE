'use client';

import React, { useState, useEffect } from 'react';
import { 
  getPage, 
  thumbnailUrl, 
  PageData, 
  ExtractedElement,
  explainSelectedContent 
} from '@/lib/api';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  Layers, 
  HelpCircle,
  Maximize2,
  Table,
  Image as ImageIcon,
  Code2,
  FileCheck2,
  Loader2
} from 'lucide-react';

interface DocumentViewerProps {
  documentId: string;
  totalPages: number;
  onAskTutorAboutElement?: (element: ExtractedElement, explanation: string) => void;
}

export default function DocumentViewer({
  documentId,
  totalPages,
  onAskTutorAboutElement,
}: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedElement, setSelectedElement] = useState<ExtractedElement | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [elementExplanation, setElementExplanation] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadPage() {
      setIsLoading(true);
      setSelectedElement(null);
      setElementExplanation(null);
      try {
        const data = await getPage(documentId, currentPage);
        if (isMounted) setPageData(data);
      } catch (e) {
        console.error('Failed to load page data', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadPage();
    return () => {
      isMounted = false;
    };
  }, [documentId, currentPage]);

  const handleExplainElement = async (elem: ExtractedElement) => {
    setSelectedElement(elem);
    setIsExplaining(true);
    setElementExplanation(null);
    try {
      const res = await explainSelectedContent({
        document_id: documentId,
        element_id: elem.id,
        topic_id: elem.topic_id,
      });
      setElementExplanation(res.response);
      if (onAskTutorAboutElement) {
        onAskTutorAboutElement(elem, res.response);
      }
    } catch (e: any) {
      setElementExplanation(`Failed to generate explanation: ${e.message}`);
    } finally {
      setIsExplaining(false);
    }
  };

  const getElementTypeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      title: { label: 'Title', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: FileText },
      heading: { label: 'Heading', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Layers },
      table: { label: 'Table', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Table },
      diagram: { label: 'Diagram / Image', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: ImageIcon },
      formula: { label: 'Formula / Math', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: Code2 },
      bullet: { label: 'Bullet', color: 'bg-sky-100 text-sky-800 border-sky-200', icon: FileCheck2 },
    };
    return map[type] || { label: type, color: 'bg-slate-100 text-slate-800 border-slate-200', icon: FileText };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Thumbnail Sidebar */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 h-[750px] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-indigo-600" />
            Pages ({totalPages || 1})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages || 1}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left border transition-all ${
                currentPage === pageNum
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200/50'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="h-10 w-9 bg-slate-200 rounded border border-slate-300 flex items-center justify-center shrink-0 text-xs font-semibold text-slate-600 overflow-hidden">
                <img
                  src={thumbnailUrl(documentId, pageNum)}
                  alt={`Page ${pageNum}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to text icon if thumbnail is not yet rendered
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-[10px] text-slate-500">{pageNum}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  Page {pageNum}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentPage === pageNum && pageData?.title ? pageData.title : 'Content module'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Page Viewer & Element Inspector */}
      <div className="lg:col-span-9 space-y-6">
        {/* Navigation Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage >= (totalPages || 1)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {pageData?.ocr_used && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                OCR Extracted
              </span>
            )}
            {pageData?.has_images && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                Has Visuals
              </span>
            )}
            {pageData?.has_tables && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                Has Tables
              </span>
            )}
          </div>
        </div>

        {/* Page Content & Elements */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Loading page {currentPage}...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Raw Text View */}
            <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-[650px] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Extracted Page Content
              </h4>
              {pageData?.title && (
                <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                  {pageData.title}
                </h3>
              )}
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {pageData?.raw_text || 'No text extracted on this page.'}
              </div>
            </div>

            {/* Interactive Elements / AI Inquisitor */}
            <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-[650px] flex flex-col">
              <div className="pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Interactive Elements
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any element below to get targeted AI tutoring on formulas, diagrams, or sections.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {pageData?.elements && pageData.elements.length > 0 ? (
                  pageData.elements.map((elem) => {
                    const badge = getElementTypeBadge(elem.element_type);
                    const isSelected = selectedElement?.id === elem.id;

                    return (
                      <div
                        key={elem.id}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                            : 'bg-slate-50/50 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <button
                            onClick={() => handleExplainElement(elem)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded-md border border-indigo-100 shadow-2xs hover:bg-indigo-50"
                          >
                            <Sparkles className="h-3 w-3" />
                            Explain
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 font-mono line-clamp-3 bg-white/70 p-2 rounded-lg border border-slate-100">
                          {elem.content || '[Visual diagram / element]'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No discrete elements segmented on this page.
                  </div>
                )}
              </div>

              {/* Element Explanation Preview */}
              {(isExplaining || elementExplanation) && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="bg-indigo-900 text-white rounded-xl p-3.5 text-xs max-h-48 overflow-y-auto">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-200 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Tutor Breakdown
                    </div>
                    {isExplaining ? (
                      <div className="flex items-center gap-2 text-indigo-200 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Analyzing element context...</span>
                      </div>
                    ) : (
                      <p className="text-slate-100 leading-relaxed whitespace-pre-wrap">
                        {elementExplanation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
