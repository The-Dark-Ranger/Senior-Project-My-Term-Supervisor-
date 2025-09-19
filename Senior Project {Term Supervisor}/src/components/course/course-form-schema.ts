
import { z } from 'zod';

export const courseFormSchema = z.object({
  name: z.string().min(2, { message: "Course name must be at least 2 characters." }).max(100),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }).max(500),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'], { message: "Please select a difficulty level." }),
  expectedWorkload: z.coerce.number().min(1, { message: "Workload must be at least 1 hour." }).max(100),
  prerequisites: z.string().optional(), // Comma-separated string
  // Deadlines array removed
  // deadlines: z.array(z.object({
  //   title: z.string().min(1, { message: "Deadline title cannot be empty."}).max(100),
  //   date: z.string().refine((date) => !isNaN(new Date(date).getTime()), { message: "Invalid date format." }),
  // })).optional(),
  credits: z.coerce.number().min(0, { message: "Credits cannot be negative." }).max(10, { message: "Credits seem high, max 10."}),
  instructor: z.string().min(2, { message: "Instructor name must be at least 2 characters."}).max(100).optional().or(z.literal('')),
  sectionDetails: z.string().max(200, { message: "Section details too long."}).optional().or(z.literal('')),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

    