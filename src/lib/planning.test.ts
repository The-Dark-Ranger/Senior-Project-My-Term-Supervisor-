import { describe, expect, it } from 'vitest';
import { courseCatalog } from '@/data/course-catalog';
import {
  MAX_TERM_CREDITS,
  PROGRAM_COURSE_CODES,
  PROGRAM_PLAN,
  RECOMMENDED_TERM,
  coursesCompletedBeforeYear,
} from '@/data/program-plan';
import {
  PROGRAM_TOTAL_CREDITS,
  generateInsights,
  getAvailableCourses,
  getCourseStatus,
  getOverdueCourses,
  getProgress,
  hasBlockingIssues,
  recommendPlan,
  sumCredits,
  unlockCount,
  validatePlan,
} from './planning';
import type { StudentProfile } from '@/types';

function profile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    uid: 'u1',
    name: 'Test Student',
    email: 'test@example.com',
    program: 'B.Sc. Software Engineering',
    year: 1,
    completedCourses: [],
    plannedCourses: [],
    supervisorNotes: '',
    dismissedInsights: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('program plan data', () => {
  it('only references courses that exist in the catalog', () => {
    const codes = new Set(courseCatalog.map(c => c.courseCode));
    for (const code of PROGRAM_COURSE_CODES) expect(codes.has(code), code).toBe(true);
  });

  it('lists every course exactly once', () => {
    expect(new Set(PROGRAM_COURSE_CODES).size).toBe(PROGRAM_COURSE_CODES.length);
  });

  it('schedules every prerequisite in an earlier term', () => {
    for (const code of PROGRAM_COURSE_CODES) {
      const course = courseCatalog.find(c => c.courseCode === code)!;
      for (const prereq of course.prerequisites) {
        expect(RECOMMENDED_TERM.get(prereq), `${prereq} for ${code}`).toBeLessThan(RECOMMENDED_TERM.get(code)!);
      }
    }
  });

  it('keeps every term within the credit limit', () => {
    for (const term of PROGRAM_PLAN) {
      expect(sumCredits(term.courseCodes), term.label).toBeLessThanOrEqual(MAX_TERM_CREDITS);
    }
  });
});

describe('course status', () => {
  it('distinguishes completed, planned, available and locked courses', () => {
    const completed = new Set(['MATH 101']);
    const planned = new Set(['MATH 102']);
    expect(getCourseStatus('MATH 101', completed, planned)).toBe('completed');
    expect(getCourseStatus('MATH 102', completed, planned)).toBe('planned');
    expect(getCourseStatus('ENG 101', completed, planned)).toBe('available');
    expect(getCourseStatus('MATH 203', completed, planned)).toBe('locked');
  });

  it('returns only courses whose prerequisites are complete', () => {
    const available = getAvailableCourses([]).map(c => c.courseCode);
    expect(available).toContain('MATH 101');
    expect(available).not.toContain('MATH 102');
  });
});

describe('validatePlan', () => {
  it('flags missing prerequisites as errors', () => {
    const issues = validatePlan(['MATH 102'], []);
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues[0].message).toContain('MATH 101');
  });

  it('does not allow a prerequisite in the same term', () => {
    expect(hasBlockingIssues(validatePlan(['MATH 101', 'MATH 102'], []))).toBe(true);
  });

  it('rejects plans over the credit limit', () => {
    const plan = getAvailableCourses([]).map(c => c.courseCode);
    expect(sumCredits(plan)).toBeGreaterThan(MAX_TERM_CREDITS);
    expect(validatePlan(plan, []).some(i => i.message.includes('term limit'))).toBe(true);
  });

  it('rejects completed and duplicate courses', () => {
    const issues = validatePlan(['MATH 101', 'ENG 101', 'ENG 101'], ['MATH 101']);
    expect(issues.filter(i => i.severity === 'error')).toHaveLength(2);
  });

  it('warns (but does not block) on a light load', () => {
    const issues = validatePlan(['ENG 101'], []);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('accepts the recommended first term', () => {
    expect(validatePlan(PROGRAM_PLAN[0].courseCodes, [])).toEqual([]);
  });
});

describe('recommendPlan', () => {
  it('produces a valid plan for every year', () => {
    for (const year of [1, 2, 3, 4]) {
      const completed = coursesCompletedBeforeYear(year);
      const rec = recommendPlan({ completedCourses: completed, year });
      expect(rec.courseCodes.length, `year ${year}`).toBeGreaterThan(0);
      expect(hasBlockingIssues(validatePlan(rec.courseCodes, completed)), `year ${year}`).toBe(false);
      expect(rec.reasoning).toContain(`year ${year}`);
    }
  });

  it('respects the target credit load', () => {
    const rec = recommendPlan({ completedCourses: [], year: 1, targetCredits: 12 });
    expect(sumCredits(rec.courseCodes)).toBeLessThanOrEqual(12);
  });

  it('prioritises overdue courses', () => {
    const completed = coursesCompletedBeforeYear(2).filter(c => c !== 'ENG 102');
    const rec = recommendPlan({ completedCourses: completed, year: 2 });
    expect(rec.courseCodes).toContain('ENG 102');
  });

  it('handles a fully completed program', () => {
    const rec = recommendPlan({ completedCourses: PROGRAM_COURSE_CODES, year: 4 });
    expect(rec.courseCodes).toEqual([]);
    expect(rec.reasoning).toMatch(/All program courses are completed/);
  });
});

describe('progress and insights', () => {
  it('computes program progress', () => {
    expect(getProgress([]).percent).toBe(0);
    expect(getProgress(PROGRAM_COURSE_CODES).completedCredits).toBe(PROGRAM_TOTAL_CREDITS);
  });

  it('detects overdue courses', () => {
    expect(getOverdueCourses([], 2)).toEqual(PROGRAM_PLAN.slice(0, 2).flatMap(t => t.courseCodes));
  });

  it('counts transitive dependents', () => {
    expect(unlockCount('SE 201')).toBeGreaterThan(unlockCount('SE 418'));
  });

  it('hides dismissed insights', () => {
    const p = profile({ year: 2 });
    const insights = generateInsights(p);
    expect(insights.length).toBeGreaterThan(1);
    const filtered = generateInsights({ ...p, dismissedInsights: [insights[0]] });
    expect(filtered).not.toContain(insights[0]);
  });
});
