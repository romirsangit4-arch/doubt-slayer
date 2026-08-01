'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { ReconstructionScaffold } from '@/types/engine';
import Latex from 'react-latex-next';
import { Building2, Lightbulb, Send, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

export type ReconstructionResult = {
  stepResults: { step_number: number; completed: boolean; hints_used: number }[];
};

export function ReconstructionPanel({
  scaffold,
  theme,
  onComplete,
}: {
  scaffold: ReconstructionScaffold;
  theme: 'dark' | 'light';
  onComplete: (result: ReconstructionResult) => void;
}) {
  const isDark = theme === 'dark';
  const steps = scaffold.steps;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState('');
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [stepResults, setStepResults] = useState<
    { step_number: number; completed: boolean; hints_used: number }[]
  >([]);

  const isFinished = currentIdx >= steps.length;
  const currentStep = isFinished ? null : steps[currentIdx];

  const getHintText = useCallback(
    (level: number): string => {
      if (!currentStep) return '';
      if (level === 1) return currentStep.hint_level_1;
      if (level === 2) return currentStep.hint_level_2;
      return currentStep.hint_level_3;
    },
    [currentStep]
  );

  const handleRevealHint = useCallback(() => {
    const maxHints = scaffold.adaptive_rules.max_hints_per_step;
    if (hintsRevealed < maxHints) {
      setHintsRevealed((h) => h + 1);
    }
  }, [hintsRevealed, scaffold.adaptive_rules.max_hints_per_step]);

  const handleSubmitStep = useCallback(() => {
    if (!currentStep) return;

    const completed = !showSolution; // If they didn't reveal, they completed it
    const newResults = [
      ...stepResults,
      {
        step_number: currentStep.step_number,
        completed,
        hints_used: hintsRevealed,
      },
    ];
    setStepResults(newResults);

    const nextIdx = currentIdx + 1;
    if (nextIdx >= steps.length) {
      onComplete({ stepResults: newResults });
    } else {
      setCurrentIdx(nextIdx);
      setInput('');
      setHintsRevealed(0);
      setShowSolution(false);
    }
  }, [currentStep, currentIdx, steps, onComplete, stepResults, hintsRevealed, showSolution]);

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-12"
      >
        <div className="h-16 w-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-cyan-500" />
        </div>
        <h3 className="text-lg font-black">Reconstruction Complete</h3>
        <p className={cn('text-xs mt-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
          Generating your mastery report...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          <span>
            Step {currentIdx + 1} of {steps.length}
          </span>
          <span className="text-cyan-500">Socratic Reconstruction</span>
        </div>
        <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-slate-200')}>
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
            animate={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            'w-full max-w-lg rounded-2xl border p-6 shadow-xl',
            isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
          )}
        >
          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-cyan-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-500">
              Step {currentStep?.step_number} — Rebuild
            </span>
          </div>

          {/* Socratic question */}
          <div className="text-sm font-bold leading-relaxed mb-5">
            <Latex>{currentStep?.question_to_student || ''}</Latex>
          </div>

          {/* Expected answer type hint */}
          <div
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider mb-4 px-2 py-1 rounded inline-block',
              isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
            )}
          >
            Expected: {currentStep?.expected_answer_type}
          </div>

          {/* Progressive Hints */}
          <div className="mb-4 space-y-2">
            {Array.from({ length: hintsRevealed }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={cn(
                  'flex items-start gap-2 p-3 rounded-xl border text-xs',
                  isDark
                    ? 'border-cyan-500/10 bg-cyan-500/5 text-cyan-200'
                    : 'border-cyan-200 bg-cyan-50 text-cyan-800'
                )}
              >
                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-cyan-500" />
                <Latex>{getHintText(i + 1)}</Latex>
              </motion.div>
            ))}

            <div className="flex items-center gap-2">
              {hintsRevealed < scaffold.adaptive_rules.max_hints_per_step && (
                <button
                  type="button"
                  onClick={handleRevealHint}
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider transition px-3 py-1.5 rounded-lg border',
                    isDark
                      ? 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10'
                      : 'border-cyan-200 text-cyan-600 hover:bg-cyan-50'
                  )}
                >
                  Hint {hintsRevealed + 1}/{scaffold.adaptive_rules.max_hints_per_step}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className={cn(
                  'flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition px-3 py-1.5 rounded-lg border',
                  showSolution
                    ? isDark
                      ? 'border-red-500/20 text-red-400 bg-red-500/10'
                      : 'border-red-200 text-red-600 bg-red-50'
                    : isDark
                    ? 'border-white/5 text-slate-400 hover:bg-white/5'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
              >
                <Eye className="h-3 w-3" />
                {showSolution ? 'Hide Answer' : 'Reveal Answer'}
              </button>
            </div>
          </div>

          {/* Solution (if revealed) */}
          <AnimatePresence>
            {showSolution && currentStep && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'mb-4 p-3 rounded-xl border text-xs leading-relaxed',
                  isDark ? 'border-white/5 bg-[#16241e] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                )}
              >
                <Latex>{currentStep.solution_line}</Latex>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer input */}
          <div
            className={cn(
              'flex items-end gap-2 border rounded-xl p-2 transition-all',
              isDark
                ? 'border-white/5 bg-[#16241e] focus-within:border-cyan-500/30'
                : 'border-slate-200 bg-slate-50 focus-within:border-cyan-500/30'
            )}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitStep();
                }
              }}
              rows={2}
              placeholder="Write the next step of the solution..."
              className="flex-1 min-h-[48px] max-h-24 bg-transparent outline-none border-none text-sm resize-none leading-relaxed placeholder-slate-400"
            />
            <button
              type="button"
              onClick={handleSubmitStep}
              className={cn(
                'h-10 px-4 shrink-0 flex items-center justify-center gap-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95',
                isDark ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-cyan-600 hover:bg-cyan-500'
              )}
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
