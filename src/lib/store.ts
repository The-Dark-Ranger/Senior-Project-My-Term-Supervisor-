/**
 * Client-side data store for profiles, schedule submissions and meetings.
 *
 * Data is persisted in localStorage and synchronised live between tabs, so a
 * student tab and a supervisor tab in the same browser see each other's changes
 * instantly. All reads/writes go through this module, which keeps the rest of
 * the app independent of the storage backend (e.g. a future Firestore adapter).
 */
'use client';

import { useSyncExternalStore } from 'react';
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { PROGRAM_NAME, coursesCompletedBeforeYear } from '@/data/program-plan';
import { MEETING_DURATION_MINUTES, upcomingSlots } from '@/data/meeting-availability';
import { DEMO_ACCOUNTS } from '@/lib/auth/demo-backend';
import { onStorageKeyChange, readRaw, removeKey, writeJson } from '@/lib/local-storage';
import { recommendPlan, sumCredits } from '@/lib/planning';
import { createId } from '@/lib/utils';
import type {
  AppUser,
  MeetingRequest,
  MeetingStatus,
  ScheduleSubmission,
  StudentProfile,
} from '@/types';

const DB_KEY = 'term-supervisor:db:v2';
/** Keys used by the original prototype; removed on first load. */
const LEGACY_KEYS = ['loggedInUser', 'termSupervisorMeetingRequests_v1', 'termSupervisorSubmissions_v1', 'termSupervisorStudents_v1'];

export interface Db {
  students: Record<string, StudentProfile>;
  submissions: ScheduleSubmission[];
  meetings: MeetingRequest[];
}

const EMPTY_DB: Db = { students: {}, submissions: [], meetings: [] };

let cachedRaw: string | null | undefined;
let cachedDb: Db = EMPTY_DB;
const listeners = new Set<() => void>();

function parseDb(raw: string | null): Db {
  if (!raw) return EMPTY_DB;
  try {
    const value = JSON.parse(raw) as Partial<Db>;
    return {
      students: value.students && typeof value.students === 'object' ? value.students : {},
      submissions: Array.isArray(value.submissions) ? value.submissions : [],
      meetings: Array.isArray(value.meetings) ? value.meetings : [],
    };
  } catch {
    return EMPTY_DB;
  }
}

function readDb(): Db {
  const raw = readRaw(DB_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDb = parseDb(raw);
  }
  return cachedDb;
}

function emit() {
  listeners.forEach(l => l());
}

function update(mutator: (db: Db) => Db): void {
  const next = mutator(readDb());
  cachedRaw = writeJson(DB_KEY, next);
  cachedDb = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const stop = onStorageKeyChange([DB_KEY], listener);
  return () => {
    listeners.delete(listener);
    stop();
  };
}

