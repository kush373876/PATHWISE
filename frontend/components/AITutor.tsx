'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Topic, 
  explainTopic, 
  tutorChat, 
  ExplainResponse, 
  ChatMessage 
} from '@/lib/api';
import { 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  HelpCircle, 
  Lightbulb, 
  CheckCircle2, 
  FileText, 
  Quote, 
  Compass, 
  RefreshCw,
  Loader2,
  Bot,
  User as UserIcon
} from 'lucide-react';

interface AITutorProps {
  documentId: string;
  topicId: string;
  topicTitle?: string;
  initialExplanation?: string | null;
  onJumpToPage?: (page: number) => void;
}

export default function AITutor({
  documentId,
  topicId,
  topicTitle,
  initialExplanation,
  onJumpToPage,
}: AITutorProps) {
  const [mode, setMode] = useState<'guided' | 'chat'>('guided');

  // Guided Lesson State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [lessonData, setLessonData] = useState<ExplainResponse | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState<boolean>(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch guided step when step or topic changes
  useEffect(() => {
    let isMounted = true;
    async function loadStep() {
      if (!topicId) return;
      setIsLoadingLesson(true);
      setLessonError(null);
      try {
        const data = await explainTopic({
          document_id: documentId,
          topic_id: topicId,
          step: currentStep,
        });
        if (isMounted) {
          setLessonData(data);
          if (data.error) setLessonError(data.error);
        }
      } catch (err: any) {
        if (isMounted) setLessonError(err.message || 'Failed to load lesson step');
      } finally {
        if (isMounted) setIsLoadingLesson(false);
      }
    }

    loadStep();
    return () => {
      isMounted = false;
    };
  }, [documentId, topicId, currentStep]);

  // Set initial chat greeting or custom prompt
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I'm your Pathwise AI Tutor for "${topicTitle || 'this topic'}". You can ask me any questions about concepts, formulas, or slides in this document. How can I help you today?`,
      },
    ]);
  }, [topicId, topicTitle]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage.trim();
    if (!textToSend || isSendingChat) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputMessage('');
    setIsSendingChat(true);

    try {
      const res = await tutorChat({
        document_id: documentId,
        topic_id: topicId,
        message: textToSend,
        history: messages,
      });

      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          content: res.response,
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          content: `Sorry, I encountered an issue retrieving the answer: ${err.message}`,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const starterPrompts = [
    'Explain this concept in simple terms',
    'What are the 3 most important takeaways?',
    'Give me an everyday real-world analogy',
    'Create an exam practice question about this',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[780px]">
      {/* Tutor Header & Mode Switcher */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {topicTitle ? `Topic: ${topicTitle}` : 'Interactive AI Tutor'}
            </h3>
            <p className="text-xs text-slate-500">
              Personalized, grounded tutoring powered by document knowledge
            </p>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setMode('guided')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'guided'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Guided Lesson
          </button>
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'chat'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Tutor Q&A Chat
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {mode === 'guided' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingLesson ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Synthesizing step {currentStep} lesson plan...</p>
            </div>
          ) : lessonError ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-center">
              <HelpCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm">Notice</h4>
              <p className="text-xs mt-1">{lessonError}</p>
            </div>
          ) : lessonData ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Step indicator header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    Step {lessonData.step} of {lessonData.total_steps || 3}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                    {lessonData.step_title || 'Key Concept Exploration'}
                  </h2>
                </div>

                {lessonData.source_pages && lessonData.source_pages.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Grounded in:</span>
                    {lessonData.source_pages.map((p) => (
                      <button
                        key={p}
                        onClick={() => onJumpToPage && onJumpToPage(p)}
                        className="px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                      >
                        Page {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* What is it? */}
              {lessonData.what_is_it && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    What Is It?
                  </h4>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {lessonData.what_is_it}
                  </p>
                </div>
              )}

              {/* Source passage quote */}
              {lessonData.source_says && (
                <div className="bg-slate-50 border-l-4 border-indigo-500 rounded-r-2xl p-4 text-xs text-slate-700 italic flex items-start gap-3">
                  <Quote className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">"{lessonData.source_says}"</p>
                </div>
              )}

              {/* Plain-English intuition */}
              {lessonData.simple_explanation && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Plain-English Intuition
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {lessonData.simple_explanation}
                  </p>
                </div>
              )}

              {/* Grid: Why Important & How It Works */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessonData.why_important && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                      Why It Matters
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {lessonData.why_important}
                    </p>
                  </div>
                )}

                {lessonData.how_it_works && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                    <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-2">
                      How It Operates
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {lessonData.how_it_works}
                    </p>
                  </div>
                )}
              </div>

              {/* Practical Everyday Example */}
              {lessonData.practical_example && (
                <div className="bg-violet-50/60 border border-violet-100 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-2">
                    Real-World Practical Example
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {lessonData.practical_example}
                  </p>
                </div>
              )}

              {/* Key points */}
              {lessonData.key_points && lessonData.key_points.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Core Takeaways
                  </h4>
                  <ul className="space-y-2">
                    {lessonData.key_points.map((pt, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Knowledge check / reflection */}
              {lessonData.knowledge_check && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                    Quick Reflection Check
                  </h4>
                  <p className="text-sm text-slate-800 font-medium">
                    {lessonData.knowledge_check}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* Chat Mode */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={i}
                  className={`flex gap-3 max-w-2xl ${
                    isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs ${
                      isAssistant
                        ? 'bg-gradient-to-tr from-indigo-600 to-violet-500'
                        : 'bg-slate-700'
                    }`}
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                  </div>

                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-slate-100 text-slate-800 border border-slate-200/80'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {isSendingChat && (
              <div className="flex gap-3 mr-auto max-w-2xl">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  <span>Consulting document knowledge base...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick starter prompts */}
          <div className="px-6 py-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto whitespace-nowrap bg-slate-50/50">
            <span className="text-[11px] font-semibold text-slate-400">Quick prompts:</span>
            {starterPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chat input box */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask your tutor anything about this lesson..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSendingChat}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-xs"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Guided Lesson Footer Stepper */}
      {mode === 'guided' && lessonData && (
        <div className="border-t border-slate-200 p-4 px-6 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={!lessonData.has_prev}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous Step
          </button>

          <span className="text-xs font-semibold text-slate-500">
            Step {lessonData.step} of {lessonData.total_steps || 3}
          </span>

          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!lessonData.has_next}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none shadow-xs"
          >
            Next Step
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
