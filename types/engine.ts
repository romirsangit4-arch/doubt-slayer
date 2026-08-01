export interface TaxonomyConcept {
  concept_id: string;
  concept_name: string;
  concept_weight: number;
  prerequisites: string[];
  common_misconceptions: string[];
  estimated_learning_minutes: number;
  question_types: string[];
}

export interface TaxonomyTopic {
  id: string;
  name: string;
  concepts: TaxonomyConcept[];
}

export interface TaxonomySubject {
  id: string;
  name: string;
  topics: TaxonomyTopic[];
}

export interface TaxonomyData {
  subjects: TaxonomySubject[];
}

export interface SolutionStep {
  step_number: number;
  description: string;
  concept_id: string;
  solution_line: string;
}

export interface SolutionContext {
  problem_text: string;
  subject: string;
  topic: string;
  steps: SolutionStep[];
  concepts_involved: string[];
  difficulty_estimate: number;
}

export interface DiagnosticQuestion {
  question_text: string;
  expected_answer: string;
  evaluation_type: string;
  follow_up_if_wrong?: string;
}

export interface DiagnosticConcept {
  concept_id: string;
  relevance: number;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticPrerequisite {
  concept_id: string;
  parent_concept_id: string;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticBattery {
  concepts: DiagnosticConcept[];
  prerequisites: DiagnosticPrerequisite[];
  recommended_order: string[];
}

export interface AssessmentLogEntry {
  concept_id: string;
  question: string;
  student_answer: string;
  correct: boolean;
  timestamp: string;
}

export interface MicroExample {
  concept_id: string;
  problem_text: string;
  hidden_solution: string;
  hints: string[];
}

export interface MicroExampleSet {
  examples: MicroExample[];
}

export interface ReconstructionStep {
  step_number: number;
  question_to_student: string;
  expected_answer_type: string;
  hint_level_1: string;
  hint_level_2: string;
  hint_level_3: string;
  retreat_concept_id: string;
  solution_line: string;
}

export interface ReconstructionScaffold {
  steps: ReconstructionStep[];
  adaptive_rules: {
    max_hints_per_step: number;
    retreat_after_hints: boolean;
  };
}

export interface SessionCoverageConcept {
  concept_id: string;
  status: "repaired" | "weak" | "mastered";
  mastery_delta: number;
}

export interface SessionCoverageTopic {
  topic_id: string;
  coverage_pct: number;
  concepts_engaged: SessionCoverageConcept[];
}

export interface SessionCoverage {
  session_id: string;
  subjects_covered: string[];
  topics_covered: SessionCoverageTopic[];
  session_quality: number;
  abandonment_point: string | null;
}
