'use client';

import { useMemo, useState, useTransition } from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react';
import RequireRole from '@/components/auth/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import DegreeProgress from '@/components/course/degree-progress';
import { EditProgressDialog, MeetingRequestDialog } from '@/components/dashboard/student-dialogs';
import {
  EmptyState,
  MessageDialog,
  PageHeader,
  ProgressBar,
  RecommendationView,
  StatCard,
} from '@/components/dashboard/shared';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getAiRecommendation } from '@/app/actions/recommend';
import { supervisorDisplayName } from '@/lib/config';
import { MAX_TERM_CREDITS } from '@/data/program-plan';
import {
  getAvailableCourses,
  getCourse,
  getProgress,
  hasBlockingIssues,
  missingPrerequisites,
  recommendPlan,
  sumCredits,
  validatePlan,
} from '@/lib/planning';
import {
  activeSubmissionFor,
  completeApprovedTerm,
  setMeetingStatus,
  submitPlan,
  updateStudent,
  useDb,
  withdrawSubmission,
  type Db,
} from '@/lib/store';
import type { AppUser, MeetingStatus, PlanRecommendation, StudentProfile } from '@/types';

export default function StudentDashboard({ aiEnabled }: { aiEnabled: boolean }) {
  return <RequireRole role="student">{user => <StudentDashboardContent user={user} aiEnabled={aiEnabled} />}</RequireRole>;
}

function StudentDashboardContent({ user, aiEnabled }: { user: AppUser; aiEnabled: boolean }) {
  const db = useDb();
  const profile = db.students[user.uid];
  if (!profile) return null; // Created by the auth provider on first login.
  return <Dashboard profile={profile} db={db} aiEnabled={aiEnabled} />;
}

