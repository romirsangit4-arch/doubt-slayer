'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { MicroExampleSet } from '@/types/engine';
import Latex from 'react-latex-next';
import { Wrench, Eye, EyeOff, ChevronRight, CheckCircle2, Lightbulb, Send } from 'lucide-react';

export type RepairResult = {
  results: { concept_id: string; solved: boolean }[];
};

export function RepairPanel({
  microExampleSet,
  theme,
  onComplete,
}: {
  microExampleSet: MicroExampleSet;
  theme: 'dark' | 'light';
  onComplete: (result: RepairResult) => void;
}) {
  const isDark = theme === 'dark';
  const examples = microExampleSet.examples;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState('');
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [results, setResults] = useState<{ concept_id: string; solved: boolean }[]>([]);

  const isFinished = currentIdx >= examples.length;
  const currentExample = isFinished ? null : examples[currentIdx];

  const handleRevealHint = useCallback(() => {
    if (currentExample && hintsRevealed < currentExample.hints.length) {
      setHintsRevealed((h) => h + 1);
    }
  }, [currentExample, hintsRevealed]);

  const handleSubmitSolution = useCallback(() => {
    if (!currentExample) return;

    // In repair phase, we're more lenient — the student practiced
    const newResults = [...results, { concept_id: currentExample.concept_id, solved: !showSolution }];
    setResults(newResults);

    const nextIdx = currentIdx + 1;
    if (nextIdx >= examples.length) {
      onComplete({ results: newResults });
    } else {
      setCurrentIdx(nextIdx);
      setInput('');
      setHintsRevealed(0);
      setShowSolution(false);
    }
  }, [currentExample, currentIdx, examples, onComplete, results, showSolution]);

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-12"
      >
        <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
          <Wrench className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-black">Fragment Repair Complete</h3>
        <p className={cn('text-xs mt-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
          Moving to reconstruction phase...
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
            Micro-Example {currentIdx + 1} of {examples.length}
          </span>
          <span className="text-amber-500">
            Repairing: {currentExample?.concept_id.replace(/_/g, ' ')}
          </span>
        </div>
        <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-slate-200')}>
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            animate={{ width: `${((currentIdx + 1) / examples.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Example Card */}
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
            <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wrench className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
              Micro-Example Practice
            </span>
          </div>

          {/* Problem */}
          <div className="text-sm font-bold leading-relaxed mb-5">
            <Latex>{currentExample?.problem_text || ''}</Latex>
          </div>

          {/* Progressive Hints */}
          {currentExample && currentExample.hints.length > 0 && (
            <div className="mb-4 space-y-2">
              {currentExample.hints.slice(0, hintsRevealed).map((hint, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-xl border text-xs',
                    isDark
                      ? 'border-amber-500/10 bg-amber-500/5 text-amber-200'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  )}
                >
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <Latex>{hint}</Latex>
                </motion.div>
              ))}

              {hintsRevealed < currentExample.hints.length && (
                <button
                  type="button"
                  onClick={handleRevealHint}
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider transition px-3 py-1.5 rounded-lg border',
                    isDark
                      ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                      : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                  )}
                >
                  Reveal Hint {hintsRevealed + 1}/{currentExample.hints.length}
                </button>
              )}
            </div>
          )}

          {/* Solution reveal */}
          {currentExample && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className={cn(
                  'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition px-3 py-1.5 rounded-lg border',
                  showSolution
                    ? isDark
                      ? 'border-red-500/20 text-red-400 bg-red-500/10'
                      : 'border-red-200 text-red-600 bg-red-50'
                    : isDark
                    ? 'border-white/5 text-slate-400 hover:bg-white/5'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
              >
                {showSolution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSolution ? 'Hide Solution' : 'Show Solution (gives up credit)'}
              </button>

              <AnimatePresence>
                {showSolution && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      'mt-2 p-3 rounded-xl border text-xs leading-relaxed',
                      isDark ? 'border-white/5 bg-[#16241e] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
                    )}
                  >
                    <Latex>{currentExample.hidden_solution}</Latex>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Answer input */}
          <div
            className={cn(
              'flex items-end gap-2 border rounded-xl p-2 transition-all',
              isDark
                ? 'border-white/5 bg-[#16241e] focus-within:border-amber-500/30'
                : 'border-slate-200 bg-slate-50 focus-within:border-amber-500/30'
            )}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitSolution();
                }
              }}
              rows={2}
              placeholder="Work through this example..."
              className="flex-1 min-h-[48px] max-h-24 bg-transparent outline-none border-none text-sm resize-none leading-relaxed placeholder-slate-400"
            />
            <button
              type="button"
              onClick={handleSubmitSolution}
              className={cn(
                'h-10 px-4 shrink-0 flex items-center justify-center gap-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95',
                isDark ? 'bg-amber-600 hover:bg-amber-500' : 'bg-amber-600 hover:bg-amber-500'
              )}
            >
              <span>Done</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
