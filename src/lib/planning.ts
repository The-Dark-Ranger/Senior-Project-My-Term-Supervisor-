/**
 * Pure academic-planning logic: prerequisite checks, plan validation,
 * the rule-based term recommender and supervisor insights.
 *
 * Everything here is framework-free so it can run on the client, inside
 * server actions (to validate AI output) and in unit tests.
 */
import { courseCatalog, type CatalogCourse } from '@/data/course-catalog';
import {
  DEFAULT_TARGET_CREDITS,
  MAX_TERM_CREDITS,
  MIN_TERM_CREDITS,
  PROGRAM_COURSE_CODES,
  RECOMMENDED_TERM,
  TERMS_PER_YEAR,
} from '@/data/program-plan';
import type { CourseStatus, PlanIssue, PlanRecommendation, StudentProfile } from '@/types';

const SUMMER_TRAINING_CODE = 'SE 417';
const SUMMER_TRAINING_MIN_CREDITS = 90;
const MAX_COURSES_PER_TERM = 7;

export const catalogByCode: ReadonlyMap<string, CatalogCourse> = new Map(
  courseCatalog.map(c => [c.courseCode, c]),
);

export function getCourse(code: string): CatalogCourse | undefined {
  return catalogByCode.get(code);
}

export function isKnownCourse(code: string): boolean {
  return catalogByCode.has(code);
}

export function sumCredits(codes: Iterable<string>): number {
  let total = 0;
  for (const code of codes) total += getCourse(code)?.credits ?? 0;
  return total;
}

export const PROGRAM_TOTAL_CREDITS = sumCredits(PROGRAM_COURSE_CODES);

/** Course code -> courses that list it as a direct prerequisite. */
const dependents: ReadonlyMap<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const course of courseCatalog) {
    for (const prereq of course.prerequisites) {
      map.set(prereq, [...(map.get(prereq) ?? []), course.courseCode]);
    }
  }
  return map;
})();

const unlockDepthCache = new Map<string, number>();

/** Length of the longest chain of courses that depend on `code` (0 = nothing waits on it). */
export function unlockDepth(code: string): number {
  const cached = unlockDepthCache.get(code);
  if (cached !== undefined) return cached;
  const next = dependents.get(code) ?? [];
  const depth = next.length === 0 ? 0 : 1 + Math.max(...next.map(unlockDepth));
  unlockDepthCache.set(code, depth);
  return depth;
}

/** Number of distinct courses that (transitively) require `code`. */
export function unlockCount(code: string): number {
  const seen = new Set<string>();
  const stack = [...(dependents.get(code) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(dependents.get(current) ?? []));
  }
  return seen.size;
}

export function missingPrerequisites(code: string, completed: ReadonlySet<string>): string[] {
  return (getCourse(code)?.prerequisites ?? []).filter(p => !completed.has(p));
}

export function getCourseStatus(
  code: string,
  completed: ReadonlySet<string>,
  planned: ReadonlySet<string> = new Set(),
): CourseStatus {
  if (completed.has(code)) return 'completed';
  if (planned.has(code)) return 'planned';
  return missingPrerequisites(code, completed).length === 0 ? 'available' : 'locked';
}

function byRecommendedTerm(a: string, b: string): number {
  const termA = RECOMMENDED_TERM.get(a) ?? Number.MAX_SAFE_INTEGER;
  const termB = RECOMMENDED_TERM.get(b) ?? Number.MAX_SAFE_INTEGER;
  return termA - termB || a.localeCompare(b);
}

/** Program courses that are not completed and whose prerequisites are all completed. */
export function getAvailableCourses(completedCodes: Iterable<string>): CatalogCourse[] {
  const completed = new Set(completedCodes);
  return PROGRAM_COURSE_CODES.filter(
    code => !completed.has(code) && missingPrerequisites(code, completed).length === 0,
  )
    .sort(byRecommendedTerm)
    .map(code => getCourse(code)!);
}

/** First term of the student's current year (e.g. year 2 starts at term 3). */
export function expectedStartTerm(year: number): number {
  return (Math.min(Math.max(year, 1), 4) - 1) * TERMS_PER_YEAR + 1;
}

