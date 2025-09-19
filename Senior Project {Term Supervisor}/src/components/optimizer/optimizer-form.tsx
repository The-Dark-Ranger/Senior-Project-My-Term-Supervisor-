
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Course, AICourseInput } from '@/types';
import { getOptimizedScheduleAction, type OptimizerResult } from '@/lib/actions';
import type { OptimizeTermScheduleOutput } from '@/ai/flows/optimize-term-schedule';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, Loader2, ListChecks, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge'; // Added this import

const optimizerFormSchema = z.object({
  learningGoals: z.string().min(10, { message: "Learning goals must be at least 10 characters." }).max(1000),
  selectedCourseIds: z.array(z.string()).min(1, { message: "Please select at least one course to optimize." }),
});

type OptimizerFormValues = z.infer<typeof optimizerFormSchema>;

interface OptimizerFormProps {
  courses: Course[];
  onOptimizationResult: (result: OptimizeTermScheduleOutput) => void;
  onOptimizationError: (error: string) => void;
}

export default function OptimizerForm({ courses, onOptimizationResult, onOptimizationError }: OptimizerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<OptimizerFormValues>({
    resolver: zodResolver(optimizerFormSchema),
    defaultValues: {
      learningGoals: '',
      selectedCourseIds: courses.map(c => c.id), // Default to all courses selected
    },
  });
  
  // Update default selected courses if the courses prop changes
  React.useEffect(() => {
    form.reset({
      learningGoals: form.getValues('learningGoals') || '',
      selectedCourseIds: courses.map(c => c.id),
    });
  }, [courses, form]);

  const handleSubmit = async (data: OptimizerFormValues) => {
    setIsLoading(true);
    onOptimizationError(''); 

    const selectedCourses = courses.filter(course => data.selectedCourseIds.includes(course.id));

    const aiCoursesInput: AICourseInput[] = selectedCourses.map(course => ({
      name: course.name,
      description: course.description,
      difficulty: course.difficulty,
      expectedWorkload: course.expectedWorkload,
      prerequisites: course.prerequisites,
      credits: course.credits,
      instructor: course.instructor,
      sectionDetails: course.sectionDetails,
    }));

    if (aiCoursesInput.length === 0) {
      toast({
        title: "No Courses Selected",
        description: "Please select courses to optimize.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    const inputForAI = {
      courses: aiCoursesInput,
      learningGoals: data.learningGoals,
    };

    const result: OptimizerResult = await getOptimizedScheduleAction(inputForAI);
    setIsLoading(false);

    if (result.data) {
      onOptimizationResult(result.data);
      toast({
        title: "Schedule Optimized!",
        description: "The AI has generated a schedule suggestion.",
      });
    } else if (result.error) {
      onOptimizationError(result.error);
      toast({
        title: "Optimization Failed",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-xl border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-2xl font-semibold">
          <BrainCircuit className="h-8 w-8 text-primary" />
          AI Term Optimizer
        </CardTitle>
        <CardDescription className="text-base mt-1">
          Select courses and define your goals to let AI suggest an optimal learning path.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="learningGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Your Learning Goals for the Term</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Master foundational concepts in computer science, prepare for advanced AI courses, build a strong project portfolio. Aim for 12-15 credits, and balance demanding courses."
                      rows={4}
                      className="resize-y text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedCourseIds"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel className="text-base font-medium flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-muted-foreground"/>
                      Select Courses to Include in Optimization
                    </FormLabel>
                  </div>
                  {courses.length > 0 ? (
                    <ScrollArea className="h-52 rounded-lg border p-1 bg-muted/20 shadow-inner">
                      <div className="space-y-0.5 p-3">
                      {courses.map((course) => (
                        <FormField
                          key={course.id}
                          control={form.control}
                          name="selectedCourseIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-md hover:bg-primary/10 transition-colors cursor-pointer border border-transparent has-[:checked]:bg-primary/10 has-[:checked]:border-primary/50"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(course.id)}
                                    onCheckedChange={(checkedState: boolean | 'indeterminate') => {
                                      const currentSelectedIds = field.value || [];
                                      if (checkedState === true) {
                                        field.onChange([...currentSelectedIds, course.id]);
                                      } else {
                                        field.onChange(currentSelectedIds.filter(id => id !== course.id));
                                      }
                                    }}
                                    className="h-5 w-5"
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer w-full text-sm flex justify-between items-center">
                                  <span>{course.name}</span>
                                  <Badge variant="outline">{course.credits} credits</Badge>
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      </div>
                    </ScrollArea>
                  ) : (
                     <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/30 flex items-center gap-2">
                       <AlertTriangle className="h-5 w-5 text-amber-500"/> 
                       <span>No courses in your schedule to optimize. Please add courses first.</span>
                     </div>
                  )}
                   <FormMessage className="pt-1"/>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" disabled={isLoading || courses.length === 0} size="lg" className="shadow-md hover:shadow-lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Optimizing Your Schedule...
                </>
              ) : (
                <>
                  <BrainCircuit className="mr-2 h-5 w-5" /> Optimize My Schedule
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
