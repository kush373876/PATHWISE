'use client';

import React, { useState } from 'react';
import { 
  Question, 
  generateQuestions, 
  submitAnswer, 
  getHint, 
  SubmitResponse, 
  HintResponse 
} from '@/lib/api';
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  HelpCircle, 
  ArrowRight, 
  RefreshCw, 
  Award,
  Sparkles,
  BookOpen,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface AssessmentQuizProps {
  documentId: string;
  topicId: string;
  topicTitle?: string;
  onAssessmentCompleted?: (scorePercent: number) => void;
}

export default function AssessmentQuiz({
  documentId,
  topicId,
  topicTitle,
  onAssessmentCompleted,
}: AssessmentQuizProps) {
  const [difficulty, setDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<SubmitResponse | null>(null);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [hint, setHint] = useState<HintResponse | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);
  const [scoreCount, setScoreCount] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentIndex(0);
    setCurrentResult(null);
    setSelectedOption(null);
    setHint(null);
    setScoreCount(0);
    setIsFinished(false);
    setAttempts({});

    try {
      const list = await generateQuestions({
        document_id: documentId,
        topic_id: topicId,
        difficulty,
        count: 5,
      });
      setQuestions(list);
    } catch (err: any) {
      alert(`Failed to generate questions: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionSelect = (opt: string) => {
    if (currentResult?.is_correct) return;
    setSelectedOption(opt);
  };

  const handleSubmit = async () => {
    if (!selectedOption || !currentQuestion) return;

    const currentAttempt = (attempts[currentQuestion.id] || 0) + 1;
    setAttempts((prev) => ({ ...prev, [currentQuestion.id]: currentAttempt }));
    setIsSubmitting(true);

    try {
      const res = await submitAnswer({
        question_id: currentQuestion.id,
        selected_answer: selectedOption,
        user_id: 'demo-user-001',
        attempt_number: currentAttempt,
      });

      setCurrentResult(res);
      if (res.is_correct && currentAttempt === 1) {
        setScoreCount((prev) => prev + 1);
      }
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    if (!currentQuestion) return;
    setIsLoadingHint(true);
    try {
      const currentAttempt = attempts[currentQuestion.id] || 1;
      const res = await getHint({
        question_id: currentQuestion.id,
        user_id: 'demo-user-001',
        attempt_number: currentAttempt,
      });
      setHint(res);
    } catch (err: any) {
      alert(`Could not retrieve hint: ${err.message}`);
    } finally {
      setIsLoadingHint(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setCurrentResult(null);
      setHint(null);
    } else {
      setIsFinished(true);
      const finalPercent = Math.round((scoreCount / questions.length) * 100);
      if (onAssessmentCompleted) {
        onAssessmentCompleted(finalPercent);
      }
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Quiz Header & Configuration */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Adaptive Mastery Assessment
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Topic: <span className="font-semibold text-slate-700">{topicTitle || 'Selected Module'}</span>
          </p>
        </div>

        {/* Difficulty Selector and Generate Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            {(['basic', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDifficulty(lvl)}
                disabled={isGenerating}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  difficulty === lvl
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {questions.length > 0 ? 'Regenerate Quiz' : 'Start Assessment'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8">
        {questions.length === 0 && !isGenerating && (
          <div className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
              <Award className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Ready to test your knowledge?</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Pathwise generates 5 tailored multiple-choice questions grounded directly in your uploaded source materials.
            </p>
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs inline-flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate 5 {difficulty} Questions
            </button>
          </div>
        )}

        {/* Active Quiz Question */}
        {questions.length > 0 && !isFinished && currentQuestion && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Question Progress Tracker */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="capitalize px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] border border-indigo-100">
                {currentQuestion.difficulty}
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Text */}
            <div className="bg-slate-50/70 rounded-2xl p-6 border border-slate-200">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentQuestion.question_text}
              </h3>
              {currentQuestion.page_number && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Referenced from Page {currentQuestion.page_number}</span>
                </div>
              )}
            </div>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {[
                { key: 'A', text: currentQuestion.option_a },
                { key: 'B', text: currentQuestion.option_b },
                { key: 'C', text: currentQuestion.option_c },
                { key: 'D', text: currentQuestion.option_d },
              ].map(({ key, text }) => {
                const isSelected = selectedOption === key;
                const isCorrect = currentResult?.is_correct && isSelected;
                const isWrong = currentResult && !currentResult.is_correct && isSelected;

                let optionStyles = 'border-slate-200 hover:border-indigo-300 bg-white text-slate-800';
                if (isSelected && !currentResult) {
                  optionStyles = 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200 text-indigo-950 font-medium';
                } else if (isCorrect) {
                  optionStyles = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 text-emerald-950 font-medium';
                } else if (isWrong) {
                  optionStyles = 'border-red-400 bg-red-50 text-red-950';
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleOptionSelect(key)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${optionStyles}`}
                  >
                    <span className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {key}
                    </span>
                    <span className="text-sm flex-1">{text}</span>
                  </button>
                );
              })}
            </div>

            {/* Hint Box (Progressive hints) */}
            {hint && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Hint (Level {hint.hint_level}): </span>
                  <span>{hint.hint}</span>
                </div>
              </div>
            )}

            {/* Answer Result Feedback */}
            {currentResult && (
              <div className={`p-5 rounded-2xl border ${
                currentResult.is_correct 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                  {currentResult.is_correct ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Correct Answer! Outstanding!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-rose-600" />
                      <span>Not quite right. Try again or check the hint below!</span>
                    </>
                  )}
                </div>

                {currentResult.explanation && (
                  <p className="text-xs leading-relaxed mt-2 text-slate-700">
                    <span className="font-semibold">Explanation: </span>
                    {currentResult.explanation}
                  </p>
                )}

                {currentResult.source_passage && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs italic text-slate-600">
                    "{currentResult.source_passage}"
                  </div>
                )}
              </div>
            )}

            {/* Controls Toolbar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={handleRequestHint}
                disabled={isLoadingHint || currentResult?.is_correct}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-40 transition-colors"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {isLoadingHint ? 'Fetching hint...' : 'Need a Hint?'}
              </button>

              <div className="flex items-center gap-2">
                {!currentResult?.is_correct ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedOption || isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Submit Answer'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
                  >
                    <span>{currentIndex + 1 === questions.length ? 'Finish Quiz' : 'Next Question'}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Finished Score Screen */}
        {isFinished && (
          <div className="max-w-md mx-auto text-center py-8">
            <div className="h-16 w-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
              <Award className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Quiz Completed!</h3>
            <p className="text-xs text-slate-500 mt-1">Here is your mastery scorecard for this module:</p>

            <div className="my-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="text-4xl font-extrabold text-indigo-600">
                {Math.round((scoreCount / questions.length) * 100)}%
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                {scoreCount} of {questions.length} questions answered correctly on first try
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleGenerate}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Retake Quiz
              </button>
              <button
                onClick={() => {
                  setQuestions([]);
                  setIsFinished(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
