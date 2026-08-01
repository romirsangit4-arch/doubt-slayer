import type { TargetExam } from './exams';
import type { SolutionContext, DiagnosticBattery, AssessmentLogEntry } from '../types/engine';
import { TAXONOMY_EXAM_STATS, TAXONOMY_SAMPLE_SESSIONS } from './taxonomy-dashboard';

export type SessionPhase = 'INGESTION' | 'DIAGNOSIS' | 'REPAIR' | 'RECONSTRUCTION' | 'RESOLUTION';

export type DashboardSession = {
  id: string;
  title: string;
  phase: SessionPhase;
  state: string; // legacy display string
  messages: {
    id: string;
    role: 'student' | 'tutor';
    content: string;
    meta?: string;
  }[];
  topic: string;
  date: string;
  hasImage?: boolean;
  
  // New Engine Data
  solutionContext?: SolutionContext;
  diagnosticBattery?: DiagnosticBattery;
  assessmentLog?: AssessmentLogEntry[];
  currentQuestionIndex?: number;
};

type SubjectKey = 'all' | 'physics' | 'chemistry' | 'math';

type SubjectStatBlock = {
  streak: string;
  accuracy: number;
  benchmarkText: string;
  accuracyLabel: string;
  knowledgeMap: { topic: string; value: string; color: string }[];
};

const JEE_MAINS_SESSIONS: DashboardSession[] = [
  {
    id: 'session-1',
    title: 'Rotational torque of cylinder',
    phase: 'DIAGNOSIS',
    state: 'Act 1: Diagnosis',
    topic: 'Mechanics',
    date: 'Today',
    hasImage: true,
    messages: [
      {
        id: 'm1',
        role: 'tutor',
        content:
          'Here is a diagram from HC Verma. Let us check the moment of inertia about the moving cylinder axis. Why did you choose point A?',
        meta: '10:30 AM',
      },
      {
        id: 'm2',
        role: 'student',
        content: 'Because point A is the instantaneous center of zero velocity.',
        meta: '10:32 AM',
      },
    ],
  },
  {
    id: 'session-2',
    title: 'Definite integration bounds',
    phase: 'RECONSTRUCTION',
    state: 'Act 3: Reconstruction',
    topic: 'Calculus',
    date: 'Yesterday',
    messages: [
      {
        id: 'n1',
        role: 'tutor',
        content: 'If the charge density is non-uniform, what is the integration element $dq$?',
        meta: '3:15 PM',
      },
      {
        id: 'n2',
        role: 'student',
        content: 'It should be $dq = \\sigma(r) \\cdot 2\\pi r dr$.',
        meta: '3:16 PM',
      },
    ],
  },
  {
    id: 'session-3',
    title: 'Organic ether nomenclature rules',
    phase: 'RESOLUTION',
    state: 'Completed',
    topic: 'Chemistry',
    date: '2 days ago',
    messages: [
      {
        id: 'c1',
        role: 'tutor',
        content:
          'When naming an ether with an alkoxy group, which carbon chain is chosen as the parent alkane?',
        meta: '11:00 AM',
      },
      {
        id: 'c2',
        role: 'student',
        content: 'The parent alkane should be the longest continuous carbon chain.',
        meta: '11:02 AM',
      },
    ],
  },
];

const JEE_ADVANCED_SESSIONS: DashboardSession[] = TAXONOMY_SAMPLE_SESSIONS['jee-advanced'] ?? [];

const CBSE_SESSIONS: DashboardSession[] = TAXONOMY_SAMPLE_SESSIONS['cbse-12'] ?? [];

export const INITIAL_SESSIONS_BY_EXAM: Record<TargetExam, DashboardSession[]> = {
  'jee-mains': JEE_MAINS_SESSIONS,
  'jee-advanced': JEE_ADVANCED_SESSIONS,
  'cbse-12': CBSE_SESSIONS,
};

