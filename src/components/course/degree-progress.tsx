'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { GitBranch, List, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PROGRAM_PLAN, RECOMMENDED_TERM } from '@/data/program-plan';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getCourse, getCourseStatus, missingPrerequisites, unlockCount } from '@/lib/planning';
import { cn } from '@/lib/utils';
import { CourseStatusBadge, StatusLegend } from './course-status';

// React Flow is client-only and fairly large - load it on demand.
const CourseFlowchart = dynamic(() => import('./course-flowchart'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export interface DegreeProgressProps {
  completed: string[];
  planned?: string[];
  /** Optional per-course actions shown in the details panel (e.g. "Add to plan"). */
  renderActions?: (code: string) => React.ReactNode;
}

export default function DegreeProgress({ completed, planned = [], renderActions }: DegreeProgressProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [tab, setTab] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const activeTab = tab ?? (isDesktop ? 'map' : 'list');

  const completedSet = useMemo(() => new Set(completed), [completed]);
  const plannedSet = useMemo(() => new Set(planned), [planned]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="self-start">
            <TabsTrigger value="map" className="gap-1.5">
              <GitBranch className="size-4" /> Map
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="size-4" /> List
            </TabsTrigger>
          </TabsList>
          <StatusLegend />
        </div>

        <TabsContent value="map" className="mt-3">
          <div className="h-[420px] overflow-hidden rounded-lg border bg-background sm:h-[540px]">
            <CourseFlowchart completed={completed} planned={planned} selected={selected} onSelect={setSelected} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Select a course to see its details. Drag to pan; use the controls or pinch to zoom.
          </p>
        </TabsContent>

        <TabsContent value="list" className="mt-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PROGRAM_PLAN.map(term => (
              <section key={term.term} aria-labelledby={`term-${term.term}`} className="rounded-lg border p-3">
                <h4 id={`term-${term.term}`} className="mb-2 text-sm font-semibold">
                  {term.label}
                </h4>
                <ul className="space-y-1.5">
                  {term.courseCodes.map(code => {
                    const status = getCourseStatus(code, completedSet, plannedSet);
                    return (
                      <li key={code}>
                        <button
                          type="button"
                          onClick={() => setSelected(code)}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                            selected === code && 'bg-muted ring-1 ring-ring',
                          )}
                        >
                          <span className="min-w-0">
                            <span className="font-medium">{code}</span>
                            <span className="block truncate text-xs text-muted-foreground">{getCourse(code)?.name}</span>
                          </span>
                          <CourseStatusBadge status={status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selected && (
        <CourseDetails
          code={selected}
          completed={completedSet}
          planned={plannedSet}
          onClose={() => setSelected(null)}
          actions={renderActions?.(selected)}
        />
      )}
    </div>
  );
}

function CourseDetails({
  code,
  completed,
  planned,
  onClose,
  actions,
}: {
  code: string;
  completed: ReadonlySet<string>;
  planned: ReadonlySet<string>;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const course = getCourse(code);
  if (!course) return null;
  const status = getCourseStatus(code, completed, planned);
  const missing = missingPrerequisites(code, completed);
  const term = PROGRAM_PLAN.find(t => t.term === RECOMMENDED_TERM.get(code));

  return (
    <div className="rounded-lg border bg-muted/40 p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{course.courseCode}</p>
          <h4 className="font-semibold">{course.name}</h4>
        </div>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Close course details">
          <X />
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="mt-0.5">
            <CourseStatusBadge status={status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Credits</dt>
          <dd className="font-medium">{course.credits}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Study plan</dt>
          <dd className="font-medium">{term?.label ?? '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Unlocks</dt>
          <dd className="font-medium">{unlockCount(code)} later courses</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm">
        <span className="text-muted-foreground">Prerequisites: </span>
        {course.prerequisites.length === 0
          ? 'None'
          : course.prerequisites.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                <span className={missing.includes(p) ? 'font-medium text-destructive' : 'font-medium text-success'}>{p}</span>
              </span>
            ))}
      </p>
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
