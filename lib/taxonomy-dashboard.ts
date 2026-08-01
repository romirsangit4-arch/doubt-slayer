import type { TargetExam } from './exams';
import type { DashboardSession } from './exam-dashboard';
import type { TaxonomyData } from '../types/engine';
import taxonomyJson from '../data/jee_taxonomy.json';

const taxonomy = taxonomyJson as TaxonomyData;

const COLORS = ['bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500'];

type SubjectKey = 'all' | 'physics' | 'chemistry' | 'math';

type SubjectStatBlock = {
  streak: string;
  accuracy: number;
  benchmarkText: string;
  accuracyLabel: string;
  knowledgeMap: { topic: string; value: string; color: string }[];
};

function buildKnowledgeMapFromTaxonomy(
  exam: TargetExam,
  subjectFilter?: 'physics' | 'chemistry' | 'math'
): { topic: string; value: string; color: string }[] {
  const entries: { topic: string; value: string; color: string }[] = [];

  for (const subject of taxonomy.subjects) {
    if (subjectFilter && subject.id !== subjectFilter) continue;
    if (exam === 'cbse-12' && subject.id !== 'physics' && subject.id !== 'mathematics' && subject.id !== 'chemistry') {
      continue;
    }

    for (let i = 0; i < subject.topics.length; i++) {
      const topic = subject.topics[i];
      const conceptCount = topic.concepts.length;
      const basePct =
        exam === 'jee-advanced' ? 35 + (i * 7) % 25 : exam === 'cbse-12' ? 45 + (i * 5) % 20 : 55 + (i * 8) % 30;
      const value = conceptCount > 0 ? `${Math.min(basePct, 92)}%` : '—';

      entries.push({
        topic: `${subject.name} (${topic.name})`,
        value,
        color: COLORS[i % COLORS.length],
      });
    }
  }

  return entries.slice(0, exam === 'cbse-12' ? 3 : 4);
}

function buildStatsForExam(exam: TargetExam): Record<SubjectKey, SubjectStatBlock> {
  const examLabel =
    exam === 'jee-advanced' ? 'JEE Advanced' : exam === 'cbse-12' ? 'CBSE 12th' : 'JEE Mains';

  const allMap = buildKnowledgeMapFromTaxonomy(exam);
  const physicsMap = buildKnowledgeMapFromTaxonomy(exam, 'physics');
  const mathMap = buildKnowledgeMapFromTaxonomy(exam, 'math');

  const baseAccuracy = exam === 'jee-advanced' ? 62 : exam === 'cbse-12' ? 58 : 74;

  return {
    all: {
      streak: exam === 'jee-advanced' ? '2 days' : '3 days',
      accuracy: baseAccuracy,
      benchmarkText: `${examLabel} diagnostic accuracy across taxonomy-mapped topics from your syllabus tree.`,
      accuracyLabel: `${examLabel} combined index`,
      knowledgeMap: allMap,
    },
    physics: {
      streak: '2 days',
      accuracy: baseAccuracy + 8,
      benchmarkText: `${examLabel} Physics — mastery tracked against rotational dynamics and mechanics nodes.`,
      accuracyLabel: 'Physics accuracy index',
      knowledgeMap: physicsMap.length > 0 ? physicsMap : allMap.slice(0, 2),
    },
    chemistry: {
      streak: '1 day',
      accuracy: exam === 'cbse-12' ? 52 : 55,
      benchmarkText: `${examLabel} Chemistry — chapter nodes from the syllabus taxonomy.`,
      accuracyLabel: 'Chemistry accuracy index',
      knowledgeMap:
        exam === 'cbse-12'
          ? [
              { topic: 'Chemistry (Solutions & colligative properties)', value: '50%', color: 'bg-rose-500' },
              { topic: 'Chemistry (Chemical kinetics)', value: '38%', color: 'bg-amber-500' },
            ]
          : [
              { topic: 'Chemistry (Coordination compounds)', value: '42%', color: 'bg-rose-500' },
              { topic: 'Chemistry (Chemical thermodynamics)', value: '30%', color: 'bg-emerald-500' },
            ],
    },
    math: {
      streak: '2 days',
      accuracy: baseAccuracy - 6,
      benchmarkText: `${examLabel} Mathematics — integral calculus and algebra nodes from taxonomy.`,
      accuracyLabel: 'Math accuracy index',
      knowledgeMap: mathMap.length > 0 ? mathMap : allMap.slice(-2),
    },
  };
}

