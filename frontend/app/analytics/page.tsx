'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  getDashboard, 
  getResults, 
  Dashboard, 
  AssessmentResult 
} from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { 
  BarChart3, 
  Award, 
  CheckCircle2, 
  Flame, 
  AlertCircle, 
  TrendingUp, 
  FileText, 
  Compass, 
  ArrowRight,
  Clock,
  Loader2
} from 'lucide-react';

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAnalytics() {
      try {
        const [dash, res] = await Promise.all([
          getDashboard().catch(() => null),
          getResults('demo-user-001').catch(() => []),
        ]);
        if (isMounted) {
          setDashboard(dash);
          setResults(res);
        }
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading learning analytics...</p>
      </div>
    );
  }

  const completed = dashboard?.completed_topics || 0;
  const total = dashboard?.total_topics || 0;
  const streak = dashboard?.learning_streak_days || 1;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + r.score_percentage, 0) / results.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Learning Analytics & Mastery
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed metrics tracking your syllabus comprehension, quiz scores, and focus areas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Topics Mastered"
          value={`${completed} / ${total}`}
          subtitle={`${total > 0 ? Math.round((completed / total) * 100) : 0}% completion`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          title="Avg Quiz Score"
          value={`${avgScore}%`}
          subtitle={`Across ${results.length} assessment attempts`}
          icon={Award}
          color="indigo"
        />
        <StatsCard
          title="Study Streak"
          value={`${streak} Days`}
          subtitle="Keep up the daily habit"
          icon={Flame}
          color="amber"
        />
        <StatsCard
          title="Active Syllabi"
          value={dashboard?.active_roadmaps || 0}
          subtitle="Synthesized study roadmaps"
          icon={Compass}
          color="violet"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Assessment History */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quiz Assessment History</h2>
              <p className="text-xs text-slate-500 mt-0.5">Performance records across topics and difficulties</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {results.length} Completed
            </span>
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No quizzes taken yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Take an adaptive quiz in any document Study Hub to test your mastery.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="capitalize text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                        {res.difficulty}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(res.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      Score: {res.correct_answers} of {res.total_questions} correct
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        res.passed ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {Math.round(res.score_percentage)}%
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {res.passed ? 'Passed' : 'Needs Practice'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Weak Topics & Recommendations */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Focus Areas & Diagnostics
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Pathwise pinpoints topics where you scored under 70% or required multiple hint attempts.
            </p>

            {dashboard?.weak_topics && dashboard.weak_topics.length > 0 ? (
              <div className="space-y-2.5">
                {dashboard.weak_topics.map((t, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <p className="font-bold text-amber-900">{t}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Recommended: Run step-by-step AI Tutor lesson
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <span className="font-semibold">All tested topics are in good standing!</span>
              </div>
            )}
          </div>

          {/* Quick study prompt */}
          <div className="bg-gradient-to-tr from-indigo-900 to-indigo-950 rounded-3xl p-6 text-white shadow-lg">
            <h4 className="text-sm font-bold">Ready to learn more?</h4>
            <p className="text-xs text-indigo-200 mt-1 mb-4 leading-relaxed">
              Upload more slides or open a document roadmap to continue advancing your mastery.
            </p>
            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 transition-colors"
            >
              Go to Documents <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
