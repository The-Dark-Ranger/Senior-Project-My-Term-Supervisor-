'use client';

import { useState } from 'react';
import { Bot, Lightbulb, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCourse, sumCredits } from '@/lib/planning';
import { cn } from '@/lib/utils';
import type { PlanRecommendation } from '@/types';

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: typeof Bot;
  tone?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className={cn('rounded-lg p-2', tones[tone])}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-tight text-muted-foreground sm:truncate sm:text-sm">{label}</p>
        <p className="text-lg font-semibold leading-tight sm:text-xl">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Course list + reasoning for a recommendation (rule-based planner or Gemini). */
export function RecommendationView({ recommendation }: { recommendation: PlanRecommendation }) {
  if (recommendation.courseCodes.length === 0) {
    return <EmptyState>{recommendation.reasoning}</EmptyState>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={recommendation.source === 'gemini' ? 'info' : 'secondary'}>
          <Bot /> {recommendation.source === 'gemini' ? 'Gemini AI' : 'Smart planner'}
        </Badge>
        <span className="text-sm text-muted-foreground">{sumCredits(recommendation.courseCodes)} credits</span>
      </div>
      <ul className="divide-y rounded-lg border">
        {recommendation.courseCodes.map(code => (
          <li key={code} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="font-medium">{code}</span>
              <span className="block truncate text-xs text-muted-foreground">{getCourse(code)?.name}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{getCourse(code)?.credits} cr</span>
          </li>
        ))}
      </ul>
      <div className="rounded-lg bg-muted/60 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
          <Lightbulb className="size-3.5 text-warning" aria-hidden /> Why this plan
        </p>
        <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>
      </div>
    </div>
  );
}

/** Confirmation dialog with a message field (used for "Return plan", "Decline meeting", "Submit plan"). */
export function MessageDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  required = false,
  destructive = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  required?: boolean;
  destructive?: boolean;
  onConfirm: (message: string) => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm(message);
      setMessage('');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <div className="space-y-2">
          <Label htmlFor="message-dialog-text">
            {label}
            {!required && <span className="font-normal text-muted-foreground"> (optional)</span>}
          </Label>
          <Textarea
            id="message-dialog-text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={4}
            maxLength={1000}
          />
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={busy || (required && message.trim().length === 0)}
          >
            {busy && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