function buildSampleSessions(exam: TargetExam): DashboardSession[] {
  const physicsTopic = taxonomy.subjects.find((s) => s.id === 'physics')?.topics[0];
  const mathTopic = taxonomy.subjects.find((s) => s.id === 'mathematics')?.topics[0];

  const physicsConcept = physicsTopic?.concepts[1]?.concept_name ?? 'Torque definition';
  const mathConcept = mathTopic?.concepts[0]?.concept_name ?? 'Definite integral bounds';

  if (exam === 'jee-advanced') {
    return [
      {
        id: 'adv-tax-1',
        title: `${physicsTopic?.name ?? 'Rotational Dynamics'} — angular momentum`,
        phase: 'DIAGNOSIS',
        state: 'Act 1: Diagnosis',
        topic: 'Mechanics',
        date: 'Today',
        hasImage: true,
        messages: [
          {
            id: 'adv-t1',
            role: 'tutor',
            content: `JEE Advanced: ${physicsConcept}. About which axis is angular momentum conserved when no external torque acts?`,
            meta: '9:00 AM',
          },
        ],
      },
      {
        id: 'adv-tax-2',
        title: `${mathTopic?.name ?? 'Integral Calculus'} — multi-step bounds`,
        phase: 'REPAIR',
        state: 'Act 2: Fragment Repair',
        topic: 'Calculus',
        date: 'Yesterday',
        messages: [
          {
            id: 'adv-t2',
            role: 'tutor',
            content: `Advanced repair on ${mathConcept}. After substitution, what must happen to the integration limits?`,
            meta: '4:00 PM',
          },
        ],
      },
      {
        id: 'adv-tax-3',
        title: 'Rolling without slipping — energy method',
        phase: 'RESOLUTION',
        state: 'Completed',
        topic: 'Mechanics',
        date: '3 days ago',
        messages: [
          {
            id: 'adv-t3',
            role: 'tutor',
            content:
              'Session resolved: linked rotational KE, translational KE, and frictionless rolling constraint correctly.',
            meta: '2:00 PM',
          },
        ],
      },
    ];
  }

  if (exam === 'cbse-12') {
    return [
      {
        id: 'cbse-tax-1',
        title: 'Electrostatic potential — equipotential surfaces',
        phase: 'DIAGNOSIS',
        state: 'Act 1: Diagnosis',
        topic: 'Electrostatics',
        date: 'Today',
        messages: [
          {
            id: 'cbse-t1',
            role: 'tutor',
            content: 'CBSE Physics: What is the work done moving a charge along an equipotential surface?',
            meta: '10:00 AM',
          },
        ],
      },
      {
        id: 'cbse-tax-2',
        title: 'Solutions — boiling point elevation',
        phase: 'RECONSTRUCTION',
        state: 'Act 3: Reconstruction',
        topic: 'Chemistry',
        date: 'Yesterday',
        messages: [
          {
            id: 'cbse-t2',
            role: 'tutor',
            content: 'CBSE Chemistry: Write the relation between molality and $\\Delta T_b$ for a non-volatile solute.',
            meta: '1:00 PM',
          },
        ],
      },
      {
        id: 'cbse-tax-3',
        title: `${mathConcept} — board-style`,
        phase: 'RESOLUTION',
        state: 'Completed',
        topic: 'Calculus',
        date: '2 days ago',
        messages: [
          {
            id: 'cbse-t3',
            role: 'tutor',
            content: `CBSE Mathematics: ${mathConcept} — show why reversing limits changes the sign of the integral.`,
            meta: '5:00 PM',
          },
        ],
      },
    ];
  }

  return [];
}

export const TAXONOMY_EXAM_STATS: Record<TargetExam, Record<SubjectKey, SubjectStatBlock>> = {
  'jee-mains': buildStatsForExam('jee-mains'),
  'jee-advanced': buildStatsForExam('jee-advanced'),
  'cbse-12': buildStatsForExam('cbse-12'),
};

export const TAXONOMY_SAMPLE_SESSIONS: Partial<Record<TargetExam, DashboardSession[]>> = {
  'jee-advanced': buildSampleSessions('jee-advanced'),
  'cbse-12': buildSampleSessions('cbse-12'),
};
