'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { SessionPhase } from '@/lib/exam-dashboard';
import { Sparkles, Brain, Wrench, Building2, Trophy } from 'lucide-react';

const PHASES: { key: SessionPhase; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'INGESTION', label: 'Scanning', icon: Sparkles, color: 'text-violet-400' },
  { key: 'DIAGNOSIS', label: 'Diagnosis', icon: Brain, color: 'text-emerald-400' },
  { key: 'REPAIR', label: 'Repair', icon: Wrench, color: 'text-amber-400' },
  { key: 'RECONSTRUCTION', label: 'Rebuild', icon: Building2, color: 'text-cyan-400' },
  { key: 'RESOLUTION', label: 'Mastery', icon: Trophy, color: 'text-yellow-400' },
];

const PHASE_INDEX: Record<SessionPhase, number> = {
  INGESTION: 0,
  DIAGNOSIS: 1,
  REPAIR: 2,
  RECONSTRUCTION: 3,
  RESOLUTION: 4,
};

export function PhaseProgressBar({
  currentPhase,
  theme,
}: {
  currentPhase: SessionPhase;
  theme: 'dark' | 'light';
}) {
  const isDark = theme === 'dark';
  const activeIdx = PHASE_INDEX[currentPhase];

  return (
    <div className="flex items-center gap-0.5 w-full px-1">
      {PHASES.map((phase, idx) => {
        const Icon = phase.icon;
        const isActive = idx === activeIdx;
        const isCompleted = idx < activeIdx;
        const isFuture = idx > activeIdx;

        return (
          <React.Fragment key={phase.key}>
            {/* Node */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <motion.div
                animate={{
                  scale: isActive ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  repeat: isActive ? Infinity : 0,
                  duration: 2,
                  ease: 'easeInOut',
                }}
                className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-300 border',
                  isCompleted
                    ? isDark
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-100 border-emerald-300 text-emerald-600'
                    : isActive
                    ? isDark
                      ? 'bg-[#1b8f6a]/20 border-[#1b8f6a]/40 text-[#1b8f6a] shadow-lg shadow-emerald-500/10'
                      : 'bg-[#163f36]/10 border-[#163f36]/30 text-[#163f36] shadow-lg shadow-emerald-500/10'
                    : isDark
                    ? 'bg-white/5 border-white/5 text-slate-600'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </motion.div>
              <span
                className={cn(
                  'text-[8px] font-black uppercase tracking-wider whitespace-nowrap',
                  isActive
                    ? phase.color
                    : isCompleted
                    ? isDark
                      ? 'text-emerald-400/60'
                      : 'text-emerald-600/60'
                    : 'text-slate-500'
                )}
              >
                {phase.label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {idx < PHASES.length - 1 && (
              <div className="flex-1 h-0.5 rounded-full overflow-hidden mx-0.5 mt-[-14px]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isCompleted
                      ? isDark
                        ? 'bg-emerald-500/40'
                        : 'bg-emerald-400/50'
                      : isDark
                      ? 'bg-white/5'
                      : 'bg-slate-200'
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
