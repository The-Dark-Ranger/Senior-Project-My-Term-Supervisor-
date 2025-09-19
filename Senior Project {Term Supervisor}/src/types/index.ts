

import type { OptimizeTermScheduleInput } from '@/ai/flows/optimize-term-schedule';

export type CourseDifficulty = 'Easy' | 'Medium' | 'Hard';


export interface Course {
  id: string; 
  catalogCourseId?: string; 
  name: string;
  description: string;
  difficulty: CourseDifficulty;
  expectedWorkload: number; 
  prerequisites: string[]; 
  credits: number;
  instructor: string;
  sectionDetails: string; 
  courseCode: string;
}

export type AICourseInput = Omit<Course, 'id' | 'catalogCourseId' | 'difficulty'> & { difficulty?: CourseDifficulty };


export interface CourseFormData {
  name: string;
  description: string;
  difficulty: CourseDifficulty;
  expectedWorkload: number;
  prerequisites: string; 
  credits: number;
  instructor: string;
  sectionDetails: string;
}

export interface MeetingRequest {
  id: string;
  studentName: string; 
  studentUid?: string; 
  slot: string;
  notes: string;
  timestamp: string; 
  status: 'pending' | 'addressed' | 'cancelled' | 'accepted'; 
}

// User information stored after login
export interface LoggedInUser {
  type: 'student' | 'supervisor';
  name: string;
  uid: string; // Firebase User ID
  email: string | null; // Firebase User Email
}

export interface RecommendedPlan {
  courses: Course[];
  reasoning: string;
}

// Types for Supervisor Dashboard Mock Data (can be expanded)
export interface MockStudentCourseDisplay {
  id: string;
  name: string;
  credits: number;
  instructor?: string;
  sectionDetails?: string;
  catalogCourseId?: string;
  grade?: string; // For taken courses
  courseCode: string;
  description: string;
  expectedWorkload: number;
  prerequisites: string[];
}

export interface MockStudentAcademicProgress {
  takenCourses: MockStudentCourseDisplay[];
  remainingCourses: MockStudentCourseDisplay[];
}

export interface MockStudent {
  id: string; // Corresponds to student's UID from Firebase Auth
  name: string;
  program: string;
  avatarUrl?: string;
  dataAihint?: string;
  status: 'Active' | 'Pending Approval' | 'Graduated';
  year: number;
  currentPlan: Course[]; // Changed to full Course type
  recommendedPlan: RecommendedPlan;
  academicProgress?: MockStudentAcademicProgress; 
  supervisorNotes?: string; 
  lastActivity: string; 
  studentMeetingNotes?: string; 
}

export interface StudentScheduleSubmission {
  id: string;
  studentUid: string;
  studentName: string;
  submittedCourses: Course[];
  timestamp: string; // ISO string
  status: 'pending' | 'reviewed' | 'accepted' | 'dismissed';
}

    

    

    