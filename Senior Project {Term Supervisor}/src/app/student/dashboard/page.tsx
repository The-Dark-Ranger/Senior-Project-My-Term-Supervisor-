
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, MessageSquare, Send, CalendarDays, ChevronDown, ChevronUp, CheckCircle, ListChecks, GraduationCap, BookMarked, AlertTriangle, SendToBack, PlusCircle, Trash2, Search, Lock, Target, ClipboardList, Lightbulb } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { courseCatalog, type CatalogCourse } from '@/data/course-catalog'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { Course, LoggedInUser, MeetingRequest, StudentScheduleSubmission, MockStudentCourseDisplay, RecommendedPlan } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import CourseFlowchart from '@/components/course/course-flowchart';


const LOCAL_STORAGE_KEY_STUDENT_COURSES_PREFIX = 'studentPlan_'; 
const LOCAL_STORAGE_KEY_MEETING_REQUESTS = 'termSupervisorMeetingRequests_v1';
const LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS = 'termSupervisorSubmissions_v1';
const LOCAL_STORAGE_KEY_ACCEPTED_SCHEDULE_PREFIX = 'acceptedSchedule_';


const studentYearMap: {[key: string]: number} = {
  'student1': 1,
  'student2': 2,
  'student3': 3,
  'student4': 4,
};

const coursesByYear: {[key: number]: string[]} = {
    1: ['MATH 101', 'CHEM 101', 'PHYS 101', 'ISLS 101', 'ARAB 101', 'ENG 101', 'MATH 102', 'SE 201', 'ISLS 201', 'ARAB 201', 'ENG 102', 'GE 202'],
    2: ['MATH 203', 'PHYS 102', 'SE 203', 'SE 206', 'SE 204', 'SE 308', 'ISLS 301', 'SOC 140', 'MATH 241', 'SE 205', 'IE 201'],
    3: ['SE 311', 'SE 312', 'SE 310', 'SE 309', 'SE 307', 'SE 313', 'SE 314', 'SE 315', 'SE 316', 'BUS 351', 'IE 331', 'SE 421'],
    4: ['SE 419', 'SE 418', 'SE 420', 'SE 499'],
};

const getCoursesForYear = (year: number) => {
    let courses: string[] = [];
    // A student in year `X` has completed all courses for years 1 through `X-1`.
    for (let i = 1; i < year; i++) {
        courses = courses.concat(coursesByYear[i] || []);
    }
    return courses;
};


const mockMeetingSlots = ["Monday 10:00 AM - 10:30 AM", "Tuesday 2:00 PM - 2:30 PM", "Wednesday 11:00 AM - 11:30 AM", "Friday 3:00 PM - 3:30 PM"];


