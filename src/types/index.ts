export type Role = 'student' | 'supervisor';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

/** Where a course sits for a given student. */
export type CourseStatus = 'completed' | 'planned' | 'available' | 'locked';

export interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  program: string;
  /** Current academic year (1-4). */
  year: number;
  completedCourses: string[];
  /** Draft plan for the upcoming term (course codes). */
  plannedCourses: string[];
  /** Private notes written by the supervisor. */
  supervisorNotes: string;
  dismissedInsights: string[];
  createdAt: string;
  updatedAt: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'returned' | 'withdrawn';

export interface ScheduleSubmission {
  id: string;
  studentUid: string;
  studentName: string;
  courseCodes: string[];
  totalCredits: number;
  /** Optional message from the student. */
  note: string;
  status: SubmissionStatus;
  /** Supervisor feedback, required when a plan is returned. */
  feedback: string;
  createdAt: string;
  reviewedAt?: string;
  /** Set once an approved plan's term is finished and its courses were moved to "completed". */
  archived?: boolean;
}

export type MeetingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface MeetingRequest {
  id: string;
  studentUid: string;
  studentName: string;
  /** ISO date-time of the requested slot. */
  startsAt: string;
  durationMinutes: number;
  notes: string;
  status: MeetingStatus;
  response: string;
  createdAt: string;
  respondedAt?: string;
}

export type ValidationSeverity = 'error' | 'warning';

export interface PlanIssue {
  severity: ValidationSeverity;
  message: string;
  courseCode?: string;
}

export interface PlanRecommendation {
  courseCodes: string[];
  reasoning: string;
  source: 'planner' | 'gemini';
  insights: string[];
}
