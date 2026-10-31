'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  getDocument, 
  getRoadmap, 
  getTopics, 
  getDocumentProgress, 
  DocumentRecord, 
  Roadmap, 
  Topic, 
  TopicProgress, 
  reprocessDocument,
  ExtractedElement
} from '@/lib/api';
import RoadmapView from '@/components/RoadmapView';
import DocumentViewer from '@/components/DocumentViewer';
import AITutor from '@/components/AITutor';
import AssessmentQuiz from '@/components/AssessmentQuiz';
import ExtractionReportModal from '@/components/ExtractionReportModal';
import { 
  Compass, 
  FileText, 
  Sparkles, 
  GraduationCap, 
  ArrowLeft, 
  RefreshCw, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers,
  Loader2
} from 'lucide-react';

export default function DocumentStudyHubPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progressList, setProgressList] = useState<TopicProgress[]>([]);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'reader' | 'tutor' | 'quiz'>('roadmap');

  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isReprocessing, setIsReprocessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAllData = async () => {
    if (!id) return;
    try {
      const [docData, roadmapData, topicsData, progressData] = await Promise.all([
        getDocument(id).catch(() => null),
        getRoadmap(id).catch(() => null),
        getTopics(id).catch(() => []),
        getDocumentProgress(id).catch(() => []),
      ]);

      setDocument(docData);
      setRoadmap(roadmapData);
      setTopics(topicsData);
      setProgressList(progressData);

      // Default selected topic to first topic
      if (topicsData.length > 0 && !selectedTopicId) {
        setSelectedTopicId(topicsData[0].id);
      }
    } catch (e) {
      console.error('Error loading study hub data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  // Polling while document is processing
  useEffect(() => {
    if (!document) return;
    if (document.status !== 'completed' && document.status !== 'failed') {
      const interval = setInterval(loadAllData, 4000);
      return () => clearInterval(interval);
    }
  }, [document]);

  const handleReprocess = async () => {
    if (!id) return;
    setIsReprocessing(true);
    try {
      await reprocessDocument(id);
      await loadAllData();
    } catch (err: any) {
      alert(`Reprocessing error: ${err.message}`);
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleSelectTopicForTutor = (topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveTab('tutor');
  };

  const handleSelectTopicForQuiz = (topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveTab('quiz');
  };

  const currentTopic = topics.find((t) => t.id === selectedTopicId);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading Document Study Hub...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Document Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested document could not be located in your workspace.
        </p>
        <Link
          href="/documents"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
        >
          Return to Documents
        </Link>
      </div>
    );
  }

  const isProcessing = document.status !== 'completed' && document.status !== 'failed';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Documents
          </Link>

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {document.original_filename}
            </h1>
            <span className="uppercase font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {document.file_type}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span>{document.total_pages || 0} pages</span>
            <span>&bull;</span>
            <span className="capitalize">{document.status.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <FileCheck className="h-3.5 w-3.5 text-slate-500" />
            Extraction Report
          </button>
          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isReprocessing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            {isReprocessing ? 'Reprocessing...' : 'Reprocess'}
          </button>
        </div>
      </div>

      {/* Processing Notice Banner if document is actively being analyzed */}
      {isProcessing && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Pipeline Processing: {document.status.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Extracting slides, formulas, diagrams, and synthesizing roadmap topics. This view will update automatically.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-600">Auto-refreshing...</span>
        </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-4 overflow-x-auto">
        {[
          { key: 'roadmap', label: 'Learning Roadmap', icon: Compass },
          { key: 'reader', label: 'Document & Visuals', icon: FileText },
          { key: 'tutor', label: 'Interactive AI Tutor', icon: Sparkles },
          { key: 'quiz', label: 'Adaptive Quiz', icon: GraduationCap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Study Mode Topic Selector (shared across Tutor & Quiz) */}
      {(activeTab === 'tutor' || activeTab === 'quiz') && topics.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Focus Topic:
            </span>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.difficulty})
                </option>
              ))}
            </select>
          </div>

          {currentTopic && (
            <div className="text-xs text-slate-500">
              Est. Study Time: <strong className="text-slate-700">{currentTopic.estimated_minutes || 15} mins</strong>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Roadmap View */}
      {activeTab === 'roadmap' && (
        <RoadmapView
          roadmap={roadmap}
          progressList={progressList}
          onSelectTopicForTutor={handleSelectTopicForTutor}
          onSelectTopicForQuiz={handleSelectTopicForQuiz}
          onRefresh={loadAllData}
        />
      )}

      {/* Tab 2: Document Reader View */}
      {activeTab === 'reader' && (
        <DocumentViewer
          documentId={document.id}
          totalPages={document.total_pages || 1}
          onAskTutorAboutElement={(elem, explanation) => {
            if (elem.topic_id) setSelectedTopicId(elem.topic_id);
            setActiveTab('tutor');
          }}
        />
      )}

      {/* Tab 3: Interactive AI Tutor */}
      {activeTab === 'tutor' && (
        <AITutor
          documentId={document.id}
          topicId={selectedTopicId}
          topicTitle={currentTopic?.title}
        />
      )}

      {/* Tab 4: Adaptive Assessment Quiz */}
      {activeTab === 'quiz' && (
        <AssessmentQuiz
          documentId={document.id}
          topicId={selectedTopicId}
          topicTitle={currentTopic?.title}
          onAssessmentCompleted={() => loadAllData()}
        />
      )}

      {/* Extraction Report Modal */}
      <ExtractionReportModal
        documentId={document.id}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}
