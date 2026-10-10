'use client';

import { memo, useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PROGRAM_PLAN } from '@/data/program-plan';
import { getCourse, getCourseStatus } from '@/lib/planning';
import { cn } from '@/lib/utils';
import { STATUS_META } from './course-status';
import type { CourseStatus } from '@/types';

const NODE_WIDTH = 164;
const NODE_HEIGHT = 56;
const COLUMN_GAP = 210;
const ROW_GAP = 76;
const HEADER_Y = -64;

type CourseNodeData = { code: string; name: string; status: CourseStatus; selected: boolean };
type YearNodeData = { label: string };
type CourseNode = Node<CourseNodeData, 'course'>;
type YearNode = Node<YearNodeData, 'year'>;

const CourseNodeView = memo(function CourseNodeView({ data }: NodeProps<CourseNode>) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col justify-center rounded-lg border-2 px-2 text-center shadow-sm transition-shadow',
        STATUS_META[data.status].className,
        data.status === 'locked' && 'opacity-75',
        data.selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
      title={`${data.code} - ${data.name} (${STATUS_META[data.status].label})`}
    >
      <Handle type="target" position={Position.Left} className="size-1.5! min-h-0! min-w-0! border-0! bg-transparent!" />
      <p className="text-xs font-bold">{data.code}</p>
      <p className="truncate text-[10px] leading-tight opacity-90">{data.name}</p>
      <Handle type="source" position={Position.Right} className="size-1.5! min-h-0! min-w-0! border-0! bg-transparent!" />
    </div>
  );
});

function YearNodeView({ data }: NodeProps<YearNode>) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
      {data.label}
    </div>
  );
}

const nodeTypes = { course: CourseNodeView, year: YearNodeView };

const EDGE_COLOR: Record<'done' | 'next' | 'blocked', string> = {
  done: 'var(--status-completed-border)',
  next: 'var(--status-available-border)',
  blocked: 'var(--status-locked-border)',
};

function buildGraph(completed: ReadonlySet<string>, planned: ReadonlySet<string>, selected: string | null) {
  const nodes: (CourseNode | YearNode)[] = [];
  const edges: Edge[] = [];
  const statusOf = new Map<string, CourseStatus>();

  for (const year of [1, 2, 3, 4]) {
    const firstTerm = (year - 1) * 2;
    nodes.push({
      id: `year-${year}`,
      type: 'year',
      position: { x: firstTerm * COLUMN_GAP, y: HEADER_Y },
      data: { label: `Year ${year}` },
      draggable: false,
      selectable: false,
      style: { width: COLUMN_GAP + NODE_WIDTH, height: 36 },
    });
  }

  for (const term of PROGRAM_PLAN) {
    term.courseCodes.forEach((code, index) => {
      const course = getCourse(code);
      if (!course) return;
      const status = getCourseStatus(code, completed, planned);
      statusOf.set(code, status);
      nodes.push({
        id: code,
        type: 'course',
        position: { x: (term.term - 1) * COLUMN_GAP, y: index * ROW_GAP },
        data: { code, name: course.name, status, selected: selected === code },
        draggable: false,
        style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      });
    });
  }

  for (const [code, status] of statusOf) {
    for (const prereq of getCourse(code)?.prerequisites ?? []) {
      if (!statusOf.has(prereq)) continue;
      const kind = completed.has(prereq) ? (status === 'completed' ? 'done' : 'next') : 'blocked';
      const highlighted = selected === code || selected === prereq;
      edges.push({
        id: `${prereq}->${code}`,
        source: prereq,
        target: code,
        type: 'smoothstep',
        animated: kind === 'next' && status !== 'locked',
        style: {
          stroke: highlighted ? 'var(--ring)' : EDGE_COLOR[kind],
          strokeWidth: highlighted ? 2.5 : kind === 'blocked' ? 1.25 : 1.75,
        },
        zIndex: highlighted ? 1 : 0,
      });
    }
  }
  return { nodes, edges };
}

export interface CourseFlowchartProps {
  completed: string[];
  planned?: string[];
  selected?: string | null;
  onSelect?: (code: string) => void;
}

export default function CourseFlowchart({ completed, planned = [], selected = null, onSelect }: CourseFlowchartProps) {
  const { resolvedTheme } = useTheme();
  const { nodes, edges } = useMemo(
    () => buildGraph(new Set(completed), new Set(planned), selected),
    [completed, planned, selected],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onNodeClick={(_, node) => node.type === 'course' && onSelect?.(node.id)}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={false}
      preventScrolling={false}
      fitView
      fitViewOptions={{ padding: 0.08 }}
      minZoom={0.25}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
    >
      <Controls showInteractive={false} position="bottom-left" />
      <Background gap={20} size={1} />
    </ReactFlow>
  );
}
