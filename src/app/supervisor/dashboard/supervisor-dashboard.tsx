'use client';

import { useMemo, useState, useTransition } from 'react';
import { format, isAfter, isSameDay, parseISO, startOfToday } from 'date-fns';
import {
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Handshake,
  Inbox,
  Loader2,
  MessageSquare,
  RotateCcw,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  XCircle,
} from 'lucide-react';
import RequireRole from '@/components/auth/require-role';
import { useAuth } from '@/components/providers/auth-provider';
import DegreeProgress from '@/components/course/degree-progress';
import {
  EmptyState,
  MessageDialog,
  PageHeader,
  ProgressBar,
  RecommendationView,
  StatCard,
} from '@/components/dashboard/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAiRecommendation } from '@/app/actions/recommend';
import { MAX_TERM_CREDITS } from '@/data/program-plan';
import { generateInsights, getCourse, getProgress, recommendPlan, validatePlan } from '@/lib/planning';
import {
  activeSubmissionFor,
  reviewSubmission,
  setMeetingStatus,
  updateStudent,
  useDb,
  type Db,
} from '@/lib/store';
import { cn, initials } from '@/lib/utils';
import type { AppUser, MeetingRequest, PlanRecommendation, ScheduleSubmission, StudentProfile } from '@/types';

export default function SupervisorDashboard({ aiEnabled }: { aiEnabled: boolean }) {
  return <RequireRole role="supervisor">{user => <Dashboard user={user} aiEnabled={aiEnabled} />}</RequireRole>;
}

type ReviewTarget =
  | { kind: 'return'; submission: ScheduleSubmission }
  | { kind: 'approve'; submission: ScheduleSubmission }
  | { kind: 'decline'; meeting: MeetingRequest };