/** React hook returning the current database snapshot (empty during SSR). */
export function useDb(): Db {
  return useSyncExternalStore(subscribe, readDb, () => EMPTY_DB);
}

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** The student's active (non-archived, non-withdrawn) submission, newest first. */
export function activeSubmissionFor(db: Db, studentUid: string): ScheduleSubmission | undefined {
  return db.submissions
    .filter(s => s.studentUid === studentUid && !s.archived && s.status !== 'withdrawn')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

function newProfile(user: Pick<AppUser, 'uid' | 'name' | 'email'>, year: number): StudentProfile {
  const timestamp = now();
  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    program: PROGRAM_NAME,
    year,
    completedCourses: coursesCompletedBeforeYear(year),
    plannedCourses: [],
    supervisorNotes: '',
    dismissedInsights: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Creates a profile for a student on first login. Existing profiles are left untouched. */
export function ensureStudentProfile(user: AppUser, year = 1): void {
  if (readDb().students[user.uid]) return;
  update(db => ({ ...db, students: { ...db.students, [user.uid]: newProfile(user, year) } }));
}

export function updateStudent(uid: string, patch: Partial<Omit<StudentProfile, 'uid'>>): void {
  update(db => {
    const current = db.students[uid];
    if (!current) return db;
    return { ...db, students: { ...db.students, [uid]: { ...current, ...patch, updatedAt: now() } } };
  });
}

// ---------------------------------------------------------------------------
// Schedule submissions
// ---------------------------------------------------------------------------

export function submitPlan(profile: StudentProfile, note: string): ScheduleSubmission {
  const active = activeSubmissionFor(readDb(), profile.uid);
  if (active?.status === 'pending') throw new Error('You already have a plan awaiting review.');
  if (active?.status === 'approved') throw new Error('Your plan for this term has already been approved.');

  const submission: ScheduleSubmission = {
    id: createId(),
    studentUid: profile.uid,
    studentName: profile.name,
    courseCodes: [...profile.plannedCourses],
    totalCredits: sumCredits(profile.plannedCourses),
    note: note.trim(),
    status: 'pending',
    feedback: '',
    createdAt: now(),
  };
  update(db => ({
    ...db,
    // A returned plan is superseded by the new submission.
    submissions: [
      ...db.submissions.map(s =>
        s.studentUid === profile.uid && s.status === 'returned' && !s.archived ? { ...s, archived: true } : s,
      ),
      submission,
    ],
  }));
  return submission;
}

export function withdrawSubmission(id: string): void {
  update(db => ({
    ...db,
    submissions: db.submissions.map(s => (s.id === id && s.status === 'pending' ? { ...s, status: 'withdrawn' } : s)),
  }));
}

export function reviewSubmission(id: string, decision: 'approved' | 'returned', feedback: string): void {
  update(db => ({
    ...db,
    submissions: db.submissions.map(s =>
      s.id === id && s.status === 'pending' ? { ...s, status: decision, feedback: feedback.trim(), reviewedAt: now() } : s,
    ),
  }));
}

/** Marks an approved term as finished: its courses become completed and the draft plan is cleared. */
export function completeApprovedTerm(studentUid: string): void {
  update(db => {
    const approved = activeSubmissionFor(db, studentUid);
    const student = db.students[studentUid];
    if (!approved || approved.status !== 'approved' || !student) return db;
    const completedCourses = Array.from(new Set([...student.completedCourses, ...approved.courseCodes]));
    return {
      ...db,
      students: { ...db.students, [studentUid]: { ...student, completedCourses, plannedCourses: [], updatedAt: now() } },
      submissions: db.submissions.map(s => (s.id === approved.id ? { ...s, archived: true } : s)),
    };
  });
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export function requestMeeting(profile: StudentProfile, startsAt: Date, notes: string): MeetingRequest {
  const db = readDb();
  const iso = startsAt.toISOString();
  if (db.meetings.some(m => m.startsAt === iso && (m.status === 'pending' || m.status === 'accepted'))) {
    throw new Error('That time slot was just taken. Please choose another.');
  }
  if (db.meetings.filter(m => m.studentUid === profile.uid && m.status === 'pending').length >= 3) {
    throw new Error('You already have 3 pending requests. Wait for a response or cancel one first.');
  }
  const meeting: MeetingRequest = {
    id: createId(),
    studentUid: profile.uid,
    studentName: profile.name,
    startsAt: iso,
    durationMinutes: MEETING_DURATION_MINUTES,
    notes: notes.trim(),
    status: 'pending',
    response: '',
    createdAt: now(),
  };
  update(current => ({ ...current, meetings: [...current.meetings, meeting] }));
  return meeting;
}

export function setMeetingStatus(id: string, status: Exclude<MeetingStatus, 'pending'>, response = ''): void {
  update(db => ({
    ...db,
    meetings: db.meetings.map(m => (m.id === id ? { ...m, status, response: response.trim(), respondedAt: now() } : m)),
  }));
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

function buildDemoDb(): Db {
  const students: Record<string, StudentProfile> = {};
  for (const account of DEMO_ACCOUNTS) {
    if (account.role !== 'student') continue;
    students[account.uid] = newProfile(account, account.year ?? 1);
  }

  const s1 = students['demo-student-1'];
  const s2 = students['demo-student-2'];
  const s3 = students['demo-student-3'];
  s1.supervisorNotes = 'First-year student - needs to select initial courses for the first term.';

  const s3Plan = recommendPlan({ completedCourses: s3.completedCourses, year: s3.year }).courseCodes;
  s3.plannedCourses = s3Plan;

  const [firstSlot, secondSlot] = upcomingSlots(new Date(), 14);
  const tomorrowMorning = setMinutes(setHours(addDays(startOfDay(new Date()), 1), 10), 0);
  const created = now();

  return {
    students,
    submissions: [
      {
        id: createId(),
        studentUid: s3.uid,
        studentName: s3.name,
        courseCodes: s3Plan,
        totalCredits: sumCredits(s3Plan),
        note: 'I followed the recommended plan - happy to adjust if needed.',
        status: 'pending',
        feedback: '',
        createdAt: created,
      },
    ],
    meetings: [
      {
        id: createId(),
        studentUid: s1.uid,
        studentName: s1.name,
        startsAt: (secondSlot ?? tomorrowMorning).toISOString(),
        durationMinutes: MEETING_DURATION_MINUTES,
        notes: "I'd like to discuss my first term schedule.",
        status: 'pending',
        response: '',
        createdAt: created,
      },
      {
        id: createId(),
        studentUid: s2.uid,
        studentName: s2.name,
        startsAt: (firstSlot ?? tomorrowMorning).toISOString(),
        durationMinutes: MEETING_DURATION_MINUTES,
        notes: 'Planning my Year 2 Spring courses.',
        status: 'accepted',
        response: 'See you then.',
        createdAt: created,
        respondedAt: created,
      },
    ],
  };
}

/** Seeds demo data on first use (demo mode only). */
export function ensureDemoData(): void {
  LEGACY_KEYS.forEach(removeKey);
  if (readRaw(DB_KEY) === null) update(() => buildDemoDb());
}

/** Replaces all local data with a fresh copy of the demo data set. */
export function resetDemoData(): void {
  update(() => buildDemoDb());
}
