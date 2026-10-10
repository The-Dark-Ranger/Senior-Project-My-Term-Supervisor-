/**
 * Recommended 8-term study plan for the sample B.Sc. Software Engineering
 * program. Every course's prerequisites are scheduled in an earlier term,
 * which `planning.test.ts` verifies.
 */

export const PROGRAM_NAME = 'B.Sc. Software Engineering';

/** Credit limits for a single regular term. */
export const MIN_TERM_CREDITS = 12;
export const MAX_TERM_CREDITS = 20;
export const DEFAULT_TARGET_CREDITS = 18;

export const PROGRAM_YEARS = 4;
export const TERMS_PER_YEAR = 2;

export interface PlanTerm {
  /** 1-based term index across the whole program (1..8). */
  term: number;
  year: number;
  label: string;
  courseCodes: string[];
}

export const PROGRAM_PLAN: PlanTerm[] = [
  { term: 1, year: 1, label: 'Year 1 · Fall', courseCodes: ['MATH 101', 'PHYS 101', 'ENG 101', 'SE 201', 'ISLS 101', 'ARAB 101'] },
  { term: 2, year: 1, label: 'Year 1 · Spring', courseCodes: ['MATH 102', 'CHEM 101', 'ENG 102', 'GE 202', 'ISLS 201', 'ARAB 201'] },
  { term: 3, year: 2, label: 'Year 2 · Fall', courseCodes: ['MATH 203', 'PHYS 102', 'SE 203', 'IE 201', 'SOC 140', 'ISLS 301'] },
  { term: 4, year: 2, label: 'Year 2 · Spring', courseCodes: ['MATH 241', 'SE 206', 'SE 308', 'SE 204', 'IE 331', 'BUS 351'] },
  { term: 5, year: 3, label: 'Year 3 · Fall', courseCodes: ['SE 205', 'SE 307', 'SE 309', 'SE 312', 'SE 310'] },
  { term: 6, year: 3, label: 'Year 3 · Spring', courseCodes: ['SE 311', 'SE 313', 'SE 314', 'SE 316', 'SE 315', 'SE 421'] },
  { term: 7, year: 4, label: 'Year 4 · Fall', courseCodes: ['SE 418', 'SE 419', 'Track I', 'Track II', 'Track III'] },
  { term: 8, year: 4, label: 'Year 4 · Spring', courseCodes: ['SE 420', 'SE 499', 'Track IV', 'Track V'] },
];

/** Course code -> recommended term number. */
export const RECOMMENDED_TERM: ReadonlyMap<string, number> = new Map(
  PROGRAM_PLAN.flatMap(t => t.courseCodes.map(code => [code, t.term] as const)),
);

export const PROGRAM_COURSE_CODES: string[] = PROGRAM_PLAN.flatMap(t => t.courseCodes);

/** Courses a student is expected to have completed when starting the given year. */
export function coursesCompletedBeforeYear(year: number): string[] {
  return PROGRAM_PLAN.filter(t => t.year < year).flatMap(t => t.courseCodes);
}