function Dashboard({ user, aiEnabled }: { user: AppUser; aiEnabled: boolean }) {
  const db = useDb();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [day, setDay] = useState<Date | undefined>(() => startOfToday());
  const [review, setReview] = useState<ReviewTarget | null>(null);

  const students = useMemo(() => Object.values(db.students).sort((a, b) => a.name.localeCompare(b.name)), [db.students]);
  const pendingSubmissions = db.submissions
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const pendingMeetings = db.meetings
    .filter(m => m.status === 'pending')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const acceptedMeetings = db.meetings.filter(m => m.status === 'accepted');
  const upcomingMeetings = acceptedMeetings.filter(m => isAfter(parseISO(m.startsAt), new Date()));
  const meetingsOnDay = day
    ? db.meetings
        .filter(m => (m.status === 'accepted' || m.status === 'pending') && isSameDay(parseISO(m.startsAt), day))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    : [];

  const filteredStudents = students.filter(s => {
    const q = search.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.program.toLowerCase().includes(q);
  });
  const selected =
    students.find(s => s.uid === selectedUid) ??
    students.find(s => pendingSubmissions.some(p => p.studentUid === s.uid)) ??
    students[0];

  const selectStudent = (uid: string) => {
    setSelectedUid(uid);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('student-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const confirmReview = (message: string) => {
    if (!review) return;
    if (review.kind === 'decline') {
      setMeetingStatus(review.meeting.id, 'declined', message);
      toast({ title: 'Meeting declined', description: `${review.meeting.studentName} has been notified.` });
    } else {
      const decision = review.kind === 'approve' ? 'approved' : 'returned';
      reviewSubmission(review.submission.id, decision, message);
      toast({
        title: decision === 'approved' ? 'Plan approved' : 'Plan returned',
        description: `${review.submission.studentName} can see your decision on their dashboard.`,
      });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader title="Supervisor dashboard" description={`Signed in as ${user.name}. Review plans, meetings and student progress.`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Students" value={students.length} />
        <StatCard icon={ClipboardList} tone="info" label="Plans to review" value={pendingSubmissions.length} />
        <StatCard icon={Handshake} tone="warning" label="Meeting requests" value={pendingMeetings.length} />
        <StatCard icon={CalendarDays} tone="success" label="Upcoming meetings" value={upcomingMeetings.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Student list (desktop) / picker (mobile) */}
        <aside className="lg:col-span-4">
          <div className="lg:hidden">
            <Label htmlFor="student-picker" className="mb-2 block">
              Student
            </Label>
            <Select value={selected?.uid ?? ''} onValueChange={selectStudent}>
              <SelectTrigger id="student-picker">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.uid} value={s.uid}>
                    {s.name} · Year {s.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="hidden lg:sticky lg:top-24 lg:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" /> My students
              </CardTitle>
              <div className="relative pt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students" className="pl-9" aria-label="Search students" />
              </div>
            </CardHeader>
            <CardContent className="max-h-[calc(100dvh-20rem)] space-y-1 overflow-y-auto">
              {filteredStudents.length === 0 && <EmptyState>No students found.</EmptyState>}
              {filteredStudents.map(s => {
                const pending = pendingSubmissions.some(p => p.studentUid === s.uid);
                const meetings = pendingMeetings.filter(m => m.studentUid === s.uid).length;
                const isSelected = selected?.uid === s.uid;
                return (
                  <button
                    key={s.uid}
                    type="button"
                    onClick={() => selectStudent(s.uid)}
                    aria-current={isSelected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                      isSelected ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted',
                    )}
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">{initials(s.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate font-medium', isSelected && 'text-primary')}>{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Year {s.year} · {getProgress(s.completedCourses).percent}% complete
                      </p>
                      {(pending || meetings > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pending && <Badge variant="info">Plan to review</Badge>}
                          {meetings > 0 && <Badge variant="warning">{meetings} meeting{meetings > 1 ? 's' : ''}</Badge>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 space-y-6 lg:col-span-8">
          {/* Plans awaiting review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="size-5 text-primary" /> Plans awaiting review
                {pendingSubmissions.length > 0 && <Badge variant="info">{pendingSubmissions.length}</Badge>}
              </CardTitle>
              <CardDescription>Approve a plan or return it to the student with feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingSubmissions.length === 0 && <EmptyState>No plans waiting for review.</EmptyState>}
              {pendingSubmissions.map(sub => (
                <SubmissionCard
                  key={sub.id}
                  submission={sub}
                  student={db.students[sub.studentUid]}
                  onSelectStudent={() => selectStudent(sub.studentUid)}
                  onApprove={() => setReview({ kind: 'approve', submission: sub })}
                  onReturn={() => setReview({ kind: 'return', submission: sub })}
                />
              ))}
            </CardContent>
          </Card>

          {/* Meeting requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="size-5 text-primary" /> Meeting requests
                {pendingMeetings.length > 0 && <Badge variant="warning">{pendingMeetings.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingMeetings.length === 0 && <EmptyState>No pending meeting requests.</EmptyState>}
              {pendingMeetings.map(m => (
                <div key={m.id} className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <button type="button" className="font-medium hover:underline" onClick={() => selectStudent(m.studentUid)}>
                        {m.studentName}
                      </button>
                      <p className="text-sm text-primary">{format(parseISO(m.startsAt), "EEEE, MMM d 'at' h:mm a")}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Requested {format(parseISO(m.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                  {m.notes && <p className="mt-2 rounded-md bg-muted p-2.5 text-sm whitespace-pre-wrap">{m.notes}</p>}
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => setReview({ kind: 'decline', meeting: m })}>
                      <XCircle /> Decline
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setMeetingStatus(m.id, 'accepted');
                        setDay(parseISO(m.startsAt));
                        toast({ title: 'Meeting accepted', description: `Added to your calendar for ${format(parseISO(m.startsAt), 'MMM d, h:mm a')}.` });
                      }}
                    >
                      <CheckCircle2 /> Accept
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" /> Calendar
              </CardTitle>
              <CardDescription>Highlighted days have accepted meetings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[auto_1fr]">
              <Calendar
                mode="single"
                selected={day}
                onSelect={setDay}
                className="mx-auto rounded-lg border md:mx-0"
                modifiers={{ meeting: acceptedMeetings.map(m => parseISO(m.startsAt)) }}
                modifiersClassNames={{ meeting: 'font-bold text-success underline underline-offset-4' }}
              />
              <div>
                <h3 className="mb-3 font-medium">{day ? format(day, 'EEEE, MMMM d') : 'Select a day'}</h3>
                {meetingsOnDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No meetings on this day.</p>
                ) : (
                  <ul className="space-y-2">
                    {meetingsOnDay.map(m => (
                      <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                        <span>
                          <span className="font-medium">{format(parseISO(m.startsAt), 'h:mm a')}</span> · {m.studentName}
                        </span>
                        <Badge variant={m.status === 'accepted' ? 'success' : 'warning'}>
                          {m.status === 'accepted' ? 'Confirmed' : 'Requested'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected student */}
          <div id="student-detail" className="scroll-mt-20">
            {selected ? (
              <StudentDetail key={selected.uid} student={selected} db={db} aiEnabled={aiEnabled} />
            ) : (
              <EmptyState>No students yet. Students appear here after they sign in.</EmptyState>
            )}
          </div>
        </div>
      </div>

      <MessageDialog
        open={review !== null}
        onOpenChange={open => !open && setReview(null)}
        title={
          review?.kind === 'approve'
            ? `Approve ${review.submission.studentName}'s plan`
            : review?.kind === 'return'
              ? `Return ${review.submission.studentName}'s plan`
              : `Decline meeting with ${review?.meeting.studentName ?? ''}`
        }
        description={
          review?.kind === 'return'
            ? 'Explain what should change. The student can edit and resubmit.'
            : review?.kind === 'decline'
              ? 'Optionally suggest another time.'
              : 'The plan becomes the student\'s approved schedule for the term.'
        }
        label={review?.kind === 'decline' ? 'Message to the student' : 'Feedback'}
        required={review?.kind === 'return'}
        destructive={review?.kind !== 'approve'}
        confirmLabel={review?.kind === 'approve' ? 'Approve plan' : review?.kind === 'return' ? 'Return plan' : 'Decline meeting'}
        onConfirm={confirmReview}
      />
    </div>
  );
}

function SubmissionCard({
  submission,
  student,
  onSelectStudent,
  onApprove,
  onReturn,
}: {
  submission: ScheduleSubmission;
  student?: StudentProfile;
  onSelectStudent: () => void;
  onApprove: () => void;
  onReturn: () => void;
}) {
  // Re-validate against the student's current record - progress may have changed since submission.
  const issues = student ? validatePlan(submission.courseCodes, student.completedCourses) : [];
  const errors = issues.filter(i => i.severity === 'error');

  return (
    <div className="rounded-lg border p-3 sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" className="font-medium hover:underline" onClick={onSelectStudent}>
            {submission.studentName}
          </button>
          <p className="text-xs text-muted-foreground">
            Submitted {format(parseISO(submission.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <Badge variant={submission.totalCredits > MAX_TERM_CREDITS ? 'warning' : 'secondary'} className="self-start">
          <Clock /> {submission.courseCodes.length} courses · {submission.totalCredits} cr
        </Badge>
      </div>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {submission.courseCodes.map(code => (
          <li key={code} className="rounded-md bg-muted/60 px-2.5 py-1.5 text-sm">
            <span className="font-medium">{code}</span>{' '}
            <span className="text-muted-foreground">· {getCourse(code)?.name ?? 'Unknown course'}</span>
          </li>
        ))}
      </ul>

      {submission.note && (
        <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
          <MessageSquare className="mt-0.5 size-4 shrink-0" /> {submission.note}
        </p>
      )}

      {issues.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className={cn('text-sm', issue.severity === 'error' ? 'text-destructive' : 'text-warning')}>
              • {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4" /> All prerequisites and credit limits check out.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="sm" onClick={onReturn}>
          <RotateCcw /> Return with feedback
        </Button>
        <Button variant="success" size="sm" onClick={onApprove} disabled={errors.length > 0} title={errors.length ? 'Fix blocking issues first' : undefined}>
          <CheckCircle2 /> Approve
        </Button>
      </div>
    </div>
  );
}

function StudentDetail({ student, db, aiEnabled }: { student: StudentProfile; db: Db; aiEnabled: boolean }) {
  const { toast } = useToast();
  const { getIdToken } = useAuth();
  const [notes, setNotes] = useState(student.supervisorNotes);
  const [aiRec, setAiRec] = useState<PlanRecommendation | null>(null);
  const [aiPending, startAi] = useTransition();

  const progress = getProgress(student.completedCourses);
  const submission = activeSubmissionFor(db, student.uid);
  const currentPlan = submission && submission.status !== 'returned' ? submission.courseCodes : student.plannedCourses;
  const planner = useMemo(
    () => recommendPlan({ completedCourses: student.completedCourses, year: student.year }),
    [student.completedCourses, student.year],
  );
  const insights = generateInsights(student, currentPlan);
  const aiInsights = (aiRec?.insights ?? []).filter(i => !student.dismissedInsights.includes(i));
  const lastMeetingNote = db.meetings
    .filter(m => m.studentUid === student.uid && m.notes)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.notes;
  const notesChanged = notes !== student.supervisorNotes;

  const addInsightToNotes = (insight: string) => {
    setNotes(prev => `${prev}${prev.trim() ? '\n' : ''}• ${insight}`);
    toast({ title: 'Insight added to notes', description: 'Remember to save your notes.' });
  };
  const dismissInsight = (insight: string) =>
    updateStudent(student.uid, { dismissedInsights: [...student.dismissedInsights, insight] });

  const saveNotes = () => {
    updateStudent(student.uid, { supervisorNotes: notes.trim() });
    toast({ title: 'Notes saved', description: `Notes for ${student.name} were updated.` });
  };

  const askGemini = () =>
    startAi(async () => {
      const result = await getAiRecommendation(
        { completedCourses: student.completedCourses, year: student.year },
        await getIdToken(),
      );
      if (result.ok) setAiRec(result.recommendation);
      else toast({ title: 'AI unavailable', description: result.error, variant: 'destructive' });
    });

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initials(student.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <CardTitle className="text-xl">{student.name}</CardTitle>
            <CardDescription className="truncate">
              {student.program} · Year {student.year} · {student.email}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <ProgressBar value={progress.percent} label={`${student.name} degree progress`} />
            <span className="shrink-0 text-sm text-muted-foreground">
              {progress.completedCredits}/{progress.totalCredits} cr
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="notes">
          <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4 space-y-5">
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="size-4 text-primary" /> Insights
              </h3>
              {insights.length === 0 && aiInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">No new insights.</p>
              ) : (
                <ul className="space-y-2">
                  {[...aiInsights.map(text => ({ text, ai: true })), ...insights.map(text => ({ text, ai: false }))].map(({ text, ai }) => (
                    <li key={text} className="rounded-lg border bg-muted/40 p-3">
                      <p className="text-sm">
                        {ai && (
                          <Badge variant="info" className="mr-1.5 align-middle">
                            Gemini
                          </Badge>
                        )}
                        {text}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => addInsightToNotes(text)}>
                          <ThumbsUp /> Use
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => dismissInsight(text)}>
                          <ThumbsDown /> Dismiss
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <Label htmlFor="supervisor-notes" className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" /> Your notes (private)
              </Label>
              <Textarea
                id="supervisor-notes"
                rows={5}
                maxLength={4000}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={`Notes about ${student.name}…`}
              />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={saveNotes} disabled={!notesChanged}>
                  Save notes
                </Button>
                {notesChanged && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
              </div>
            </section>

            {lastMeetingNote && (
              <section className="rounded-lg border border-warning/30 bg-warning-soft p-3">
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4 text-warning" /> Student&apos;s last meeting note
                </h3>
                <p className="text-sm">{lastMeetingNote}</p>
              </section>
            )}
          </TabsContent>

          <TabsContent value="plan" className="mt-4 space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold">
                Current plan{' '}
                {submission && (
                  <Badge variant={submission.status === 'approved' ? 'success' : submission.status === 'pending' ? 'info' : 'warning'} className="ml-1 capitalize">
                    {submission.status}
                  </Badge>
                )}
              </h3>
              {currentPlan.length === 0 ? (
                <EmptyState>{student.name} has not planned any courses yet.</EmptyState>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {currentPlan.map(code => (
                    <li key={code} className="flex justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{code}</span> <span className="text-muted-foreground">· {getCourse(code)?.name}</span>
                      </span>
                      <span className="text-muted-foreground">{getCourse(code)?.credits} cr</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Recommended plan</h3>
                {aiEnabled && (
                  <Button size="sm" variant="outline" onClick={askGemini} disabled={aiPending}>
                    {aiPending ? <Loader2 className="animate-spin" /> : <Sparkles />} Ask Gemini
                  </Button>
                )}
              </div>
              <RecommendationView recommendation={aiRec ?? planner} />
            </section>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <DegreeProgress completed={student.completedCourses} planned={currentPlan} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Last updated {format(parseISO(student.updatedAt), 'MMM d, yyyy h:mm a')}
      </CardFooter>
    </Card>
  );
}
