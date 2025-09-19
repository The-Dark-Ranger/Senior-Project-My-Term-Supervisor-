
"use client";

import type React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Label is used implicitly by FormLabel
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Course, CourseDifficulty } from '@/types';
import { courseFormSchema, type CourseFormValues } from './course-form-schema';
import { PlusCircle, Trash2, BookOpenText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseFormProps {
  onSubmit: (data: CourseFormValues, existingCourseId?: string) => void;
  initialData?: Course;
  onClose: () => void;
}

export default function CourseForm({ onSubmit, initialData, onClose }: CourseFormProps) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          prerequisites: initialData.prerequisites.join(', '),
          // deadlines: initialData.deadlines.map(d => ({ title: d.title, date: d.date.split('T')[0] })) || [], // Deadlines removed
          credits: initialData.credits || 0,
          instructor: initialData.instructor || '',
          sectionDetails: initialData.sectionDetails || '',
        }
      : {
          name: '',
          description: '',
          difficulty: undefined, // Ensure difficulty is undefined for placeholder
          expectedWorkload: 1,
          prerequisites: '',
          // deadlines: [], // Deadlines removed
          credits: 3, 
          instructor: '',
          sectionDetails: '',
        },
  });

  // Deadlines field array removed
  // const { fields: deadlineFields, append: appendDeadline, remove: removeDeadline } = useFieldArray({
  //   control: form.control,
  //   name: "deadlines",
  // });

  const handleFormSubmit = (data: CourseFormValues) => {
    onSubmit(data, initialData?.id);
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
      <DialogHeader className="p-6 pb-4 border-b">
        <DialogTitle className="text-2xl flex items-center gap-2">
          <BookOpenText className="h-6 w-6 text-primary"/>
          {initialData ? 'Edit Course Details' : 'Add New Custom Course'}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Advanced Quantum Physics" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Briefly describe the course content, learning objectives, and key topics." {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['Easy', 'Medium', 'Hard'] as CourseDifficulty[]).map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expectedWorkload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Workload (hours/week)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credits</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Prof. Einstein" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
            name="sectionDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section Details (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Sec A01: MWF 10-11am, Room 101. Sec B01: TTh 2-3:30pm, Online" {...field} rows={2}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prerequisites"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prerequisites (Optional, comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Math 101, CS 100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Deadlines section removed */}
          {/* <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Deadlines (Optional)</Label>
               <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendDeadline({ title: '', date: '' })}
                className="shrink-0"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Deadline
              </Button>
            </div>
            {deadlineFields.length === 0 && <p className="text-sm text-muted-foreground py-2 px-3 border rounded-md bg-muted/30">No deadlines added yet.</p>}
            {deadlineFields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-3.5 border rounded-lg bg-muted/40 shadow-sm">
                <FormField
                  control={form.control}
                  name={`deadlines.${index}.title`}
                  render={({ field: deadlineTitleField }) => (
                    <FormItem className="flex-grow w-full sm:w-auto">
                      <FormLabel className={cn(index !== 0 && "sr-only", "text-xs")}>Deadline Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Midterm Exam" {...deadlineTitleField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`deadlines.${index}.date`}
                  render={({ field: deadlineDateField }) => (
                     <FormItem className="w-full sm:w-auto">
                      <FormLabel className={cn(index !== 0 && "sr-only", "text-xs")}>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...deadlineDateField} className="min-w-[150px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeDeadline(index)} className="shrink-0 self-center sm:self-end text-destructive hover:bg-destructive/10 h-9 w-9">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove deadline</span>
                </Button>
              </div>
            ))}
          </div> */}
          
          <DialogFooter className="pt-6 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} size="lg">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="lg">{initialData ? 'Save Changes' : 'Add Course to Schedule'}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

    