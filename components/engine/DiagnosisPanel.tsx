'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type {
  DiagnosticBattery,
  DiagnosticQuestion,
  AssessmentLogEntry,
} from '@/types/engine';
import Latex from 'react-latex-next';
import { Brain, CheckCircle2, XCircle, ChevronRight, Send, Loader2 } from 'lucide-react';

/**
 * Flattens the DiagnosticBattery's recommended_order + concept questions
 * into a linear queue of questions.
 */
function flattenQuestions(battery: DiagnosticBattery): {
  concept_id: string;
  question: DiagnosticQuestion;
}[] {
  const queue: { concept_id: string; question: DiagnosticQuestion }[] = [];
  const conceptMap = new Map(battery.concepts.map((c) => [c.concept_id, c]));

  for (const cid of battery.recommended_order) {
    const concept = conceptMap.get(cid);
    if (concept) {
      for (const q of concept.questions) {
        queue.push({ concept_id: cid, question: q });
      }
    }
  }

  // If recommended_order missed any concepts, add them at the end
  for (const concept of battery.concepts) {
    if (!battery.recommended_order.includes(concept.concept_id)) {
      for (const q of concept.questions) {
        queue.push({ concept_id: concept.concept_id, question: q });
      }
    }
  }

  return queue;
}

/**
 * Simple fuzzy match for evaluating student answers against expected answers.
 * Returns true if the student's answer contains the key tokens from expected.
 */
function evaluateAnswer(
  studentAnswer: string,
  expectedAnswer: string,
  evaluationType: string
): boolean {
  const s = studentAnswer.toLowerCase().trim();
  const e = expectedAnswer.toLowerCase().trim();

  if (!s) return false;

  // Direct match
  if (s === e) return true;

  // For numerical, try to extract numbers and compare
  if (evaluationType === 'Numerical') {
    const sNums = s.match(/[\d.\/]+/g);
    const eNums = e.match(/[\d.\/]+/g);
    if (sNums && eNums) {
      return sNums.some((sn) => eNums.some((en) => sn === en));
    }
  }

  // Fuzzy: split expected into significant tokens, check overlap
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'of', 'and', 'to', 'in', 'for', 'its', 'it', 'that', 'be']);
  const eTokens = e
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));

  if (eTokens.length === 0) return s.includes(e);

  const matchCount = eTokens.filter((t) => s.includes(t)).length;
  const matchRatio = matchCount / eTokens.length;

  return matchRatio >= 0.5;
}

export type DiagnosisResult = {
  assessmentLog: AssessmentLogEntry[];
  weakConcepts: string[];
  allCorrect: boolean;
};