/** Program courses scheduled before the student's current year that are still not completed. */
export function getOverdueCourses(completedCodes: Iterable<string>, year: number): string[] {
  const completed = new Set(completedCodes);
  const startTerm = expectedStartTerm(year);
  return PROGRAM_COURSE_CODES.filter(
    code => !completed.has(code) && (RECOMMENDED_TERM.get(code) ?? 0) < startTerm,
  );
}

export interface ProgressSummary {
  completedCredits: number;
  totalCredits: number;
  percent: number;
  completedCount: number;
  totalCount: number;
  remainingCredits: number;
}

export function getProgress(completedCodes: Iterable<string>): ProgressSummary {
  const completed = new Set(completedCodes);
  const programCompleted = PROGRAM_COURSE_CODES.filter(c => completed.has(c));
  const completedCredits = sumCredits(programCompleted);
  return {
    completedCredits,
    totalCredits: PROGRAM_TOTAL_CREDITS,
    percent: PROGRAM_TOTAL_CREDITS === 0 ? 0 : Math.round((completedCredits / PROGRAM_TOTAL_CREDITS) * 100),
    completedCount: programCompleted.length,
    totalCount: PROGRAM_COURSE_CODES.length,
    remainingCredits: PROGRAM_TOTAL_CREDITS - completedCredits,
  };
}

/**
 * Validates a draft term plan. Errors block submission; warnings are advisory.
 * Prerequisites must be completed in an earlier term - planning a course and its
 * prerequisite in the same term is not allowed.
 */
