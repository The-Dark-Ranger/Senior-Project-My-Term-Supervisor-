'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PROGRAM_PLAN } from '@/data/program-plan';
import { MEETING_DURATION_MINUTES, upcomingSlots } from '@/data/meeting-availability';
import { requestMeeting, updateStudent, type Db } from '@/lib/store';
import type { StudentProfile } from '@/types';

export function MeetingRequestDialog({
  open,
  onOpenChange,
  profile,
  db,
  supervisorName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: StudentProfile;
  db: Db;
  supervisorName: string;
}) {
  const { toast } = useToast();
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Recomputed whenever the dialog opens so slots never lie in the past.
  const slots = useMemo(() => {
    if (!open) return [];
    const taken = new Set(db.meetings.filter(m => m.status === 'pending' || m.status === 'accepted').map(m => m.startsAt));
    return upcomingSlots(new Date(), 14, taken);
  }, [open, db.meetings]);

  const handleSubmit = () => {
    const chosen = slots.find(s => s.toISOString() === slot);
    if (!chosen) return;
    setBusy(true);
    try {
      requestMeeting(profile, chosen, notes);
      toast({ title: 'Meeting requested', description: `${format(chosen, 'EEEE, MMM d · h:mm a')} - you will see the response here.` });
      setSlot('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Could not request meeting', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-primary" /> Request a meeting
          </DialogTitle>
          <DialogDescription>
            Pick one of {supervisorName}&apos;s office-hour slots ({MEETING_DURATION_MINUTES} minutes).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-slot">Time slot</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger id="meeting-slot">
                <SelectValue placeholder={slots.length ? 'Select a time slot' : 'No free slots in the next two weeks'} />
              </SelectTrigger>
              <SelectContent>
                {slots.map(s => (
                  <SelectItem key={s.toISOString()} value={s.toISOString()}>
                    {format(s, 'EEE, MMM d · h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-notes">
              What would you like to discuss? <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="meeting-notes"
              rows={4}
              maxLength={500}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. my course load next term, choosing electives, balancing prerequisites…"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!slot || busy}>
            {busy && <Loader2 className="animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Lets a student correct their year and completed courses (e.g. after signing up). */
export function EditProgressDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: StudentProfile;
}) {
  const { toast } = useToast();
  const [year, setYear] = useState(String(profile.year));
  const [completed, setCompleted] = useState(() => new Set(profile.completedCourses));

  const toggle = (code: string, checked: boolean) =>
    setCompleted(prev => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });

  const handleSave = () => {
    const completedCourses = Array.from(completed);
    updateStudent(profile.uid, {
      year: Number(year),
      completedCourses,
      plannedCourses: profile.plannedCourses.filter(c => !completed.has(c)),
    });
    toast({ title: 'Progress updated', description: `${completedCourses.length} courses marked as completed.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update academic progress</DialogTitle>
          <DialogDescription>
            Mark the courses you have completed. Your supervisor can see these changes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="progress-year">Current academic year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger id="progress-year" className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map(y => (
                <SelectItem key={y} value={String(y)}>
                  Year {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROGRAM_PLAN.map(term => (
            <fieldset key={term.term} className="rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">{term.label}</legend>
              <div className="space-y-2">
                {term.courseCodes.map(code => (
                  <div key={code} className="flex items-center gap-2">
                    <Checkbox
                      id={`done-${code}`}
                      checked={completed.has(code)}
                      onCheckedChange={v => toggle(code, v === true)}
                    />
                    <Label htmlFor={`done-${code}`} className="text-sm font-normal">
                      {code}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save progress</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
