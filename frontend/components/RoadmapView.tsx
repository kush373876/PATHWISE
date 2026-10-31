'use client';

import React, { useState } from 'react';
import { 
  Roadmap, 
  LearningStep, 
  Topic, 
  updateProgress, 
  TopicProgress 
} from '@/lib/api';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  Sparkles, 
  GraduationCap, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight,
  Target
} from 'lucide-react';

interface RoadmapViewProps {
  roadmap: Roadmap | null;
  progressList?: TopicProgress[];
  onSelectTopicForTutor: (topicId: string) => void;
  onSelectTopicForQuiz: (topicId: string) => void;
  onRefresh?: () => void;
}

export default function RoadmapView({
  roadmap,
  progressList = [],
  onSelectTopicForTutor,
  onSelectTopicForQuiz,
  onRefresh,
}: RoadmapViewProps) {
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getProgress = (topicId: string) => {
    return progressList.find((p) => p.topic_id === topicId);
  };

  const handleToggleComplete = async (step: LearningStep) => {
    const currentProgress = getProgress(step.topic_id);
    const newStatus = !currentProgress?.is_completed;
    try {
      await updateProgress({
        topic_id: step.topic_id,
        document_id: roadmap?.document_id,
        user_id: 'demo-user-001',
        is_completed: newStatus,
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  if (!roadmap || !roadmap.steps || roadmap.steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <BookOpen className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">No Learning Roadmap Generated Yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
          Pathwise generates a structured, step-by-step curriculum once document processing completes.
        </p>
      </div>
    );
  }

  const completedCount = roadmap.steps.filter((s) => getProgress(s.topic_id)?.is_completed).length;
  const progressPercent = Math.round((completedCount / roadmap.steps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Roadmap header summary */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              AI Synthesized Curriculum
            </div>
            <h2 className="text-2xl font-bold">{roadmap.title || 'Personalized Study Roadmap'}</h2>
            <p className="text-sm text-indigo-200 mt-1 max-w-2xl">
              {roadmap.description || 'Follow this sequenced progression designed to maximize retention and mastery.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 min-w-[200px] border border-white/10">
            <div className="flex justify-between text-xs text-indigo-200 font-medium mb-1.5">
              <span>Overall Progress</span>
              <span>{completedCount} of {roadmap.steps.length} steps ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-indigo-300 mt-2">
              <Clock className="h-3 w-3" />
              <span>Est. Total Time: {roadmap.estimated_total_minutes || 60} mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sequential Steps List */}
      <div className="relative pl-6 md:pl-8 before:absolute before:left-3 md:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-indigo-100">
        {roadmap.steps.map((step, index) => {
          const topic = step.topic;
          const progress = getProgress(step.topic_id);
          const isCompleted = !!progress?.is_completed;
          const isExpanded = !!expandedTopics[step.id];

          const difficultyBadge = {
            basic: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            intermediate: 'bg-sky-50 text-sky-700 border-sky-200',
            advanced: 'bg-purple-50 text-purple-700 border-purple-200',
          }[topic?.difficulty || 'basic'];

          return (
            <div key={step.id || index} className="relative mb-6 group">
              {/* Step indicator node */}
              <button
                onClick={() => handleToggleComplete(step)}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                className={`absolute -left-6 md:-left-8 top-4 -translate-x-1/2 flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200'
                    : 'bg-white border-indigo-300 text-indigo-600 hover:border-indigo-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-bold">{step.step_number || index + 1}</span>
                )}
              </button>

              {/* Step Card */}
              <div className={`bg-white rounded-2xl border transition-all ${
                isCompleted 
                  ? 'border-emerald-200 bg-emerald-50/20' 
                  : 'border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md'
              } p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Step {step.step_number || index + 1}
                      </span>
                      {topic?.difficulty && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${difficultyBadge}`}>
                          {topic.difficulty}
                        </span>
                      )}
                      {topic?.estimated_minutes && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {topic.estimated_minutes} min
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {step.title || topic?.title || `Module ${index + 1}`}
                    </h3>

                    {topic?.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                    <button
                      onClick={() => onSelectTopicForTutor(step.topic_id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs hover:shadow-indigo-100 transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Learn Topic
                    </button>
                    <button
                      onClick={() => onSelectTopicForQuiz(step.topic_id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200"
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                      Quiz
                    </button>
                  </div>
                </div>

                {/* Collapsible Details */}
                {(topic?.learning_objectives?.length || topic?.prerequisites?.length) && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => toggleExpand(step.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Hide Objectives & Prerequisites' : 'View Objectives & Prerequisites'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 pl-2">
                        {topic?.learning_objectives && topic.learning_objectives.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-indigo-500" />
                              Learning Objectives:
                            </span>
                            <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-1">
                              {topic.learning_objectives.map((obj, i) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {topic?.prerequisites && topic.prerequisites.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-slate-700">Prerequisites:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {topic.prerequisites.map((pre, i) => (
                                <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {pre}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
