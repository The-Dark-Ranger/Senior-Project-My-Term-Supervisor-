import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  GitBranch,
  ShieldCheck,
  User,
  UserCog,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: BrainCircuit,
    title: 'AI term recommendations',
    text: 'A prerequisite-aware planner suggests a balanced term and explains why. Optionally powered by Google Gemini.',
  },
  {
    icon: ClipboardCheck,
    title: 'Instant plan validation',
    text: 'Missing prerequisites, duplicate courses and credit overloads are flagged before a plan can be submitted.',
  },
  {
    icon: Workflow,
    title: 'Supervisor approval workflow',
    text: 'Students submit plans; supervisors approve them or return them with feedback. Both sides see updates live.',
  },
  {
    icon: GitBranch,
    title: 'Visual degree roadmap',
    text: 'An interactive map shows completed, planned, available and locked courses across all four years.',
  },
  {
    icon: CalendarClock,
    title: 'Meeting scheduling',
    text: 'Students book office-hour slots; supervisors accept or decline and see meetings on a calendar.',
  },
  {
    icon: ShieldCheck,
    title: 'Hex Sentinel traps',
    text: 'Built-in honeypot routes silently log automated scanners probing for secrets and admin panels.',
  },
];

const steps = [
  'Collect the student profile and the courses open this term.',
  'Validate prerequisites and filter out ineligible courses.',
  'Rank courses by study-plan position and critical-path impact.',
  'Fill the term within the credit limits and explain the choice.',
  'Send the plan to the supervisor for approval or feedback.',
];

export default function LandingPage() {
  return (
    <div className="space-y-16 pb-8 sm:space-y-24">
      <section className="mx-auto max-w-3xl pt-6 text-center sm:pt-12">
        <p className="mb-3 text-sm font-medium text-primary">Advanced Term Supervisor</p>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          Plan your term with confidence, <span className="text-primary">together with your supervisor</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-pretty text-muted-foreground sm:mt-6 sm:text-lg">
          Build a conflict-free term plan in minutes, get AI-backed reasoning for every recommendation, and have it
          reviewed and approved without spreadsheets or paper forms.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="#features">See how it works</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6" aria-label="Portals">
        <PortalCard
          href="/student/login"
          icon={User}
          title="Student Portal"
          text="Build and validate your term plan, follow AI recommendations, track your degree progress and book meetings."
          cta="Open Student Portal"
        />
        <PortalCard
          href="/supervisor/login"
          icon={UserCog}
          title="Supervisor Portal"
          text="Review submitted plans, approve or return them with feedback, manage meetings and keep notes per student."
          cta="Open Supervisor Portal"
        />
      </section>

      <section id="features" className="scroll-mt-24">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why Term Supervisor?</h2>
          <p className="mt-3 text-muted-foreground">
            Academic planning and security monitoring in one integrated platform.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                <Icon className="size-6 text-primary" aria-hidden />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight sm:text-3xl">How a plan is built</h2>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-4 rounded-xl border bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-1 text-sm sm:text-base">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function PortalCard({
  href,
  icon: Icon,
  title,
  text,
  cta,
}: {
  href: string;
  icon: typeof User;
  title: string;
  text: string;
  cta: string;
}) {
  return (
    <Card className="group flex flex-col transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="size-6 text-primary" aria-hidden />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription className="pt-1">{text}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button asChild className="w-full" size="lg">
          <Link href={href}>
            {cta} <ArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
