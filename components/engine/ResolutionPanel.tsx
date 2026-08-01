'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { SessionCoverage, SolutionContext } from '@/types/engine';
import Latex from 'react-latex-next';
import { Trophy, ArrowLeft, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  mastered: {
    icon: CheckCircle2,
    label: 'Mastered',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  repaired: {
    icon: AlertTriangle,
    label: 'Repaired',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  weak: {
    icon: XCircle,
    label: 'Needs Work',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

export function ResolutionPanel({
  sessionCoverage,
  solutionContext,
  theme,
  onBackToDashboard,
}: {
  sessionCoverage: SessionCoverage;
  solutionContext: SolutionContext;
  theme: 'dark' | 'light';
  onBackToDashboard: () => void;
}) {
  const isDark = theme === 'dark';

  // Show full solution from the SolutionContext
  const qualityScore = sessionCoverage.session_quality;
  const qualityColor =
    qualityScore >= 80
      ? 'text-emerald-500'
      : qualityScore >= 50
      ? 'text-amber-500'
      : 'text-red-400';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="h-20 w-20 mx-auto bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20"
          >
            <Trophy className="h-10 w-10 text-yellow-500" />
          </motion.div>
          <h2 className="text-xl font-black tracking-tight">Session Complete</h2>
          <p className={cn('text-xs mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
            Here is your mastery report
          </p>
        </motion.div>

        {/* Quality Score */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={cn(
            'rounded-2xl border p-5 text-center',
            isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Session Quality
          </p>
          <p className={cn('text-4xl font-black', qualityColor)}>{qualityScore}</p>
          <p className="text-[10px] text-slate-400 mt-1">out of 100</p>
        </motion.div>

        {/* Concept Mastery Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={cn(
            'rounded-2xl border p-5',
            isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4">
            Concept Mastery
          </p>
          <div className="space-y-2">
            {sessionCoverage.topics_covered.flatMap((topic) =>
              topic.concepts_engaged.map((concept) => {
                const config = STATUS_CONFIG[concept.status];
                const Icon = config.icon;
                return (
                  <div
                    key={concept.concept_id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border',
                      isDark ? `${config.border} ${config.bg}` : `${config.border} ${config.bg}`
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                      <span className="text-xs font-bold truncate">
                        {concept.concept_id.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'text-[10px] font-black uppercase',
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                      <span className={cn('text-[10px] font-bold', config.color)}>
                        {concept.mastery_delta > 0 ? '+' : ''}
                        {concept.mastery_delta}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Full Solution Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn(
            'rounded-2xl border p-5',
            isDark ? 'border-white/5 bg-[#101a15]' : 'border-slate-200 bg-white'
          )}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4">
            Full Solution
          </p>
          <div className="space-y-3">
            {solutionContext.steps.map((step) => (
              <div
                key={step.step_number}
                className={cn(
                  'p-3 rounded-xl border',
                  isDark ? 'border-white/5 bg-[#16241e]' : 'border-slate-200 bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'h-5 w-5 rounded text-[10px] font-black flex items-center justify-center',
                      isDark ? 'bg-white/5 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    )}
                  >
                    {step.step_number}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {step.concept_id.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs leading-relaxed mt-1">
                  <Latex>{step.solution_line}</Latex>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="pb-8"
        >
          <button
            type="button"
            onClick={onBackToDashboard}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]',
              isDark
                ? 'bg-[#1b8f6a] hover:bg-[#20ab7f] text-white'
                : 'bg-[#163f36] hover:bg-[#205b4e] text-white'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}