const MEETING_BADGE: Record<MeetingStatus, { label: string; variant: 'info' | 'success' | 'destructive' | 'secondary' }> = {
  pending: { label: 'Pending', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

function Dashboard({ profile, db, aiEnabled }: { profile: StudentProfile; db: Db; aiEnabled: boolean }) {
  const { toast } = useToast();
  const { getIdToken } = useAuth();
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [aiResult, setAiResult] = useState<{ key: string; recommendation: PlanRecommendation } | null>(null);
  const [aiPending, startAi] = useTransition();

  const submission = activeSubmissionFor(db, profile.uid);
  const isLocked = submission?.status === 'pending' || submission?.status === 'approved';
  const plannedCodes = isLocked ? submission.courseCodes : profile.plannedCourses;

  const progress = getProgress(profile.completedCourses);
  const issues = useMemo(
    () => validatePlan(profile.plannedCourses, profile.completedCourses),
    [profile.plannedCourses, profile.completedCourses],
  );
  const plannedCredits = sumCredits(plannedCodes);

  const progressKey = `${profile.year}|${profile.completedCourses.join(',')}`;
  const plannerRecommendation = useMemo(
    () => recommendPlan({ completedCourses: profile.completedCourses, year: profile.year }),
    [profile.completedCourses, profile.year],
  );
  // A Gemini result is only valid for the progress it was generated from.
  const recommendation = aiResult?.key === progressKey ? aiResult.recommendation : plannerRecommendation;
  const recommendedSet = useMemo(() => new Set(recommendation.courseCodes), [recommendation]);

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    const plannedSet = new Set(profile.plannedCourses);
    return getAvailableCourses(profile.completedCourses).filter(
      c =>
        !plannedSet.has(c.courseCode) &&
        (!onlyRecommended || recommendedSet.has(c.courseCode)) &&
        (!term ||
          c.courseCode.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.department?.toLowerCase().includes(term)),
    );
  }, [profile.completedCourses, profile.plannedCourses, search, onlyRecommended, recommendedSet]);

  const myMeetings = db.meetings
    .filter(m => m.studentUid === profile.uid)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const pendingMeetings = myMeetings.filter(m => m.status === 'pending').length;
  const lastNote = myMeetings.find(m => m.notes)?.notes;

  const setPlan = (codes: string[]) => updateStudent(profile.uid, { plannedCourses: codes });

  const addCourse = (code: string) => {
    if (isLocked || profile.plannedCourses.includes(code)) return;
    setPlan([...profile.plannedCourses, code]);
    const credits = sumCredits([...profile.plannedCourses, code]);
    toast({
      title: `${code} added`,
      description: credits > MAX_TERM_CREDITS ? `Your plan is now ${credits} credits - over the ${MAX_TERM_CREDITS}-credit limit.` : `${credits} credits planned.`,
      variant: credits > MAX_TERM_CREDITS ? 'destructive' : 'default',
    });
  };

  const removeCourse = (code: string) => setPlan(profile.plannedCourses.filter(c => c !== code));

  const applyRecommendation = () => {
    setPlan(recommendation.courseCodes);
    toast({ title: 'Recommended plan applied', description: `${recommendation.courseCodes.length} courses added to your term plan.` });
  };

  const askGemini = () =>
    startAi(async () => {
      const result = await getAiRecommendation(
        { completedCourses: profile.completedCourses, year: profile.year },
        await getIdToken(),
      );
      if (result.ok) {
        setAiResult({ key: progressKey, recommendation: result.recommendation });
        toast({ title: 'Gemini recommendation ready' });
      } else {
        toast({ title: 'AI unavailable', description: result.error, variant: 'destructive' });
      }
    });

  const handleSubmit = (note: string) => {
    try {
      submitPlan(profile, note);
      toast({ title: 'Plan submitted', description: `Sent to ${supervisorDisplayName} for review.` });
    } catch (error) {
      toast({ title: 'Could not submit', description: (error as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title={`Welcome, ${profile.name.split(' ')[0]}`}
        description={
          <>
            Year {profile.year} · {profile.program} · Supervisor:{' '}
            <span className="font-medium text-foreground">{supervisorDisplayName}</span>
          </>
        }
        actions={
          <Button onClick={() => setMeetingOpen(true)} className="w-full sm:w-auto">
            <CalendarPlus /> Request meeting
          </Button>
        }
      />

      <SubmissionBanner submission={submission} studentUid={profile.uid} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Degree progress" value={`${progress.percent}%`} hint={`${progress.completedCount}/${progress.totalCount} courses`} />
        <StatCard icon={CheckCircle2} tone="success" label="Credits completed" value={progress.completedCredits} hint={`of ${progress.totalCredits}`} />
        <StatCard
          icon={BookOpen}
          tone={plannedCredits > MAX_TERM_CREDITS ? 'warning' : 'info'}
          label="Planned this term"
          value={`${plannedCredits} cr`}
          hint={`${plannedCodes.length} courses`}
        />
        <StatCard icon={CalendarClock} tone="warning" label="Pending meetings" value={pendingMeetings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Current term plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="size-5 text-primary" /> Term plan
              </CardTitle>
              <CardDescription>
                {isLocked
                  ? submission?.status === 'approved'
                    ? 'Approved by your supervisor.'
                    : 'Submitted - editing is locked while your supervisor reviews it.'
                  : 'Courses you plan to take next term. Prerequisites are checked automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plannedCodes.length === 0 ? (
                <EmptyState>Your plan is empty. Add courses below or apply the recommended plan.</EmptyState>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {plannedCodes.map(code => {
                    const course = getCourse(code);
                    const missing = missingPrerequisites(code, new Set(profile.completedCourses));
                    return (
                      <li key={code} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {code} <span className="font-normal text-muted-foreground">· {course?.credits ?? 0} cr</span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{course?.name}</p>
                          {missing.length > 0 && (
                            <p className="mt-0.5 text-xs text-destructive">Requires {missing.join(', ')}</p>
                          )}
                        </div>
                        {!isLocked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeCourse(code)}
                            aria-label={`Remove ${code}`}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {!isLocked && issues.length > 0 && (
                <ul className="space-y-1.5" aria-label="Plan issues">
                  {issues.map((issue, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-sm ${issue.severity === 'error' ? 'text-destructive' : 'text-warning'}`}
                    >
                      {issue.severity === 'error' ? (
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      )}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            {!isLocked && (
              <CardFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between sm:pt-4">
                <Button variant="ghost" onClick={() => setPlan([])} disabled={profile.plannedCourses.length === 0} className="w-full sm:w-auto">
                  Clear plan
                </Button>
                <Button
                  onClick={() => setSubmitOpen(true)}
                  disabled={profile.plannedCourses.length === 0 || hasBlockingIssues(issues)}
                  className="w-full sm:w-auto"
                >
                  <Send /> Submit to supervisor
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Available courses */}
          {!isLocked && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" /> Open to you this term
                </CardTitle>
                <CardDescription>Courses whose prerequisites you have completed.</CardDescription>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by code, name or department"
                      className="pl-9"
                      aria-label="Search available courses"
                    />
                  </div>
                  <Button
                    variant={onlyRecommended ? 'default' : 'outline'}
                    onClick={() => setOnlyRecommended(v => !v)}
                    aria-pressed={onlyRecommended}
                  >
                    <Sparkles /> Recommended only
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {available.length === 0 ? (
                  <EmptyState>No matching courses. Try a different search.</EmptyState>
                ) : (
                  <ul className="max-h-112 divide-y overflow-y-auto rounded-lg border">
                    {available.map(course => (
                      <li key={course.courseCode} className="flex items-start gap-3 px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            {course.courseCode}: {course.name}
                            {recommendedSet.has(course.courseCode) && (
                              <Badge variant="info">
                                <Sparkles /> Recommended
                              </Badge>
                            )}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {course.credits} credits · {course.department}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => addCourse(course.courseCode)}>
                          <Plus /> Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5 text-primary" /> Recommended plan
              </CardTitle>
              <CardDescription>Based on your progress, prerequisites and the study plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecommendationView recommendation={recommendation} />
            </CardContent>
            <CardFooter className="flex-col gap-2 sm:flex-row">
              {!isLocked && recommendation.courseCodes.length > 0 && (
                <Button onClick={applyRecommendation} className="w-full sm:flex-1">
                  Use this plan
                </Button>
              )}
              {aiEnabled && (
                <Button variant="outline" onClick={askGemini} disabled={aiPending} className="w-full sm:flex-1">
                  {aiPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Ask Gemini
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Meetings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-5 text-primary" /> My meetings
              </CardTitle>
              <CardDescription>Requests you have sent to your supervisor.</CardDescription>
            </CardHeader>
            <CardContent>
              {myMeetings.length === 0 ? (
                <EmptyState>No meetings yet.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {myMeetings.slice(0, 6).map(m => (
                    <li key={m.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{format(parseISO(m.startsAt), 'EEE, MMM d · h:mm a')}</p>
                        <Badge variant={MEETING_BADGE[m.status].variant}>{MEETING_BADGE[m.status].label}</Badge>
                      </div>
                      {m.notes && <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>}
                      {m.response && (
                        <p className="mt-2 rounded-md bg-muted p-2 text-xs">
                          <span className="font-medium">Supervisor:</span> {m.response}
                        </p>
                      )}
                      {m.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 -ml-2 h-8 text-destructive hover:text-destructive"
                          onClick={() => setMeetingStatus(m.id, 'cancelled')}
                        >
                          Cancel request
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Degree progress */}
      <Card>
        <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" /> Academic progress
            </CardTitle>
            <CardDescription>
              {progress.completedCredits} of {progress.totalCredits} credits completed
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setProgressOpen(true)} disabled={isLocked} className="self-start">
            <Pencil /> Update completed courses
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar value={progress.percent} label="Degree progress" />
          <DegreeProgress
            completed={profile.completedCourses}
            planned={plannedCodes}
            renderActions={code => {
              if (isLocked || profile.plannedCourses.includes(code) || profile.completedCourses.includes(code)) return null;
              if (missingPrerequisites(code, new Set(profile.completedCourses)).length > 0) return null;
              return (
                <Button size="sm" onClick={() => addCourse(code)}>
                  <Plus /> Add to term plan
                </Button>
              );
            }}
          />
        </CardContent>
      </Card>

      <MeetingRequestDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        profile={profile}
        db={db}
        supervisorName={supervisorDisplayName}
      />
      {progressOpen && <EditProgressDialog open onOpenChange={setProgressOpen} profile={profile} />}
      <MessageDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit plan for approval"
        description={`${profile.plannedCourses.length} courses · ${sumCredits(profile.plannedCourses)} credits will be sent to ${supervisorDisplayName}.`}
        label="Message to your supervisor"
        placeholder={lastNote ? `e.g. ${lastNote}` : 'Anything your supervisor should know about this plan?'}
        confirmLabel="Submit plan"
        onConfirm={handleSubmit}
      >
        <div className="flex flex-wrap gap-1.5">
          {profile.plannedCourses.map(code => (
            <Badge key={code} variant="secondary">
              {code}
            </Badge>
          ))}
        </div>
      </MessageDialog>
    </div>
  );
}

function SubmissionBanner({ submission, studentUid }: { submission: ReturnType<typeof activeSubmissionFor>; studentUid: string }) {
  const { toast } = useToast();
  if (!submission) return null;
  const submittedOn = format(parseISO(submission.createdAt), 'MMM d, yyyy');

  if (submission.status === 'pending') {
    return (
      <Alert variant="info">
        <Clock className="size-4" />
        <AlertTitle>Awaiting supervisor review</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Submitted on {submittedOn} · {submission.courseCodes.length} courses, {submission.totalCredits} credits.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              withdrawSubmission(submission.id);
              toast({ title: 'Submission withdrawn', description: 'You can edit your plan again.' });
            }}
          >
            <Undo2 /> Withdraw
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (submission.status === 'approved') {
    return (
      <Alert variant="success">
        <CheckCircle2 className="size-4" />
        <AlertTitle>Plan approved</AlertTitle>
        <AlertDescription className="space-y-2">
          {submission.feedback && <p>&ldquo;{submission.feedback}&rdquo;</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Register for these courses in the university system. When the term ends, mark it as completed.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                completeApprovedTerm(studentUid);
                toast({ title: 'Term completed', description: 'Your courses moved to completed. Time to plan the next term!' });
              }}
            >
              Mark term completed
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertTitle>Plan returned for changes</AlertTitle>
      <AlertDescription>
        {submission.feedback ? <>Supervisor feedback: &ldquo;{submission.feedback}&rdquo;</> : 'Please review your plan and resubmit.'}
      </AlertDescription>
    </Alert>
  );
}
