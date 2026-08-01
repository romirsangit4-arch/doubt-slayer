export type TargetExam = 'jee-mains' | 'jee-advanced' | 'cbse-12';

export const EXAM_OPTIONS: { id: TargetExam; label: string }[] = [

  { id: 'jee-mains', label: 'JEE Mains' },
  { id: 'jee-advanced', label: 'JEE Advanced' },
  { id: 'cbse-12', label: 'CBSE 12th' },
];

export function parseTargetExam(value: unknown): TargetExam {
  if (value === 'jee-advanced' || value === 'cbse-12' || value === 'jee-mains') {
    return value;
  }
  return 'jee-mains';
}

export function getExamWorkspaceLabel(exam: TargetExam): string {
  switch (exam) {
    case 'jee-mains':
      return 'JEE Mains Workspace';
    case 'jee-advanced':
      return 'JEE Advanced Workspace';
    case 'cbse-12':
      return 'CBSE 12th Workspace';
  }
}

export function getSyllabusMapTitle(exam: TargetExam): string {
  switch (exam) {
    case 'jee-mains':
      return 'JEE Mains Syllabus Mastery Map';
    case 'jee-advanced':
      return 'JEE Advanced Syllabus Mastery Map';
    case 'cbse-12':
      return 'CBSE 12th Syllabus Mastery Map';
  }
}

export function getChatPlaceholder(exam: TargetExam): string {
  switch (exam) {
    case 'jee-mains':
      return 'Ask the Socratic tutor about your JEE Mains doubt...';
    case 'jee-advanced':
      return 'Ask the Socratic tutor about your JEE Advanced doubt...';
    case 'cbse-12':
      return 'Ask the Socratic tutor about your CBSE 12th doubt...';
  }
}
