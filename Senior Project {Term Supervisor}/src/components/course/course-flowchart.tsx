
"use client";

import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { type CatalogCourse } from '@/data/course-catalog';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CourseFlowchartProps {
    allCourses: CatalogCourse[];
    takenCourseCodes: string[];
    remainingCourses: Pick<CatalogCourse, 'courseCode' | 'prerequisites'>[];
}

type CourseNodeData = {
  label: React.ReactNode;
  status?: 'taken' | 'available' | 'locked';
  isLabel?: boolean;
};

const nodeWidth = 170;
const nodeHeight = 60;
const levelGap = 250;
const yearGap = 300;

const getLayoutedElements = (allCourses: CatalogCourse[], takenCourseCodes: string[]) => {
    const nodes: Node<CourseNodeData>[] = [];
    const edges: Edge[] = [];
    const takenSet = new Set(takenCourseCodes);

    const coursesByLevel: { [key: number]: string[] } = {
        1: ['MATH 101', 'ENG 101', 'PHYS 101', 'CHEM 101', 'ISLS 101', 'ARAB 101'],
        2: ['MATH 102', 'SE 201', 'ISLS 201', 'ARAB 201', 'ENG 102', 'GE 202'],
        3: ['MATH 203', 'PHYS 102', 'ISLS 301', 'SOC 140'],
        4: ['SE 203', 'IE 201', 'MATH 241'],
        5: ['SE 206', 'SE 308', 'IE 331'],
        6: ['SE 205', 'SE 204', 'SE 307', 'BUS 351'],
        7: ['SE 311', 'SE 310', 'SE 312', 'SE 309'],
        8: ['SE 315', 'SE 313', 'SE 421', 'SE 314', 'SE 316'],
        9: ['Track I', 'Track II', 'SE 418', 'SE 419'],
        10: ['Track III', 'Track IV', 'SE 420'],
        11: ['SE 499', 'Track V'],
    };
    
    // X positions for each level
    const levelXPositions: { [key: number]: number } = {};
    levelXPositions[1] = 0;
    levelXPositions[2] = levelXPositions[1] + levelGap;
    levelXPositions[3] = levelXPositions[2] + yearGap;
    levelXPositions[4] = levelXPositions[3] + levelGap;
    levelXPositions[5] = levelXPositions[4] + yearGap;
    levelXPositions[6] = levelXPositions[5] + levelGap;
    levelXPositions[7] = levelXPositions[6] + yearGap;
    levelXPositions[8] = levelXPositions[7] + levelGap;
    levelXPositions[9] = levelXPositions[8] + yearGap; // Start of "Year 5" but we'll label it as part of 4
    levelXPositions[10] = levelXPositions[9] + levelGap;
    levelXPositions[11] = levelXPositions[10] + levelGap;


    const courseNodeMap: Map<string, Node> = new Map();
    const headerY = -80;
    const courseStartY = 20;

    // Create Year Headers and Separators
    const yearHeaders = [
        { year: 1, label: 'Year 1', startLevel: 1, endLevel: 2 },
        { year: 2, label: 'Year 2', startLevel: 3, endLevel: 4 },
        { year: 3, label: 'Year 3', startLevel: 5, endLevel: 6 },
        { year: 4, label: 'Year 4', startLevel: 7, endLevel: 11 }, // Year 4 contains levels 7 through 11
    ];

    yearHeaders.forEach(({ year, label, startLevel, endLevel }) => {
        const startX = levelXPositions[startLevel];
        const endX = levelXPositions[endLevel];
        const labelWidth = (endX - startX) + nodeWidth;
        const labelX = startX;

        nodes.push({
            id: `year-label-${year}`,
            position: { x: labelX, y: headerY },
            data: { label, isLabel: true },
            type: 'default',
            draggable: false,
            selectable: false,
            style: {
                width: labelWidth,
                height: 40,
                textAlign: 'center',
                backgroundColor: 'hsl(var(--muted))',
                color: 'hsl(var(--muted-foreground))',
                border: '2px solid hsl(var(--border))',
                fontWeight: 'bold',
                fontSize: '1rem',
            }
        });

        // Add a visual separator after each year except the last one
        if (year < yearHeaders.length) {
            nodes.push({
                id: `separator-${year}`,
                position: { x: endX + nodeWidth + (yearGap - levelGap) / 2, y: courseStartY - 20 },
                data: { label: '' },
                type: 'default',
                draggable: false,
                selectable: false,
                style: {
                    width: 2,
                    height: 800, // Adjust height as needed
                    backgroundColor: 'hsl(var(--border))',
                    border: 'none',
                }
            });
        }
    });

    Object.entries(coursesByLevel).forEach(([levelStr, courseCodes]) => {
        const level = parseInt(levelStr);
        const xPos = levelXPositions[level];
        
        courseCodes.forEach((code, index) => {
            const course = allCourses.find(c => c.courseCode === code);
            if (!course) return;

            const yPos = courseStartY + index * (nodeHeight + 50);

            let status: 'taken' | 'available' | 'locked';
            if (takenSet.has(course.courseCode)) {
                status = 'taken';
            } else {
                const prereqsMet = course.prerequisites.every(p => takenSet.has(p));
                status = prereqsMet ? 'available' : 'locked';
            }
            
            const departmentColor = {
                'Mathematics': '#FECACA', // red-200
                'Chemistry': '#FECACA', // red-200
                'Physics': '#FECACA', // red-200
                'Software Engineering': '#DBEAFE', // blue-200
                'General Studies': '#D1FAE5', // green-200
                'General Engineering': '#D1FAE5', // green-200
                'Industrial Engineering': '#FEF9C3', // yellow-200
                'Business': '#FEF9C3', // yellow-200
            }[course.department || ''] || '#F3F4F6'; // default gray

            const node: Node<CourseNodeData> = {
                id: course.courseCode,
                position: { x: xPos, y: yPos },
                data: {
                    label: (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className='w-full h-full p-1 cursor-help'>
                              <p className="text-xs font-bold text-center">{course.courseCode}</p>
                              <p className="text-[10px] text-center truncate">{course.name}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="font-bold">{course.name} ({course.courseCode})</p>
                            <p className="text-xs mt-1">{course.description}</p>
                            <p className="text-xs mt-2">Credits: {course.credits}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ),
                    status
                },
                type: 'default',
                selectable: false,
                draggable: false,
                style: {
                  width: nodeWidth,
                  height: nodeHeight,
                  backgroundColor: status === 'taken' ? '#A7F3D0' : status === 'available' ? departmentColor : '#E5E7EB',
                  color: status === 'taken' ? '#065F46' : status === 'available' ? '#1E40AF' : '#4B5563',
                  border: `2px solid ${status === 'taken' ? '#34D399' : status === 'available' ? '#60A5FA' : '#D1D5DB'}`,
                  opacity: status === 'locked' ? 0.7 : 1,
                },
            };
            nodes.push(node);
            courseNodeMap.set(code, node);
        });
    });

    nodes.forEach(node => {
      if (node.data.isLabel || !node.id) return;
      const course = allCourses.find(c => c.courseCode === node.id);
      if (course) {
        course.prerequisites.forEach(prereqCode => {
          if (courseNodeMap.has(prereqCode)) {
              const targetNode = courseNodeMap.get(course.courseCode)!;
              const sourceNode = courseNodeMap.get(prereqCode)!;
              
              const targetIsTaken = targetNode.data.status === 'taken';
              const targetIsAvailable = targetNode.data.status === 'available';
              const sourceIsTaken = sourceNode.data.status === 'taken';

              let strokeColor = '#9CA3AF'; // Locked color
              if (sourceIsTaken && targetIsTaken) {
                  strokeColor = '#34D399'; // Taken color
              } else if (sourceIsTaken && targetIsAvailable) {
                  strokeColor = '#3B82F6'; // Available color
              }
              
              const isAnimated = sourceIsTaken && targetIsAvailable;

              edges.push({
                  id: `e-${prereqCode}-${course.courseCode}`,
                  source: prereqCode,
                  target: course.courseCode,
                  type: 'smoothstep',
                  animated: isAnimated,
                  style: { 
                      stroke: strokeColor,
                      strokeWidth: isAnimated || targetIsTaken ? 2 : 1.5,
                  }
              });
          }
        });
      }
    });

    return { nodes, edges };
};

const CourseFlowchart: React.FC<CourseFlowchartProps> = ({ allCourses, takenCourseCodes, remainingCourses }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getLayoutedElements(allCourses, takenCourseCodes),
    [allCourses, takenCourseCodes]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(allCourses, takenCourseCodes);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [allCourses, takenCourseCodes, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="top-right"
        nodesDraggable={false}
        nodesConnectable={false}
        minZoom={0.2}
      >
        <Controls showInteractive={false} />
        <Background gap={16} size={1} />
        <div className="absolute top-2 left-2 p-2 bg-background/80 rounded-md border text-xs text-muted-foreground shadow-sm z-10">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-500" /> Legend:</p>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-300 border border-green-400"></div>
                    <span>Taken</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-200 border border-blue-400"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-400 opacity-70"></div>
                    <span>Locked</span>
                </div>
            </div>
        </div>
      </ReactFlow>
    </div>
  );
};

export default CourseFlowchart;
