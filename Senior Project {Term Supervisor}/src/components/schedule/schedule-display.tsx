
"use client";

import type React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Course } from "@/types";
import { Trash2, AlertTriangle, BookUser, Info, Star, BookCopy, ShieldCheck, BookOpen } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ScheduleDisplayProps {
  courses: Course[];
  onDeleteCourse: (courseId: string) => void;
  onAddNewCourseFromCatalog: () => void;
}

export default function ScheduleDisplay({ courses, onDeleteCourse, onAddNewCourseFromCatalog }: ScheduleDisplayProps) {
  const totalCredits = courses.reduce((acc, course) => acc + course.credits, 0);

  if (courses.length === 0) {
    return (
      <Card className="shadow-lg border-2 border-dashed border-muted-foreground/30 bg-card">
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-3 text-primary/60" />
          <CardTitle className="text-xl sm:text-2xl">Your Schedule is Empty</CardTitle>
           <CardDescription className="text-sm sm:text-base">
             Add courses from the catalog to start planning your term.
           </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6 sm:py-8">
          <Button size="lg" onClick={onAddNewCourseFromCatalog} className="shadow-md hover:shadow-lg">
            <BookOpen className="mr-2 h-5 w-5" /> Add from Course Catalog
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border bg-card">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <CardTitle className="text-xl sm:text-2xl font-semibold">Your Term Schedule</CardTitle>
          <CardDescription className="text-sm sm:text-base mt-1">
            Overview of your planned courses. Total Credits: <Badge variant="secondary" className="text-sm sm:text-base px-2.5 py-1 font-semibold">{totalCredits}</Badge>
          </CardDescription>
        </div>
        <Button onClick={onAddNewCourseFromCatalog} variant="outline" className="self-start sm:self-center shadow-sm hover:shadow-md w-full sm:w-auto">
          <BookOpen className="mr-2 h-4 w-4" /> Add from Catalog
        </Button>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="min-w-[220px] sm:min-w-[280px] px-3 sm:px-4 py-3 text-sm font-medium">Course Name</TableHead>
                <TableHead className="px-2 sm:px-3 py-3 text-sm font-medium text-center">Credits</TableHead>
                <TableHead className="min-w-[150px] sm:min-w-auto px-2 sm:px-3 py-3 text-sm font-medium">Instructor</TableHead>
                <TableHead className="min-w-[150px] sm:min-w-[180px] px-2 sm:px-3 py-3 text-sm font-medium">Prerequisites</TableHead>
                <TableHead className="min-w-[180px] sm:min-w-[220px] px-2 sm:px-3 py-3 text-sm font-medium">Section Details</TableHead>
                <TableHead className="text-right min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3 text-sm font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id} className="hover:bg-muted/40 transition-colors group">
                  <TableCell className="font-medium px-3 sm:px-4 py-3.5 align-top">
                    <div className="flex items-center gap-2.5">
                       {course.catalogCourseId ?
                        <TooltipProvider>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger><ShieldCheck className="h-5 w-5 text-green-600 shrink-0" /></TooltipTrigger>
                            <TooltipContent><p>Verified Catalog Course</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        :
                        <TooltipProvider>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger><BookCopy className="h-5 w-5 text-blue-600 shrink-0" /></TooltipTrigger>
                            <TooltipContent><p>Custom Course (not in catalog)</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                       }
                      <span className="text-sm sm:text-base group-hover:text-primary transition-colors">{course.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs truncate" title={course.description}>{course.description}</p>
                  </TableCell>
                  <TableCell className="px-2 sm:px-3 py-3.5 align-top text-center">
                    <Badge variant="outline" className="whitespace-nowrap text-xs sm:text-sm py-1 px-2 sm:px-2.5">
                      <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 sm:mr-1.5 text-amber-500" />{course.credits}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 sm:px-3 py-3.5 align-top">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <BookUser className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent shrink-0" />
                      <span className="text-muted-foreground">{course.instructor || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs px-2 sm:px-3 py-3.5 align-top text-muted-foreground">
                    {course.prerequisites.length > 0 ? course.prerequisites.join(', ') : <span className="italic">None</span>}
                  </TableCell>
                  <TableCell className="text-xs px-2 sm:px-3 py-3.5 align-top max-w-[150px] sm:max-w-xs text-muted-foreground">
                     <div className="flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>{course.sectionDetails || <span className="italic">N/A</span>}</span>
                     </div>
                  </TableCell>
                  <TableCell className="text-right px-3 sm:px-4 py-3.5 align-top space-x-2 whitespace-nowrap">
                    <Button variant="destructive" size="sm" onClick={() => onDeleteCourse(course.id)} className="hover:bg-destructive/90 transition-colors">
                      <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
         <Button onClick={onAddNewCourseFromCatalog} variant="outline" className="mt-6 w-full sm:hidden flex items-center justify-center shadow-sm hover:shadow-md">
          <BookOpen className="mr-2 h-5 w-5" /> Add Another Course from Catalog
        </Button>
      </CardContent>
    </Card>
  );
}