export function validatePlan(plannedCodes: string[], completedCodes: Iterable<string>): PlanIssue[] {
  const completed = new Set(completedCodes);
  const issues: PlanIssue[] = [];
  const seen = new Set<string>();

  for (const code of plannedCodes) {
    if (seen.has(code)) {
      issues.push({ severity: 'error', courseCode: code, message: `${code} is listed more than once.` });
      continue;
    }
    seen.add(code);

    if (!isKnownCourse(code)) {
      issues.push({ severity: 'error', courseCode: code, message: `${code} is not in the course catalog.` });
      continue;
    }
    if (completed.has(code)) {
      issues.push({ severity: 'error', courseCode: code, message: `${code} has already been completed.` });
      continue;
    }
    const missing = missingPrerequisites(code, completed);
    if (missing.length > 0) {
      issues.push({
        severity: 'error',
        courseCode: code,
        message: `${code} requires ${missing.join(', ')} to be completed first.`,
      });
    }
  }

  const credits = sumCredits(seen);
  if (credits > MAX_TERM_CREDITS) {
    issues.push({
      severity: 'error',
      message: `${credits} credits exceeds the ${MAX_TERM_CREDITS}-credit term limit.`,
    });
  } else if (plannedCodes.length > 0 && credits < MIN_TERM_CREDITS) {
    const remaining = getProgress(completed).remainingCredits;
    if (remaining > credits) {
      issues.push({
        severity: 'warning',
        message: `${credits} credits is below the usual full-time load of ${MIN_TERM_CREDITS} credits.`,
      });
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: PlanIssue[]): boolean {
  return issues.some(i => i.severity === 'error');
}

/** Sort order for recommendations: earliest recommended term, then longest dependency chain. */
export function compareByPriority(a: string, b: string): number {
  return (
    (RECOMMENDED_TERM.get(a) ?? 99) - (RECOMMENDED_TERM.get(b) ?? 99) ||
    unlockDepth(b) - unlockDepth(a) ||
    unlockCount(b) - unlockCount(a) ||
    a.localeCompare(b)
  );
}

export interface RecommendOptions {
  completedCourses: string[];
  year: number;
  targetCredits?: number;
}

/**
 * Rule-based term recommender. Greedily fills the term with available courses,
 * prioritising overdue courses, then courses on the longest prerequisite chain
 * (the ones that would delay graduation the most if postponed).
 */
export function recommendPlan({
  completedCourses,
  year,
  targetCredits = DEFAULT_TARGET_CREDITS,
}: RecommendOptions): PlanRecommendation {
  const target = Math.min(Math.max(targetCredits, MIN_TERM_CREDITS), MAX_TERM_CREDITS);
  const available = getAvailableCourses(completedCourses).map(c => c.courseCode);

  if (available.length === 0) {
    const done = getProgress(completedCourses).remainingCredits === 0;
    return {
      courseCodes: [],
      source: 'planner',
      insights: [],
      reasoning: done
        ? 'All program courses are completed - no further courses are required.'
        : 'No courses are currently available. Review outstanding prerequisites with your supervisor.',
    };
  }

  const ordered = [...available].sort(compareByPriority);
  const chosen: string[] = [];
  let credits = 0;
  for (const code of ordered) {
    const courseCredits = getCourse(code)!.credits;
    if (credits + courseCredits > target || chosen.length >= MAX_COURSES_PER_TERM) continue;
    chosen.push(code);
    credits += courseCredits;
  }

  return {
    courseCodes: chosen,
    source: 'planner',
    insights: [],
    reasoning: explainRecommendation(chosen, completedCourses, year),
  };
}

function explainRecommendation(chosen: string[], completedCourses: string[], year: number): string {
  const credits = sumCredits(chosen);
  const overdue = new Set(getOverdueCourses(completedCourses, year));
  const catchUp = chosen.filter(c => overdue.has(c));
  const critical = [...chosen].sort((a, b) => unlockCount(b) - unlockCount(a))[0];

  const parts = [
    `This plan recommends ${chosen.length} course${chosen.length === 1 ? '' : 's'} (${credits} credits) for a year ${year} student.`,
  ];
  if (catchUp.length > 0) {
    parts.push(`It first catches up on ${catchUp.join(', ')} from earlier terms.`);
  }
  if (critical && unlockCount(critical) > 0) {
    parts.push(
      `${critical} is prioritised because ${unlockCount(critical)} later course${unlockCount(critical) === 1 ? '' : 's'} depend on it, so postponing it would delay graduation.`,
    );
  }
  if (credits >= MIN_TERM_CREDITS) {
    parts.push(`The load stays within the ${MIN_TERM_CREDITS}-${MAX_TERM_CREDITS} credit range.`);
  } else {
    parts.push('The load is light because only these courses currently have their prerequisites met.');
  }
  return parts.join(' ');
}

/** Rule-based observations shown to supervisors in "Supervisor Notes & Insights". */
export function generateInsights(profile: StudentProfile, pendingCourseCodes?: string[]): string[] {
  const insights: string[] = [];
  const completed = new Set(profile.completedCourses);
  const progress = getProgress(completed);
  const plan = pendingCourseCodes ?? profile.plannedCourses;
  const planSet = new Set(plan);

  insights.push(
    `${profile.name} has completed ${progress.completedCredits} of ${progress.totalCredits} program credits (${progress.percent}%).`,
  );

  const overdue = getOverdueCourses(completed, profile.year);
  if (overdue.length > 0) {
    insights.push(
      `${overdue.length} course${overdue.length === 1 ? ' is' : 's are'} behind the recommended plan: ${overdue.slice(0, 6).join(', ')}${overdue.length > 6 ? ', …' : ''}.`,
    );
  }

  const bottleneck = getAvailableCourses(completed)
    .map(c => c.courseCode)
    .filter(code => !planSet.has(code))
    .sort((a, b) => unlockCount(b) - unlockCount(a))[0];
  if (bottleneck && unlockCount(bottleneck) >= 3) {
    insights.push(
      `${bottleneck} is not in the current plan but unlocks ${unlockCount(bottleneck)} later courses - consider prioritising it.`,
    );
  }

  if (plan.length > 0) {
    const issues = validatePlan(plan, completed);
    for (const issue of issues.slice(0, 3)) insights.push(`Plan check: ${issue.message}`);
  }

  if (progress.remainingCredits > 0 && progress.remainingCredits <= MAX_TERM_CREDITS) {
    insights.push(`Only ${progress.remainingCredits} credits remain - ${profile.name} may be able to graduate this term.`);
  }

  if (progress.completedCredits >= SUMMER_TRAINING_MIN_CREDITS && !completed.has(SUMMER_TRAINING_CODE)) {
    insights.push(`Eligible for Summer Training (${SUMMER_TRAINING_CODE}) after completing ${SUMMER_TRAINING_MIN_CREDITS}+ credits.`);
  }

  const dismissed = new Set(profile.dismissedInsights);
  return insights.filter(i => !dismissed.has(i));
}
