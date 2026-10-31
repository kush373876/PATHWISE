'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  getDashboard, 
  getDocuments, 
  Dashboard, 
  DocumentRecord 
} from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import FileUpload from '@/components/FileUpload';
import { 
  FileText, 
  Compass, 
  CheckCircle2, 
  Flame, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  BookOpen, 
  UploadCloud,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashData, docsData] = await Promise.all([
        getDashboard().catch(() => null),
        getDocuments().catch(() => []),
      ]);
      setDashboard(dashData);
      setDocuments(docsData);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDocs = dashboard?.total_documents ?? documents.length;
  const activeRoadmaps = dashboard?.active_roadmaps ?? (documents.filter(d => d.status === 'completed').length);
  const completedTopics = dashboard?.completed_topics ?? 0;
  const totalTopics = dashboard?.total_topics ?? 0;
  const streak = dashboard?.learning_streak_days ?? 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-8 sm:p-10 text-white shadow-xl shadow-indigo-950/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            AI-Powered Personalized Learning
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back to Pathwise.
          </h1>
          <p className="mt-2 text-base text-indigo-200 leading-relaxed">
            Upload your course syllabi, textbooks, or presentation slides. Pathwise automatically analyzes the document structure, segments key topics, generates custom learning roadmaps, and tutors you step-by-step.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <FileText className="h-4 w-4 text-indigo-600" />
              Manage Documents
            </Link>
            <a
              href="#quick-upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700/60 border border-indigo-500/40 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
            >
              <UploadCloud className="h-4 w-4" />
              Upload New Material
            </a>
          </div>
        </div>

        {/* Brand visual emblem */}
        <div className="relative z-10 shrink-0 hidden md:flex items-center justify-center p-3 rounded-3xl bg-white/10 backdrop-blur border border-white/20 shadow-2xl shadow-indigo-950/50">
          <div className="h-32 w-32 rounded-2xl bg-white flex items-center justify-center p-2.5 shadow-inner">
            <Image
              src="/logo.png"
              alt="Pathwise Emblem"
              width={120}
              height={120}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Subtle decorative background circles */}
        <div className="absolute -right-12 -bottom-16 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-20 w-60 h-60 rounded-full bg-violet-600/20 blur-2xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Document Library"
          value={totalDocs}
          subtitle="Processed study materials"
          icon={FileText}
          color="indigo"
        />
        <StatsCard
          title="Active Roadmaps"
          value={activeRoadmaps}
          subtitle="Synthesized curricula"
          icon={Compass}
          color="violet"
        />
        <StatsCard
          title="Topics Mastered"
          value={`${completedTopics} / ${totalTopics}`}
          subtitle={`${totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0}% syllabus completed`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          title="Study Streak"
          value={`${streak} Days`}
          subtitle="Daily learning momentum"
          icon={Flame}
          color="amber"
        />
      </div>

      {/* Main Grid: Upload & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Upload & Recent Documents */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Upload Section */}
          <div id="quick-upload" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Upload Learning Materials</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pathwise will extract slides, diagrams, and text to craft your learning pathway.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                PDF, PPT, PPTX
              </span>
            </div>
            <FileUpload onSuccess={() => loadData()} />
          </div>

          {/* Recent Documents Table / List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your Study Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">Click any document to enter its Study Hub</p>
              </div>
              <Link
                href="/documents"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No documents uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload a PDF or PPT above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => {
                  const statusColors: Record<string, string> = {
                    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    failed: 'bg-rose-50 text-rose-700 border-rose-200',
                    extracting_text: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    generating_roadmap: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                  };
                  const statusStyle = statusColors[doc.status] || 'bg-slate-50 text-slate-700 border-slate-200';

                  return (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {doc.original_filename}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="uppercase font-mono text-[10px] font-semibold">{doc.file_type}</span>
                            <span>&bull;</span>
                            <span>{doc.total_pages || 0} pages</span>
                            <span>&bull;</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                          {doc.status.replace(/_/g, ' ')}
                        </span>
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Weak Topics & Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Weak Topics Card */}
          {dashboard?.weak_topics && dashboard.weak_topics.length > 0 && (
            <div className="bg-amber-50/80 rounded-3xl border border-amber-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900">Recommended for Review</h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed mb-4">
                Based on your quiz attempts, you scored lowest in these topics. Consider asking the AI Tutor for a refresher:
              </p>
              <div className="space-y-2">
                {dashboard.weak_topics.map((wt, i) => (
                  <div key={i} className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span className="truncate">{wt}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      Needs Practice
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pathwise Quick Tips */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              How Pathwise Works
            </h3>
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px] border border-indigo-100">
                  1
                </span>
                <p>
                  <strong>Deep Extraction:</strong> PDF text, presentations, tables, formulas, and visual diagrams are segmented into structured chunks.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px] border border-indigo-100">
                  2
                </span>
                <p>
                  <strong>Curriculum Roadmap:</strong> Concepts are sequenced from foundational to advanced with prerequisite dependencies.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px] border border-indigo-100">
                  3
                </span>
                <p>
                  <strong>Personalized Tutor:</strong> Multi-step intuitive explanations and grounded chat answers citations to source pages.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px] border border-indigo-100">
                  4
                </span>
                <p>
                  <strong>Adaptive Quizzing:</strong> Progressive hints ensure you master each topic without giving up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
