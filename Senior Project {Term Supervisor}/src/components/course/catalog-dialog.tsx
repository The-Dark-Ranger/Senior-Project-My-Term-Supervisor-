
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import type { CatalogCourse } from '@/data/course-catalog';
import { Badge } from '@/components/ui/badge';
import { BookCopy, Filter, X, Info, PlusCircle } from 'lucide-react';

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCourse: (selectedCourse: CatalogCourse) => void;
  availableCourses: CatalogCourse[];
  existingCourseIds: string[]; // Still useful for quick checks if needed
}

export default function CatalogDialog({ isOpen, onClose, onAddCourse, availableCourses, existingCourseIds }: CatalogDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredCatalog = useMemo(() => {
    if (!searchTerm) {
      return availableCourses;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return availableCourses.filter(course =>
      course.name.toLowerCase().includes(lowerSearchTerm) ||
      course.courseCode.toLowerCase().includes(lowerSearchTerm) ||
      (course.department && course.department.toLowerCase().includes(lowerSearchTerm)) ||
      (course.defaultInstructor && course.defaultInstructor.toLowerCase().includes(lowerSearchTerm))
    );
  }, [searchTerm, availableCourses]);
  
  const handleDialogClose = () => {
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2.5 text-2xl">
            <BookCopy className="h-7 w-7 text-primary" />
            University Course Catalog
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pt-4 pb-2 border-b">
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search available courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-10 py-2.5 text-base"
            />
            {searchTerm && (
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchTerm('')}>
                  <X className="h-5 w-5" />
                  <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        </div>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4 sm:p-6">
            {filteredCatalog.length > 0 ? (
              filteredCatalog.map(course => {
                return (
                <div
                  key={course.id}
                  className="flex items-start gap-4 p-4 border rounded-lg transition-all duration-150 ease-in-out hover:bg-muted/50 hover:shadow-sm hover:border-border"
                >
                  <div className="flex-grow grid gap-1.5">
                    <div className="flex justify-between items-start">
                        <Label 
                          className="font-semibold text-lg leading-tight"
                        >
                          {course.courseCode}: {course.name} 
                        </Label>
                        <Button size="sm" variant="outline" onClick={() => onAddCourse(course)}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Add
                        </Button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-normal">
                      {course.description}
                    </p>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5">
                      <span>Credits: <Badge variant="secondary" className="font-medium">{course.credits}</Badge></span>
                      {course.department && <span>Dept: <Badge variant="outline" className="font-medium">{course.department}</Badge></span>}
                    </div>
                     {course.prerequisites.length > 0 && (
                       <p className="text-xs text-muted-foreground mt-1">Prerequisites: <span className="font-medium">{course.prerequisites.join(', ')}</span></p>
                     )}
                     {course.defaultInstructor && (
                       <p className="text-xs text-muted-foreground mt-0.5">Instructor: <span className="font-medium">{course.defaultInstructor}</span></p>
                     )}
                     {course.defaultSectionDetails && (
                       <p className="text-xs text-muted-foreground mt-0.5 flex items-start"><Info className="h-3.5 w-3.5 mr-1 shrink-0 mt-px text-blue-500"/> Sections: <span className="font-medium">{course.defaultSectionDetails}</span></p>
                     )}
                  </div>
                </div>
              )})
            ) : (
              <div className="text-center text-muted-foreground py-8 px-4">
                <p className="text-lg font-medium">No Courses Available</p>
                <p className="text-sm mt-1">Either all courses have been added to your schedule, or your search term returned no results.</p>
              </div>
            )}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-muted/30">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleDialogClose} size="lg">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