const JEE_MAINS_STATS: Record<SubjectKey, SubjectStatBlock> = {
  all: {
    streak: '4 days',
    accuracy: 74,
    benchmarkText:
      'You successfully identify torque, isomers, and integration bounds on the first attempt 74% of the time.',
    accuracyLabel: 'Combined accuracy index',
    knowledgeMap: [
      { topic: 'Mechanics (Rotational, Kinematics)', value: '76%', color: 'bg-emerald-500' },
      { topic: 'Electrostatics (Field flux, Capacitance)', value: '58%', color: 'bg-cyan-500' },
      { topic: 'Calculus (Definite integral bounds)', value: '40%', color: 'bg-amber-500' },
      { topic: 'Organic Chemistry (Nomenclature)', value: '12%', color: 'bg-rose-500' },
    ],
  },
  physics: {
    streak: '3 days',
    accuracy: 82,
    benchmarkText:
      'You successfully identify dynamic torque axis constraints on the first attempt 82% of the time.',
    accuracyLabel: 'Physics accuracy index',
    knowledgeMap: [
      { topic: 'Mechanics (Rotational Dynamics)', value: '76%', color: 'bg-emerald-500' },
      { topic: 'Electrostatics (Field flux, Capacitance)', value: '58%', color: 'bg-cyan-500' },
      { topic: 'Thermodynamics (Heat engines)', value: '35%', color: 'bg-amber-500' },
    ],
  },
  chemistry: {
    streak: '1 day',
    accuracy: 55,
    benchmarkText:
      'You successfully identify stereochemistry isomers on the first attempt 55% of the time.',
    accuracyLabel: 'Chemistry accuracy index',
    knowledgeMap: [
      { topic: 'Organic Chemistry (Nomenclature)', value: '42%', color: 'bg-rose-500' },
      { topic: 'Chemical Bonding (Hybridization)', value: '30%', color: 'bg-emerald-500' },
      { topic: 'Physical Chemistry (Kinetics)', value: '15%', color: 'bg-amber-500' },
    ],
  },
  math: {
    streak: '2 days',
    accuracy: 68,
    benchmarkText:
      'You successfully set up definite integration bounds on the first attempt 68% of the time.',
    accuracyLabel: 'Math accuracy index',
    knowledgeMap: [
      { topic: 'Calculus (Definite integral bounds)', value: '68%', color: 'bg-amber-500' },
      { topic: 'Coordinate Geometry (Conics)', value: '40%', color: 'bg-emerald-500' },
      { topic: 'Algebra (Complex Numbers)', value: '25%', color: 'bg-cyan-500' },
    ],
  },
};

const JEE_ADVANCED_STATS: Record<SubjectKey, SubjectStatBlock> = TAXONOMY_EXAM_STATS['jee-advanced'];

const CBSE_STATS: Record<SubjectKey, SubjectStatBlock> = TAXONOMY_EXAM_STATS['cbse-12'];

export const EXAM_SUBJECT_STATS: Record<TargetExam, Record<SubjectKey, SubjectStatBlock>> = {
  'jee-mains': JEE_MAINS_STATS,
  'jee-advanced': JEE_ADVANCED_STATS,
  'cbse-12': CBSE_STATS,
};

export function countResolved(sessions: DashboardSession[]) {
  return sessions.filter((s) => s.state === 'Completed').length;
}

export function countGaps(sessions: DashboardSession[]) {
  return sessions.length;
}

export function filterSessionsBySubject(
  sessions: DashboardSession[],
  subject: SubjectKey
) {
  if (subject === 'all') return sessions;
  if (subject === 'physics') {
    return sessions.filter((s) => s.topic === 'Mechanics' || s.topic === 'Electrostatics');
  }
  if (subject === 'chemistry') return sessions.filter((s) => s.topic === 'Chemistry');
  return sessions.filter((s) => s.topic === 'Calculus');
}
