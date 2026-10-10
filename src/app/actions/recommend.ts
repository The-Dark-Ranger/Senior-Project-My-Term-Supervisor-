'use server';

import { headers } from 'next/headers';
import { isAiConfigured } from '@/ai/config';
import { recommendTermPlan } from '@/ai/recommend-term-plan';
import { DEFAULT_TARGET_CREDITS, MAX_TERM_CREDITS, MIN_TERM_CREDITS, RECOMMENDED_TERM } from '@/data/program-plan';
import { firebaseConfig, isFirebaseConfigured } from '@/lib/config';
import {
  compareByPriority,
  getAvailableCourses,
  getOverdueCourses,
  getProgress,
  isKnownCourse,
  unlockCount,
} from '@/lib/planning';
import { verifyFirebaseIdToken } from '@/lib/server/firebase-token';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';
import type { PlanRecommendation } from '@/types';

export interface AiRecommendationRequest {
  completedCourses: string[];
  year: number;
  targetCredits?: number;
  goals?: string;
}

export type AiRecommendationResult = { ok: true; recommendation: PlanRecommendation } | { ok: false; error: string };

const MINUTE = 60_000;
const PER_CLIENT_PER_MINUTE = 5;
const GLOBAL_PER_MINUTE = 60;

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

const cleanText = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';

/**
 * Server action: Gemini-powered term recommendation.
 *
 * Security:
 * - In Firebase mode the caller must present a valid Firebase ID token.
 * - Requests are rate limited per user/IP and globally to protect the API quota.
 * - Inputs are sanitised; only catalog course codes are accepted.
 * - The model's answer is re-validated against prerequisites and the credit limit.
 */
export async function getAiRecommendation(
  request: AiRecommendationRequest,
  idToken?: string | null,
): Promise<AiRecommendationResult> {
  if (!isAiConfigured()) {
    return { ok: false, error: 'Gemini is not configured on this server. Using the built-in planner instead.' };
  }

  let clientKey = `ip:${clientIp(await headers())}`;
  if (isFirebaseConfigured) {
    const user = await verifyFirebaseIdToken(idToken, firebaseConfig.projectId);
    if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };
    clientKey = `uid:${user.uid}`;
  }

  const perClient = rateLimit(`ai:${clientKey}`, PER_CLIENT_PER_MINUTE, MINUTE);
  const global = rateLimit('ai:global', GLOBAL_PER_MINUTE, MINUTE);
  if (!perClient.ok || !global.ok) {
    const wait = Math.max(perClient.retryAfterSeconds, global.retryAfterSeconds);
    return { ok: false, error: `Too many AI requests. Please try again in ${wait} seconds.` };
  }

  const rawCodes = Array.isArray(request?.completedCourses) ? request.completedCourses.slice(0, 200) : [];
  const completed = Array.from(new Set(rawCodes.filter((c): c is string => typeof c === 'string' && isKnownCourse(c))));
  const year = clampInt(request?.year, 1, 4, 1);
  const targetCredits = clampInt(request?.targetCredits, MIN_TERM_CREDITS, MAX_TERM_CREDITS, DEFAULT_TARGET_CREDITS);
  const goals = cleanText(request?.goals, 500);

  const available = getAvailableCourses(completed);
  if (available.length === 0) {
    return { ok: false, error: 'There are no eligible courses to recommend right now.' };
  }
  const progress = getProgress(completed);

  try {
    const output = await recommendTermPlan({
      year,
      completedCredits: progress.completedCredits,
      totalCredits: progress.totalCredits,
      targetCredits,
      maxCredits: MAX_TERM_CREDITS,
      goals,
      overdueCourses: getOverdueCourses(completed, year),
      availableCourses: available.map(c => ({
        code: c.courseCode,
        name: c.name,
        credits: c.credits,
        description: c.description,
        recommendedTerm: RECOMMENDED_TERM.get(c.courseCode) ?? 0,
        unlocks: unlockCount(c.courseCode),
      })),
    });

    // Keep only eligible, unique courses and enforce the credit limit (highest priority first).
    const eligible = new Map(available.map(c => [c.courseCode, c]));
    const picked = Array.from(new Set(output.courseCodes.map(c => c.trim()))).filter(c => eligible.has(c));
    const chosen = new Set<string>();
    let credits = 0;
    for (const code of [...picked].sort(compareByPriority)) {
      const courseCredits = eligible.get(code)!.credits;
      if (credits + courseCredits <= MAX_TERM_CREDITS) {
        chosen.add(code);
        credits += courseCredits;
      }
    }
    if (chosen.size === 0) {
      return { ok: false, error: 'Gemini did not return a usable plan. Using the built-in planner instead.' };
    }

    return {
      ok: true,
      recommendation: {
        courseCodes: picked.filter(c => chosen.has(c)),
        reasoning: cleanText(output.reasoning, 1500) || 'Recommended by Gemini.',
        insights: output.insights.map(i => cleanText(i, 300)).filter(Boolean).slice(0, 5),
        source: 'gemini',
      },
    };
  } catch (error) {
    console.error('[ai] recommendTermPlan failed:', error instanceof Error ? error.message : error);
    return { ok: false, error: 'The AI service is unavailable right now. Using the built-in planner instead.' };
  }
}