export default function StudentDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const [isTalkToSupervisorOpen, setIsTalkToSupervisorOpen] = useState(false);
  const [supervisorMeetingSlot, setSupervisorMeetingSlot] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [studentName, setStudentName] = useState<string>('Student User'); 
  const [studentUid, setStudentUid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScheduleAccepted, setIsScheduleAccepted] = useState(false);
  
  const [mockTakenCourses, setMockTakenCourses] = useState<MockStudentCourseDisplay[]>([]);
  const [mockRemainingCourses, setMockRemainingCourses] = useState<Pick<Course, 'id' | 'name' | 'credits'| 'courseCode' | 'prerequisites' | 'description' | 'expectedWorkload'>[]>([]);
  const [mockRecommendedPlan, setMockRecommendedPlan] = useState<RecommendedPlan | null>(null);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        const loggedInUserRaw = localStorage.getItem('loggedInUser');
        if (loggedInUserRaw) {
          try {
            const loggedInUser: LoggedInUser = JSON.parse(loggedInUserRaw);
            if (loggedInUser.uid === user.uid) {
              setStudentName(loggedInUser.name);
              setStudentUid(loggedInUser.uid);
              loadCoursesForStudent(loggedInUser);
              updateAcademicProgress(loggedInUser.name);
            } else {
              router.push('/student/login');
            }
          } catch (e) {
            router.push('/student/login');
          }
        } else {
          router.push('/student/login');
        }
      } else {
        toast({
          title: "Access Denied",
          description: "Please log in to view your dashboard.",
          variant: "destructive"
        });
        router.push('/student/login');
      }
    });
    return () => unsubscribe();
  }, [router, toast]);
  
  const updateAcademicProgress = (currentStudentName: string) => {
    const studentYear = studentYearMap[currentStudentName] || 0;
    
    const takenCourseCodes = getCoursesForYear(studentYear);
    const takenCourses = courseCatalog
      .filter(c => takenCourseCodes.includes(c.courseCode))
      .map(c => ({...c, grade: 'A'})); // Mock grade
      
    const allCourseCodes = Object.values(coursesByYear).flat();
    const remainingCourseCodes = allCourseCodes.filter(code => !takenCourseCodes.includes(code));
    const remainingCourses = courseCatalog.filter(c => remainingCourseCodes.includes(c.courseCode));
    
    // Set recommended plan for the student's current year
    const recommendedCourseCodes = coursesByYear[studentYear] || [];
    // This is a simplified mock. In a real app, this data would come from the supervisor's mock data or a backend.
    const recommendedPlan: RecommendedPlan = {
      courses: courseCatalog.filter(c => recommendedCourseCodes.slice(0, 5).includes(c.courseCode)),
      reasoning: `This is a balanced starting plan for a year ${studentYear} student, focusing on core requirements for the upcoming term. It includes foundational courses while keeping the credit load manageable.`
    };


    setMockTakenCourses(takenCourses);
    setMockRemainingCourses(remainingCourses);
    setMockRecommendedPlan(recommendedPlan);
  };
  
  const loadCoursesForStudent = (user: LoggedInUser) => {
    const acceptedScheduleKey = `${LOCAL_STORAGE_KEY_ACCEPTED_SCHEDULE_PREFIX}${user.name}`;
    const acceptedScheduleRaw = localStorage.getItem(acceptedScheduleKey);
    
    if (acceptedScheduleRaw) {
      try {
        const acceptedCourses: Course[] = JSON.parse(acceptedScheduleRaw);
        setCourses(acceptedCourses);
        setIsScheduleAccepted(true);
        return; 
      } catch (error) {
        console.error("Failed to parse accepted schedule:", error);
      }
    }

    setIsScheduleAccepted(false);
    const studentCoursesKey = `${LOCAL_STORAGE_KEY_STUDENT_COURSES_PREFIX}${user.uid}`;
    const storedCoursesRaw = localStorage.getItem(studentCoursesKey);
    if (storedCoursesRaw) {
      try {
        setCourses(JSON.parse(storedCoursesRaw));
      } catch (error) {
        console.error("Failed to parse courses from localStorage:", error);
        localStorage.removeItem(studentCoursesKey);
      }
    } else {
        setCourses([]);
    }
  };


  useEffect(() => {
    if (studentUid && !isScheduleAccepted) {
      const studentCoursesKey = `${LOCAL_STORAGE_KEY_STUDENT_COURSES_PREFIX}${studentUid}`;
      if (courses.length > 0 || localStorage.getItem(studentCoursesKey) !== null) {
        localStorage.setItem(studentCoursesKey, JSON.stringify(courses));
      }
    }
  }, [courses, studentUid, isScheduleAccepted]);

  const existingCourseCatalogIds = useMemo(() => {
    return new Set(courses.map(c => c.catalogCourseId).filter(Boolean));
  }, [courses]);

  const openThisTermCatalogCourses = useMemo(() => {
    // Sync with the recommended plan
    if (!mockRecommendedPlan) {
      return [];
    }

    const takenCourseCodes = new Set(mockTakenCourses.map(c => c.courseCode));
    
    return mockRecommendedPlan.courses
      .filter(recommendedCourse => {
          const isNotAlreadyAdded = !existingCourseCatalogIds.has(recommendedCourse.id);
          const prerequisitesMet = recommendedCourse.prerequisites.length === 0 || recommendedCourse.prerequisites.every(prereq => takenCourseCodes.has(prereq));
          
          return isNotAlreadyAdded && prerequisitesMet;
      })
      .map(course => ({
        ...course,
        defaultSectionDetails: course.defaultSectionDetails || "See university schedule for current term sections." 
      }));
  }, [mockRecommendedPlan, mockTakenCourses, existingCourseCatalogIds]);

  const filteredCatalogCourses = useMemo(() => {
    if (!searchTerm) {
      return openThisTermCatalogCourses;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return openThisTermCatalogCourses.filter(course => 
        course.name.toLowerCase().includes(lowercasedTerm) ||
        course.courseCode.toLowerCase().includes(lowercasedTerm) ||
        (course.department && course.department.toLowerCase().includes(lowercasedTerm))
    );
  }, [openThisTermCatalogCourses, searchTerm]);


  const handleAddCourseFromCatalog = (catalogCourse: CatalogCourse) => {
    if (isScheduleAccepted) return;
    const newCourse: Course = {
      id: `cat_${catalogCourse.id}_${crypto.randomUUID().substring(0, 8)}`,
      catalogCourseId: catalogCourse.id,
      name: catalogCourse.name,
      description: catalogCourse.description,
      difficulty: 'Medium', // Default difficulty
      expectedWorkload: catalogCourse.expectedWorkload,
      prerequisites: catalogCourse.prerequisites,
      credits: catalogCourse.credits,
      instructor: catalogCourse.defaultInstructor || "N/A",
      sectionDetails: catalogCourse.defaultSectionDetails || "Not specified",
      courseCode: catalogCourse.courseCode,
    };

    const isAlreadyAdded = courses.some(ec => ec.catalogCourseId === newCourse.catalogCourseId && ec.catalogCourseId !== undefined);

    if (!isAlreadyAdded) {
        setCourses(prevCourses => [...prevCourses, newCourse]);
        toast({ title: "Course Added", description: `"${newCourse.name}" has been added to your term plan.` });
    } else {
        toast({ title: "Course Already Added", description: `"${newCourse.name}" is already in your plan.`, variant: "default" });
    }
  };


  const handleDeleteCourse = (courseId: string) => {
    if (isScheduleAccepted) return;
    const courseToDelete = courses.find(c => c.id === courseId);
    setCourses(courses.filter(c => c.id !== courseId));
    if (courseToDelete) {
      toast({ title: "Course Removed", description: `"${courseToDelete.name}" has been removed from your plan.`, variant: "destructive" });
    }
  };
  
  const handleRequestSupervisorMeeting = () => {
    if (!supervisorMeetingSlot) {
        toast({ title: "Select a Time Slot", description: "Please choose a time slot for the meeting.", variant: "destructive"});
        return;
    }

    const newRequest: MeetingRequest = {
      id: crypto.randomUUID(),
      studentName: studentName, 
      studentUid: studentUid || undefined,
      slot: supervisorMeetingSlot,
      notes: supervisorNotes || "No specific notes provided.",
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    try {
      const existingRequestsRaw = localStorage.getItem(LOCAL_STORAGE_KEY_MEETING_REQUESTS);
      const existingRequests: MeetingRequest[] = existingRequestsRaw ? JSON.parse(existingRequestsRaw) : [];
      existingRequests.push(newRequest);
      localStorage.setItem(LOCAL_STORAGE_KEY_MEETING_REQUESTS, JSON.stringify(existingRequests));
      
      toast({ 
        title: "Meeting Requested!", 
        description: `Your request for ${supervisorMeetingSlot} has been sent to your supervisor.`
      });
      setIsTalkToSupervisorOpen(false);
      setSupervisorMeetingSlot('');
      setSupervisorNotes('');

    } catch (error) {
      console.error("Error saving meeting request to localStorage:", error);
      toast({
        title: "Error",
        description: "Could not save your meeting request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitSchedule = () => {
    if (isScheduleAccepted) return;
    if (!studentUid) {
      toast({
        title: "Error",
        description: "Could not identify student. Please log in again.",
        variant: "destructive"
      });
      return;
    }
    if (courses.length === 0) {
      toast({
        title: "Empty Schedule",
        description: "Please add courses to your schedule before submitting.",
        variant: "default"
      });
      return;
    }

    const newSubmission: StudentScheduleSubmission = {
      id: crypto.randomUUID(),
      studentUid: studentUid,
      studentName: studentName,
      submittedCourses: courses, 
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    try {
      const existingSubmissionsRaw = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS);
      const existingSubmissions: StudentScheduleSubmission[] = existingSubmissionsRaw ? JSON.parse(existingSubmissionsRaw) : [];
      
      const hasPendingSubmission = existingSubmissions.some(s => s.studentUid === studentUid && s.status === 'pending');
      if (hasPendingSubmission) {
        toast({ 
          title: "Submission Already Pending", 
          description: "You already have a schedule awaiting supervisor approval.",
          variant: "default"
        });
        return;
      }
      
      existingSubmissions.push(newSubmission);
      localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS, JSON.stringify(existingSubmissions));
      
      toast({ 
        title: "Schedule Submitted!", 
        description: `Your term schedule with ${courses.length} course(s) has been sent for review.`
      });
    } catch (error) {
      console.error("Error saving schedule submission to localStorage:", error);
      toast({
        title: "Submission Error",
        description: "Could not submit your schedule. Please try again.",
        variant: "destructive"
      });
    }
  };

  const effectiveTakenCourseCodes = useMemo(() => {
    const takenCodes = mockTakenCourses.map(c => c.courseCode);
    const plannedCodes = courses.map(c => c.courseCode);
    return [...new Set([...takenCodes, ...plannedCodes])];
  }, [mockTakenCourses, courses]);


  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center gap-4 border-b border-border pb-6 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Student Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Welcome, {studentName}. Your supervisor is: <span className="font-semibold text-primary">Dr. Louai Maghrabi</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            variant="default"
            className="shadow-sm hover:shadow-lg transition-shadow w-full sm:w-auto"
            onClick={() => setIsTalkToSupervisorOpen(!isTalkToSupervisorOpen)}
            aria-expanded={isTalkToSupervisorOpen}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Talk with Supervisor
            {isTalkToSupervisorOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {isTalkToSupervisorOpen && (
        <Card className="shadow-xl border-2 border-primary/30 bg-card animate-in fade-in-50 slide-in-from-top-5 duration-300 mb-6 sm:mb-8">
          <CardHeader className="bg-muted/50 border-b border-primary/20">
            <CardTitle className="flex items-center gap-2.5 text-xl text-primary"><CalendarDays className="h-6 w-6"/>Request a Meeting</CardTitle>
            <CardDescription>Select an available time slot and add any notes for your supervisor. They will be notified of your request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <label htmlFor="meeting-slot" className="block text-sm font-medium text-foreground mb-1.5">Available Time Slots</label>
              <Select onValueChange={setSupervisorMeetingSlot} value={supervisorMeetingSlot}>
                <SelectTrigger id="meeting-slot" className="w-full text-base py-2.5">
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {mockMeetingSlots.map(slot => (
                    <SelectItem key={slot} value={slot} className="text-base py-2.5">{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="supervisor-notes" className="block text-sm font-medium text-foreground mb-1.5">Notes for Supervisor (Optional)</label>
              <Textarea
                id="supervisor-notes"
                placeholder="e.g., I'd like to discuss my course load, specific course choices for next term, or get advice on balancing prerequisites..."
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                rows={4}
                className="text-base"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-primary/20 pt-5 pb-5 flex flex-col sm:flex-row justify-end gap-3 bg-muted/30">
            <Button variant="outline" onClick={() => setIsTalkToSupervisorOpen(false)} size="lg" className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleRequestSupervisorMeeting} size="lg" className="w-full sm:w-auto"><Send className="mr-2 h-4 w-4"/>Request Meeting</Button>
          </CardFooter>
        </Card>
      )}

      {isScheduleAccepted && (
         <Alert variant="default" className="border-green-600 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 dark:border-green-600/50 shadow-lg">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="font-bold text-lg">Schedule Approved!</AlertTitle>
            <AlertDescription className="text-base mt-1">
              Your term plan has been approved by your supervisor. No further changes can be made.
            </AlertDescription>
        </Alert>
      )}

      {courses.length > 0 &&
        <Card className="shadow-xl border-2 border-primary/20 bg-card">
          <CardHeader className="bg-muted/30 border-b border-primary/10">
            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-semibold text-primary">
              <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8" />
              Current Term Plan
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1 text-muted-foreground">
              {isScheduleAccepted
                ? "This is your supervisor-approved schedule for the upcoming term."
                : "These are the courses in your plan for the upcoming term."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Instructor</TableHead>
                    {!isScheduleAccepted && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map(course => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell>{course.credits}</TableCell>
                      <TableCell>{course.instructor}</TableCell>
                      {!isScheduleAccepted && 
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="h-4 w-4 mr-1"/> Remove
                          </Button>
                        </TableCell>
                      }
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
          {!isScheduleAccepted &&
            <CardFooter className="bg-muted/30 border-t border-primary/10 p-4 flex justify-end">
              <Button
                size="lg"
                variant="default"
                className="shadow-sm hover:shadow-lg transition-shadow"
                onClick={handleSubmitSchedule}
              >
                <SendToBack className="mr-2 h-5 w-5" />
                Submit Schedule to Supervisor
              </Button>
            </CardFooter>
          }
        </Card>
      }

      {!isScheduleAccepted && (
        <Card className="shadow-xl border-2 border-purple-500/20 bg-card">
          <CardHeader className="bg-purple-500/10 border-b border-purple-500/10">
            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-semibold text-purple-600 dark:text-purple-400">
              <BookMarked className="h-7 w-7 sm:h-8 sm:w-8" />
              Open this Term
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1 text-muted-foreground">
              Select from your available courses below to add them to your term plan.
            </CardDescription>
             <div className="relative pt-3">
                <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transform translate-y-1.5" />
                <Input
                  placeholder="Search by name, code, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 sm:pl-11 py-2 sm:py-2.5 text-sm sm:text-base"
                />
              </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-72">
                {filteredCatalogCourses.length > 0 ? (
                  <ul className="space-y-0 divide-y">
                    {filteredCatalogCourses.map(course => (
                      <li key={course.id} className="p-3 rounded-md hover:bg-muted/30 transition-colors">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            <Label className="font-semibold text-base flex-grow mb-2 sm:mb-0">
                              {course.courseCode}: {course.name}
                            </Label>
                            <Button size="sm" variant="outline" onClick={() => handleAddCourseFromCatalog(course)}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add to Schedule
                            </Button>
                          </div>
                          <div className="grid gap-1.5 mt-2 text-xs">
                            <p className="text-muted-foreground leading-normal pr-4">{course.description}</p>
                            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                              <span>Credits: <Badge variant="secondary" className="font-medium">{course.credits}</Badge></span>
                              {course.department && <span>Dept: <Badge variant="outline" className="font-medium">{course.department}</Badge></span>}
                               {course.prerequisites.length > 0 && <span>Prereqs: <Badge variant="outline" className="font-medium">{course.prerequisites.join(', ')}</Badge></span>}
                            </div>
                          </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground italic p-4 text-center">No recommended courses available for this term, or all have been added.</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      <Accordion type="multiple" defaultValue={['plan', 'progress']} className="w-full space-y-4 sm:space-y-5">
        <AccordionItem value="plan" className="border-2 border-primary/15 rounded-xl shadow-md bg-card hover:shadow-lg transition-shadow overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-5 py-3 sm:py-4 hover:no-underline text-lg sm:text-xl font-semibold text-foreground bg-muted/40 hover:bg-muted/60 transition-colors data-[state=closed]:rounded-b-lg">
                <div className="flex items-center gap-3 text-primary">
                <Target className="h-5 w-5 sm:h-6 sm:w-6" /> Recommended Term Plan (AI Mock)
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-primary/15">
                {mockRecommendedPlan && mockRecommendedPlan.courses.length > 0 ? (
                  <div className="space-y-4">
                    <ul className="space-y-2.5 pt-2">
                        {mockRecommendedPlan.courses.map(course => (
                            <li key={`rec-${course.id}`} className="flex flex-col sm:flex-row justify-between sm:items-center p-2.5 rounded-md bg-muted/40 border">
                            <span className="text-foreground mb-1 sm:mb-0">{course.name} ({course.courseCode})</span>
                            <span>({course.credits} credits)</span>
                          </li>
                        ))}
                    </ul>
                    <div>
                      <h4 className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/80"><Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500"/>AI Reasoning</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground p-3 bg-muted/60 rounded-md border shadow-inner italic">
                          "{mockRecommendedPlan.reasoning}"
                      </p>
                    </div>
                  </div>
                ) : <p className="text-muted-foreground pt-3 text-center py-6 text-sm sm:text-base">No AI recommendations available for your current year.</p>}
            </AccordionContent>
        </AccordionItem>

        <AccordionItem value="progress" className="border-2 border-purple-500/15 rounded-xl shadow-md bg-card hover:shadow-lg transition-shadow overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-5 py-3 sm:py-4 hover:no-underline text-lg sm:text-xl font-semibold text-foreground bg-purple-500/10 hover:bg-purple-500/20 transition-colors rounded-t-lg data-[state=closed]:rounded-b-lg">
                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" /> My Academic Progress
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0 sm:p-0 flex flex-col border-t border-purple-500/15">
              <Accordion type="multiple" defaultValue={['taken', 'remaining']} className="w-full">
                <AccordionItem value="taken" className="border-b-0">
                  <AccordionTrigger className="px-4 py-3 text-md sm:text-lg font-medium hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600"/> Courses Taken
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-3 border-t">
                      <ul className="space-y-2.5">
                        {mockTakenCourses.map(course => (
                          <li key={course.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-2.5 rounded-md bg-muted/40 border">
                            <span className="text-foreground mb-1 sm:mb-0">{course.name} ({course.courseCode})</span>
                            <div className="space-x-2 flex items-center">
                              <Badge variant="secondary">{course.grade}</Badge>
                              <span>({course.credits} credits)</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="remaining" className="border-b-0">
                   <AccordionTrigger className="px-4 py-3 text-md sm:text-lg font-medium hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"/> Remaining in Plan
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 sm:px-0 pb-4 sm:pb-5 pt-3 border-t">
                    {mockRemainingCourses.length > 0 ? (
                      <div className="w-full h-[500px] bg-background">
                         <CourseFlowchart 
                            allCourses={courseCatalog} 
                            takenCourseCodes={effectiveTakenCourseCodes}
                            remainingCourses={mockRemainingCourses}
                         />
                      </div>
                    ) : <p className="text-sm text-muted-foreground italic p-3 text-center">No courses remaining or plan not defined.</p>}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

    

    

    