export function DiagnosisPanel({
  battery,
  theme,
  onComplete,
}: {
  battery: DiagnosticBattery;
  theme: 'dark' | 'light';
  onComplete: (result: DiagnosisResult) => void;
}) {
  const isDark = theme === 'dark';
  const questions = React.useMemo(() => flattenQuestions(battery), [battery]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState('');
  const [assessmentLog, setAssessmentLog] = useState<AssessmentLogEntry[]>([]);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);

  const totalQuestions = questions.length;
  const isFinished = currentIdx >= totalQuestions;

  const currentQuestion = isFinished ? null : questions[currentIdx];

  // Count unique concepts that have at least one wrong answer
  const weakConceptsSet = React.useMemo(() => {
    const weak = new Set<string>();
    assessmentLog.filter((e) => !e.correct).forEach((e) => weak.add(e.concept_id));
    return weak;
  }, [assessmentLog]);

  const handleSubmitAnswer = useCallback(() => {
    if (!currentQuestion || !input.trim()) return;

    const correct = evaluateAnswer(
      input,
      currentQuestion.question.expected_answer,
      currentQuestion.question.evaluation_type
    );

    const entry: AssessmentLogEntry = {
      concept_id: currentQuestion.concept_id,
      question: currentQuestion.question.question_text,
      student_answer: input.trim(),
      correct,
      timestamp: new Date().toISOString(),
    };

    const newLog = [...assessmentLog, entry];
    setAssessmentLog(newLog);
    setLastResult(correct ? 'correct' : 'wrong');
    setShowingFeedback(true);
    setInput('');

    // After showing feedback for 1.5s, advance
    setTimeout(() => {
      setShowingFeedback(false);
      setLastResult(null);

      const nextIdx = currentIdx + 1;
      if (nextIdx >= totalQuestions) {
        // Diagnosis complete
        const weakConcepts = [...new Set(newLog.filter((e) => !e.correct).map((e) => e.concept_id))];
        onComplete({
          assessmentLog: newLog,
          weakConcepts,
          allCorrect: weakConcepts.length === 0,
        });
      } else {
        setCurrentIdx(nextIdx);
      }
    }, 1800);
  }, [currentQuestion, input, assessmentLog, currentIdx, totalQuestions, onComplete]);

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-12"
      >
        <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-black">Diagnosis Complete</h3>
        <p className={cn('text-xs mt-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
          Preparing the next phase...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      {/* Progress indicator */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          <span>
            Question {currentIdx + 1} of {totalQuestions}
          </span>
          <span className="text-emerald-500">
            Concept: {currentQuestion?.concept_id.replace(/_/g, ' ')}
          </span>
        </div>
        <div
          className={cn(
            'h-1.5 rounded-full overflow-hidden',
            isDark ? 'bg-white/5' : 'bg-slate-200'
          )}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'w-full max-w-lg rounded-2xl border p-6 shadow-xl relative overflow-hidden',
            isDark
              ? 'border-white/5 bg-[#101a15]'
              : 'border-slate-200 bg-white'
          )}
        >
          {/* Concept badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
              Diagnostic Probe
            </span>
          </div>

          {/* Question text */}
          <div className="text-sm font-bold leading-relaxed mb-6">
            <Latex>{currentQuestion?.question.question_text || ''}</Latex>
          </div>

          {/* Feedback overlay */}
          <AnimatePresence>
            {showingFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center rounded-2xl backdrop-blur-md z-10',
                  lastResult === 'correct'
                    ? isDark
                      ? 'bg-emerald-900/60'
                      : 'bg-emerald-50/90'
                    : isDark
                    ? 'bg-red-900/40'
                    : 'bg-red-50/90'
                )}
              >
                {lastResult === 'correct' ? (
                  <>
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                    <p className="text-sm font-black text-emerald-500">Correct!</p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-12 w-12 text-red-400 mb-2" />
                    <p className="text-sm font-black text-red-400">Not quite</p>
                    <p
                      className={cn(
                        'text-xs mt-2 max-w-[280px] text-center leading-relaxed',
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      )}
                    >
                      Expected: <Latex>{currentQuestion?.question.expected_answer || ''}</Latex>
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer input */}
          <div
            className={cn(
              'flex items-end gap-2 border rounded-xl p-2 transition-all',
              isDark
                ? 'border-white/5 bg-[#16241e] focus-within:border-emerald-500/30'
                : 'border-slate-200 bg-slate-50 focus-within:border-[#163f36]/30'
            )}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitAnswer();
                }
              }}
              rows={2}
              placeholder="Type your answer..."
              className="flex-1 min-h-[48px] max-h-24 bg-transparent outline-none border-none text-sm resize-none leading-relaxed placeholder-slate-400"
              disabled={showingFeedback}
            />
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!input.trim() || showingFeedback}
              className={cn(
                'h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-white transition-all shadow-md active:scale-95 disabled:scale-100',
                isDark
                  ? 'bg-[#1b8f6a] hover:bg-[#20ab7f] disabled:bg-white/5 disabled:text-slate-600'
                  : 'bg-[#163f36] hover:bg-[#205b4e] disabled:bg-slate-200 disabled:text-slate-400'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Weak concepts summary */}
      {weakConceptsSet.size > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'mt-4 px-3 py-2 rounded-xl border text-[10px] font-bold',
            isDark
              ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          )}
        >
          Gaps detected in: {[...weakConceptsSet].map((c) => c.replace(/_/g, ' ')).join(', ')}
        </motion.div>
      )}
    </div>
  );
}
