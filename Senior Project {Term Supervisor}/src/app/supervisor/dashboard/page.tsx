
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Users, BookOpenCheck, ClipboardList, UserCircle, FileText, Target, MessageSquareWarning, Star, Info as InfoIcon, BookUser as InstructorIcon, ListFilter, Search, Mail, CalendarCheck, Trash2, Clock, Handshake, AlertOctagon, UserCheck, UserX, GraduationCap, Edit3, CheckCircle, ListChecks, BookMarked, Brain, MessageCircleQuestion, ThumbsUp, ThumbsDown, Check, FileCheck2, SendToBack, PackageCheck, Calendar as CalendarIcon, Eye, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import type { Course, MeetingRequest, StudentScheduleSubmission, MockStudent, LoggedInUser, MockStudentCourseDisplay, RecommendedPlan } from '@/types'; 
import { Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isSameDay, startOfToday } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { deriveDateForSlot } from '@/lib/utils';
import { courseCatalog } from '@/data/course-catalog';
import CourseFlowchart from '@/components/course/course-flowchart';


const coursesByYear: {[key: number]: string[]} = {
    1: ['MATH 101', 'CHEM 101', 'PHYS 101', 'ISLS 101', 'ARAB 101', 'ENG 101', 'MATH 102', 'SE 201', 'ISLS 201', 'ARAB 201', 'ENG 102', 'GE 202'],
    2: ['MATH 203', 'PHYS 102', 'SE 203', 'SE 206', 'SE 204', 'SE 308', 'ISLS 301', 'SOC 140', 'MATH 241', 'SE 205', 'IE 201'],
    3: ['SE 311', 'SE 312', 'SE 310', 'SE 309', 'SE 307', 'SE 313', 'SE 314', 'SE 315', 'SE 316', 'BUS 351', 'IE 331', 'SE 421'],
    4: ['SE 419', 'SE 418', 'SE 420', 'SE 499'],
};

const getCoursesForYear = (year: number) => {
    let courses: string[] = [];
    // A student in year `Y` has completed all courses for years 1 through `Y-1`.
    for (let i = 1; i < year; i++) {
        courses = courses.concat(coursesByYear[i] || []);
    }
    return courses;
};

const generateStudentProgress = (studentName: string, year: number) => {
    const takenCourseCodes = getCoursesForYear(year);
    const allCourseCodes = Object.values(coursesByYear).flat();
    const remainingCourseCodes = allCourseCodes.filter(code => !takenCourseCodes.includes(code));
    
    return {
        takenCourses: courseCatalog
            .filter(c => takenCourseCodes.includes(c.courseCode))
            .map(c => ({ ...c, grade: 'A-' })),
        remainingCourses: courseCatalog
            .filter(c => remainingCourseCodes.includes(c.courseCode))
            .map(c => ({...c})),
    };
};

const generateRecommendedPlan = (year: number): RecommendedPlan => {
    const recommendedCourseCodes = coursesByYear[year] || [];
    let plan: RecommendedPlan;
    
    switch(year) {
        case 1:
            plan = {
                courses: courseCatalog.filter(c => ['MATH 101', 'ENG 101', 'PHYS 101', 'SE 201', 'ISLS 101'].includes(c.courseCode)),
                reasoning: "As a first-year student, this plan establishes a strong foundation. It balances core requirements like MATH 101 and PHYS 101 with the first introductory software engineering course (SE 201), setting the stage for future success. The credit load is manageable for a first term."
            };
            break;
        case 2:
            plan = {
                courses: courseCatalog.filter(c => ['MATH 203', 'PHYS 102', 'SE 203', 'SE 206', 'IE 201'].includes(c.courseCode)),
                reasoning: "Building on first-year fundamentals, this plan introduces critical second-year courses. Data Structures (SE 203) and System Programming (SE 206) are essential prerequisites for nearly all future SE courses, making them a priority. MATH 203 and PHYS 102 continue the required science sequence."
            };
            break;
        case 3:
            plan = {
                courses: courseCatalog.filter(c => ['SE 311', 'SE 312', 'SE 310', 'SE 307', 'IE 331'].includes(c.courseCode)),
                reasoning: "Now in the third year, the focus shifts to core software engineering specializations. This plan includes Operating Systems (SE 311) and Web Engineering (SE 310), which are key skill areas. It's balanced with Software Design and Architecture (SE 307) to ensure a strong theoretical and practical foundation for the senior year."
            };
            break;
        case 4:
            plan = {
                courses: courseCatalog.filter(c => ['SE 419', 'SE 418', 'SE 420', 'SE 499'].includes(c.courseCode)),
                reasoning: "This plan is strategically designed for the final year to ensure all graduation requirements are met. The highest priority is the Senior Project (SE 499). This is paired with essential high-level courses like Distributed Systems and Information Security to round out the student's expertise before graduation."
            };
            break;
        default:
            plan = {
                courses: [],
                reasoning: "No recommendation available. Please verify the student's academic year."
            };
    }
    
    // Ensure it respects the 3-6 course rule, though the mocks are designed to.
    if (plan.courses.length > 6) plan.courses = plan.courses.slice(0, 6);
    if (plan.courses.length < 3 && year > 0 && year <= 4) {
        // Simple logic to add more courses if below minimum, in a real scenario this would be more complex
        const currentCodes = new Set(plan.courses.map(c => c.courseCode));
        const potentialAdditions = courseCatalog.filter(c => recommendedCourseCodes.includes(c.courseCode) && !currentCodes.has(c.courseCode));
        const numToAdd = 3 - plan.courses.length;
        plan.courses.push(...potentialAdditions.slice(0, numToAdd));
    }
    
    return plan;
};


const mockStudentsDataInit: MockStudent[] = [
  {
    id: 'student1_id', 
    name: 'student1',
    program: 'B.Sc. Software Engineering',
    avatarUrl: 'https://picsum.photos/seed/s1/80/80',
    dataAihint: "person avatar",
    status: 'Active',
    year: 1,
    currentPlan: [],
    recommendedPlan: generateRecommendedPlan(1),
    academicProgress: generateStudentProgress('student1', 1),
    supervisorNotes: "First year student, needs to select initial courses for their first term.",
    lastActivity: "Created account 1 week ago",
    studentMeetingNotes: "I'd like to discuss my first term schedule."
  },
  {
    id: 'student2_id', 
    name: 'student2',
    program: 'B.Sc. Software Engineering',
    avatarUrl: 'https://picsum.photos/seed/s2/80/80',
    dataAihint: "engineer student",
    status: 'Active',
    year: 2,
    currentPlan: [],
    recommendedPlan: generateRecommendedPlan(2),
    academicProgress: generateStudentProgress('student2', 2),
    supervisorNotes: "Second year student. Progressing as expected. Needs to plan for the upcoming year.",
    lastActivity: "Updated plan 5 days ago",
  },
  {
    id: 'student3_id', 
    name: 'student3', 
    program: 'B.Sc. Software Engineering',
    avatarUrl: 'https://picsum.photos/seed/s3/80/80',
    dataAihint: "art student",
    status: 'Active',
    year: 3,
    currentPlan: [],
    recommendedPlan: generateRecommendedPlan(3),
    academicProgress: generateStudentProgress('student3', 3),
    supervisorNotes: "Third year. Important to select track-related electives soon.",
    lastActivity: "Active last week"
  },
  {
    id: 'student4_id',
    name: 'student4',
    program: 'B.Sc. Software Engineering',
    avatarUrl: 'https://picsum.photos/seed/s4/80/80',
    dataAihint: 'biology student',
    status: 'Active',
    year: 4,
    currentPlan: [],
    recommendedPlan: generateRecommendedPlan(4),
    academicProgress: generateStudentProgress('student4', 4),
    supervisorNotes: 'Final year student. Needs to focus on senior project (SE 499) and track completion.',
    lastActivity: 'Submitted plan for review 2 days ago',
    studentMeetingNotes: 'Discussing my final year project and graduation requirements.'
  }
];

const mockPostGradCourseRequests = [
    { id: 'req1', studentName: 'Diana Prince (Alumni)', courseName: 'Advanced Pottery Seminar', reason: 'Interested in further developing skills for a personal project.'},
    { id: 'req2', studentName: 'Clark Kent (Alumni)', courseName: 'Astrophysics Today (Guest Lecture Series)', reason: 'Keeping up with field advancements for career.'}
];

const LOCAL_STORAGE_KEY_MEETING_REQUESTS = 'termSupervisorMeetingRequests_v1';
const LOCAL_STORAGE_KEY_SUPERVISOR_STUDENTS = 'termSupervisorStudents_v1'; 
const LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS = 'termSupervisorSubmissions_v1';
const LOCAL_STORAGE_KEY_ACCEPTED_SCHEDULE_PREFIX = 'acceptedSchedule_';


const CourseListItem: React.FC<{ course: MockStudentCourseDisplay, type?: 'taken' | 'planned' | 'remaining' | 'submitted' | 'current' }> = ({ course, type }) => (
  <li className="py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors px-4 -mx-4 rounded-lg group">
    <div className="flex justify-between items-start">
        <span className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">{course.name}</span>
        {type === 'taken' && course.grade && ( 
            <Badge variant="secondary" className="font-semibold text-xs ml-2">{course.grade}</Badge>
        )}
    </div>
    <div className="text-xs sm:text-sm text-muted-foreground space-x-3 mt-1.5 flex flex-wrap items-center gap-y-1">
      <span>
        <Star className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
        <Badge variant="outline" className="font-normal text-xs">{course.credits} credits</Badge>
      </span>
      {(type === 'planned' || type === 'submitted' || type === 'current') && course.instructor && (
        <span className="flex items-center">
          <InstructorIcon className="h-3.5 w-3.5 inline mr-1 text-accent" />
          <Badge variant="outline" className="font-normal text-xs">{course.instructor}</Badge>
        </span>
      )}
    </div>
    {(type === 'planned' || type === 'submitted' || type === 'current') && course.sectionDetails &&
      <p className="text-xs text-muted-foreground mt-2 flex items-start">
        <InfoIcon className="h-3.5 w-3.5 inline mr-1.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">{course.sectionDetails}</span>
      </p>
    }
  </li>
);

interface CalendarEvent {
  date: Date;
  title: string; // e.g., "10:00 AM - Student Name"
  studentName: string;
  slot: string;
  meetingId: string;
}

export default function SupervisorDashboardPage() {
  const [students, setStudents] = useState<MockStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<MockStudent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [scheduleSubmissions, setScheduleSubmissions] = useState<StudentScheduleSubmission[]>([]);
  const [supervisorNoteInput, setSupervisorNoteInput] = useState('');
  const [aiInsightInput, setAiInsightInput] = useState<string | null>("Select a student to view AI-generated insights for their plan.");
  const { toast } = useToast();

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // This effect now runs only once on mount to set the initial date
    if (!selectedCalendarDate) {
      setSelectedCalendarDate(startOfToday());
    }
  }, [selectedCalendarDate]);

  useEffect(() => {
    let initialStudents = mockStudentsDataInit;
    
    const refreshedStudents = initialStudents.map(student => {
      const acceptedScheduleKey = `${LOCAL_STORAGE_KEY_ACCEPTED_SCHEDULE_PREFIX}${student.name}`;
      const acceptedScheduleRaw = localStorage.getItem(acceptedScheduleKey);
      if (acceptedScheduleRaw) {
        try {
          const acceptedCourses: Course[] = JSON.parse(acceptedScheduleRaw);
          return { ...student, currentPlan: acceptedCourses, status: 'Active' };
        } catch (e) {
          console.error(`Error parsing accepted schedule for ${student.name}`, e);
        }
      }
      return student;
    });

    setStudents(refreshedStudents);

    if (refreshedStudents.length > 0) {
        // Find if a student was previously selected, otherwise default to first
        const reselectedStudentName = selectedStudent?.name || refreshedStudents[0].name;
        const reselected = refreshedStudents.find(s => s.name === reselectedStudentName) || refreshedStudents[0];
        setSelectedStudent(reselected);
    } else {
      setSelectedStudent(null);
    }
    
    loadMeetingRequests();
    loadScheduleSubmissions();
  }, []);

  useEffect(() => {
    if (students.length > 0) { 
        localStorage.setItem(LOCAL_STORAGE_KEY_SUPERVISOR_STUDENTS, JSON.stringify(students));
    }
  }, [students]);


  useEffect(() => {
    if (selectedStudent) {
      setSupervisorNoteInput(selectedStudent.supervisorNotes || '');
      const currentInsightIsStale = aiInsightInput === null || 
                                    aiInsightInput.startsWith("Select a student") || 
                                    aiInsightInput.startsWith("Insight") || 
                                    !aiInsightInput.includes(selectedStudent.name);

      if (currentInsightIsStale) {
         setAiInsightInput( () => { 
            const insights = [
                `Consider suggesting 'Data Visualization Techniques' for ${selectedStudent.name} if their plan includes many data-heavy courses.`,
                `Recommend 'Public Speaking Workshop' to ${selectedStudent.name} for improving presentation skills.`,
                `Check if prerequisites for 'Advanced Quantum Mechanics' are fully met in ${selectedStudent.name}'s plan.`,
                `${selectedStudent.name}'s workload seems high, suggest discussing priorities.`,
                `Encourage ${selectedStudent.name} to explore relevant internships this summer.`,
                `Suggest 'Technical Writing for Engineers' to complement ${selectedStudent.name}'s current coursework.`
            ];
            return insights[Math.floor(Math.random() * insights.length)];
         });
      }
    } else {
      setSupervisorNoteInput('');
      setAiInsightInput("Select a student to view AI-generated insights for their plan."); 
    }
  }, [selectedStudent]); 

  useEffect(() => {
    const accepted = meetingRequests.filter(req => req.status === 'accepted');
    const events: CalendarEvent[] = accepted.flatMap(req => {
      const eventDate = deriveDateForSlot(req.slot, req.timestamp);
      if (eventDate) {
        return [{
          date: eventDate,
          title: `${format(eventDate, 'p')} - ${req.studentName}`,
          studentName: req.studentName,
          slot: req.slot,
          meetingId: req.id,
        }];
      }
      return [];
    });
    setCalendarEvents(events);
  }, [meetingRequests]);

  const loadMeetingRequests = () => {
    try {
        const storedRequestsRaw = localStorage.getItem(LOCAL_STORAGE_KEY_MEETING_REQUESTS);
        if (storedRequestsRaw) {
            const parsedRequests: MeetingRequest[] = JSON.parse(storedRequestsRaw);
            setMeetingRequests(
                parsedRequests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            );
        } else {
            setMeetingRequests([]);
        }
    } catch (error) {
        console.error("Failed to parse meeting requests from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY_MEETING_REQUESTS);
    }
};

  const loadScheduleSubmissions = () => {
    try {
        const storedSubmissionsRaw = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS);
        if (storedSubmissionsRaw) {
            const parsedSubmissions: StudentScheduleSubmission[] = JSON.parse(storedSubmissionsRaw);
            setScheduleSubmissions(
                parsedSubmissions.filter(sub => sub.status === 'pending')
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            );
        } else {
            setScheduleSubmissions([]);
        }
    } catch (error) {
        console.error("Failed to parse schedule submissions from localStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS);
    }
};

  const updateMeetingRequestStatus = (requestId: string, newStatus: MeetingRequest['status']) => {
    try {
      const allStoredRequestsRaw = localStorage.getItem(LOCAL_STORAGE_KEY_MEETING_REQUESTS);
      if (allStoredRequestsRaw) {
          let allStoredRequests: MeetingRequest[] = JSON.parse(allStoredRequestsRaw);
          const requestIndex = allStoredRequests.findIndex(req => req.id === requestId);
          
          if (requestIndex > -1) {
            allStoredRequests[requestIndex] = { ...allStoredRequests[requestIndex], status: newStatus };
            localStorage.setItem(LOCAL_STORAGE_KEY_MEETING_REQUESTS, JSON.stringify(allStoredRequests));
            loadMeetingRequests(); 
            toast({ 
              title: `Request ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`, 
              description: `The meeting request has been marked as ${newStatus}.` 
            });
          }
      }
    } catch (error) {
      console.error(`Error updating meeting request to ${newStatus}:`, error);
      toast({ title: "Error", description: "Could not update the request status.", variant: "destructive" });
    }
  };

  const handleAcceptScheduleSubmission = (submission: StudentScheduleSubmission) => {
    try {
        // Update submissions list
        const allStoredSubmissionsRaw = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS);
        let allStoredSubmissions: StudentScheduleSubmission[] = allStoredSubmissionsRaw ? JSON.parse(allStoredSubmissionsRaw) : [];
        allStoredSubmissions = allStoredSubmissions.map(sub =>
            sub.id === submission.id ? { ...sub, status: 'accepted' } : sub
        );
        localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULE_SUBMISSIONS, JSON.stringify(allStoredSubmissions));

        // Set the accepted schedule for the student
        localStorage.setItem(`${LOCAL_STORAGE_KEY_ACCEPTED_SCHEDULE_PREFIX}${submission.studentName}`, JSON.stringify(submission.submittedCourses));

        // Update the main students state on the supervisor dashboard
        const updatedStudents = students.map(s =>
            s.name === submission.studentName
                ? { ...s, currentPlan: submission.submittedCourses, status: 'Active', lastActivity: 'Schedule accepted' }
                : s
        );
        setStudents(updatedStudents);
        
        // If the accepted student is the one currently selected, update the selectedStudent state too
        if (selectedStudent && selectedStudent.name === submission.studentName) {
            setSelectedStudent(prev => prev ? { ...prev, currentPlan: submission.submittedCourses, status: 'Active', lastActivity: 'Schedule accepted' } : null);
        }

        // Refresh the pending submissions list
        loadScheduleSubmissions();

        toast({
            title: "Schedule Accepted!",
            description: `${submission.studentName}'s schedule has been approved and is now their current plan.`
        });

    } catch (error) {
        console.error(`Error accepting schedule submission:`, error);
        toast({ title: "Error", description: "Could not accept the schedule submission.", variant: "destructive" });
    }
};


  const handleStudentStatusChange = (studentId: string, newStatus: 'Active' | 'Pending Approval' | 'Graduated') => {
    setStudents(prevStudents => prevStudents.map(s => s.id === studentId ? {...s, status: newStatus, lastActivity: `Status changed to ${newStatus}`} : s));
    setSelectedStudent(prevSelected => prevSelected && prevSelected.id === studentId ? {...prevSelected, status: newStatus} : prevSelected);
    toast({title: "Student Status Updated", description: `${students.find(s=>s.id === studentId)?.name || 'Student'} has been marked as ${newStatus}.`});
  };

  const handleSaveSupervisorNotes = () => {
    if (!selectedStudent) return;
    setStudents(prevStudents => prevStudents.map(s => s.id === selectedStudent.id ? {...s, supervisorNotes: supervisorNoteInput, lastActivity: 'Supervisor notes updated'} : s));
    setSelectedStudent(prev => prev ? {...prev, supervisorNotes: supervisorNoteInput} : null);
    toast({title: "Notes Saved", description: "Your notes for this student have been updated."});
  };

  const handleUseInsight = () => {
    if (selectedStudent && aiInsightInput && !aiInsightInput.startsWith("Select a student") && aiInsightInput !== "Insight used." && aiInsightInput !== "Insight dismissed.") {
      setSupervisorNoteInput(prev => `${prev}${prev ? '\n\n' : ''}AI Insight: ${aiInsightInput}`);
      setAiInsightInput("Insight used."); 
      toast({ title: "Insight Used", description: "AI insight has been added to your notes." });
    } else {
      toast({ title: "No Insight", description: "No actionable AI insight available to use or already processed.", variant: "default" });
    }
  };

  const handleDismissInsight = () => {
     if (selectedStudent && aiInsightInput && !aiInsightInput.startsWith("Select a student") && aiInsightInput !== "Insight used." && aiInsightInput !== "Insight dismissed.") {
        setAiInsightInput("Insight dismissed.");
        toast({ title: "Insight Dismissed", description: "AI insight has been dismissed." });
     } else {
        toast({ title: "No Insight", description: "No AI insight to dismiss.", variant: "default" });
     }
  };


  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.program.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingMeetingRequests = meetingRequests.filter(req => req.status === 'pending');
  
  const hasGraduatedStudents = useMemo(() => students.some(s => s.status === 'Graduated'), [students]);

  const meetingsOnSelectedDay = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return calendarEvents.filter(ev => isSameDay(ev.date, selectedCalendarDate));
  }, [selectedCalendarDate, calendarEvents]);


  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-12 pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Supervisor Dashboard</h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl sm:max-w-2xl mx-auto">
          Oversee student term plans, manage approvals, and provide guidance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-0 lg:gap-x-8 gap-y-8 sm:gap-y-10 items-start">
         <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col">
            <Card className="flex flex-col bg-card shadow-xl border-2 border-primary/20 w-full">
              <CardHeader className="pb-4 flex-shrink-0 border-b border-border/70 bg-muted/30">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl text-primary">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                  My Students
                </CardTitle>
                 <div className="relative pt-3">
                  <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transform translate-y-1.5" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 sm:pl-11 py-2 sm:py-2.5 text-sm sm:text-base"
                  />
                </div>
              </CardHeader>
              <ScrollArea className="flex-grow min-h-0 max-h-[calc(100vh-22rem)]">
                <CardContent className="space-y-1.5 p-2 sm:p-2.5">
                  {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-lg group transition-all duration-150 ease-in-out border flex items-start gap-3 sm:gap-3.5
                          ${selectedStudent?.id === student.id 
                            ? 'bg-primary/15 ring-2 ring-primary/70 shadow-lg border-primary/30' 
                            : 'hover:bg-muted/70 border-transparent hover:border-border'
                          }`}
                    >
                      <Image 
                        src={student.avatarUrl || 'https://placehold.co/80x80.png'} 
                        data-ai-hint={student.dataAihint || "person avatar"} 
                        alt={student.name} 
                        width={48} 
                        height={48} 
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-border group-hover:border-primary/50 transition-colors shadow-sm" />
                      <div className="flex-grow">
                        <span className={`font-semibold text-md sm:text-lg ${selectedStudent?.id === student.id ? 'text-primary' : 'text-foreground'}`}>{student.name}</span>
                        <p className={`text-xs sm:text-sm ${selectedStudent?.id === student.id ? 'text-primary/80' : 'text-muted-foreground'} group-hover:text-foreground/80`}>{student.program}</p>
                         <Badge variant={student.status === 'Active' ? 'default' : student.status === 'Pending Approval' ? 'secondary' : 'outline'} className="mt-1.5 text-xs">
                           {student.status}
                         </Badge>
                      </div>
                    </button>
                  )) : (
                    <p className="text-muted-foreground text-center py-6 text-sm sm:text-base">No students found.</p>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
        </div>

        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          <Card className="shadow-xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10">
            <CardHeader className="bg-blue-500/10 dark:bg-blue-500/20 border-b border-blue-500/30">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl text-blue-700 dark:text-blue-300">
                <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                Calendar & Scheduled Meetings
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-blue-600/80 dark:text-blue-400/80 mt-1">
                View today and upcoming accepted student meetings. Click on a day to see details.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 px-3 sm:px-4 md:px-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
              <div className="flex justify-center md:justify-start">
                <Calendar
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={setSelectedCalendarDate}
                  className="rounded-md border shadow-md bg-card p-0"
                  modifiers={{ scheduled: calendarEvents.map(ev => ev.date) }}
                  modifiersClassNames={{ scheduled: 'bg-accent text-accent-foreground font-bold' }}
                  disabled={(date) => date < startOfToday() }
                />
              </div>
              <div className="mt-4 md:mt-0">
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  {selectedCalendarDate ? `Meetings for ${format(selectedCalendarDate, 'PPP')}` : 'Select a day to see meetings'}
                </h3>
                {selectedCalendarDate && meetingsOnSelectedDay.length > 0 ? (
                  <ScrollArea className="max-h-60">
                    <ul className="space-y-3 pr-2">
                      {meetingsOnSelectedDay.map(event => (
                        <li key={event.meetingId} className="p-3 border rounded-md bg-muted/50 shadow-sm">
                          <p className="font-medium text-sm text-foreground">{format(event.date, 'p')} - {event.studentName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{event.slot}</p>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : selectedCalendarDate ? (
                  <p className="text-sm text-muted-foreground italic">No meetings scheduled for this day.</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Click on a calendar day to view scheduled meetings.</p>
                )}
              </div>
            </CardContent>
          </Card>


          {pendingMeetingRequests.length > 0 && (
            <Card className="shadow-xl border-2 border-accent/50 bg-accent/5 dark:bg-accent/10">
              <CardHeader className="bg-accent/10 dark:bg-accent/20 border-b border-accent/30">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl text-accent-foreground dark:text-accent">
                  <Handshake className="h-6 w-6 sm:h-7 sm:w-7"/> Pending Meeting Requests ({pendingMeetingRequests.length})
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-accent-foreground/80 dark:text-accent/80 mt-1">Review student meeting requests.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 pb-3 px-3 sm:px-4 md:px-5">
                <ScrollArea className="max-h-[20rem] sm:max-h-[28rem] pr-2 -mr-2">
                  <div className="space-y-4">
                    {pendingMeetingRequests.map(req => (
                      <Card key={req.id} className="shadow-lg border bg-card hover:shadow-xl transition-shadow flex flex-col">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div>
                            <CardTitle className="text-md sm:text-lg font-semibold">
                              {req.studentName} - <span className="font-medium text-primary">{req.slot}</span>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              Requested: {format(parseISO(req.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </CardDescription>
                          </div>
                           <Badge variant="outline" className="font-medium text-xs whitespace-nowrap mt-1 sm:mt-0">
                              <Clock className="mr-1.5 h-3.5 w-3.5"/> Pending
                            </Badge>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-sm text-foreground bg-muted/50 p-3 sm:p-3.5 rounded-md border border-border/70 shadow-inner whitespace-pre-wrap leading-relaxed">
                            {req.notes}
                          </p>
                        </CardContent>
                        <CardFooter className="border-t pt-4 pb-4 flex flex-col sm:flex-row justify-end gap-2 mt-auto">
                           <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" onClick={() => updateMeetingRequestStatus(req.id, 'accepted')}>
                            <CheckCircle className="mr-1.5 h-4 w-4"/> Accept Request
                          </Button>
                           <Button variant="destructive" size="sm" onClick={() => updateMeetingRequestStatus(req.id, 'addressed')} className="w-full sm:w-auto">
                            <Trash2 className="mr-1.5 h-4 w-4"/> Dismiss Request
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

           {scheduleSubmissions.length > 0 && (
            <Card className="shadow-xl border-2 border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10">
              <CardHeader className="bg-blue-500/10 dark:bg-blue-500/20 border-b border-blue-500/30">
                <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl text-blue-700 dark:text-blue-300">
                  <SendToBack className="h-6 w-6 sm:h-7 sm:w-7"/> Pending Schedule Submissions ({scheduleSubmissions.length})
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-blue-600/80 dark:text-blue-400/80 mt-1">Review student-submitted term schedules.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 pb-3 px-3 sm:px-4 md:px-5">
                <ScrollArea className="max-h-[28rem] pr-2 -mr-2">
                  <div className="space-y-4">
                    {scheduleSubmissions.map(sub => (
                      <Card key={sub.id} className="shadow-lg border bg-card hover:shadow-xl transition-shadow flex flex-col">
                        <CardHeader className="pb-3">
                           <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div>
                                <CardTitle className="text-md sm:text-lg font-semibold">{sub.studentName}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                Submitted: {format(parseISO(sub.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="font-medium text-xs whitespace-nowrap mt-1 sm:mt-0">
                                <Clock className="mr-1.5 h-3.5 w-3.5"/> Pending Review
                            </Badge>
                           </div>
                           <p className="text-xs text-muted-foreground mt-2">Courses: {sub.submittedCourses.length} | Total Credits: {sub.submittedCourses.reduce((acc, c) => acc + c.credits, 0)}</p>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <h4 className="font-medium text-sm text-foreground mb-1.5">Submitted Courses:</h4>
                           {sub.submittedCourses.length > 0 ? (
                            <ScrollArea className="max-h-48 border rounded-md p-1 bg-muted/30">
                                <ul className="space-y-1 px-2 py-1">
                                {sub.submittedCourses.map(course => <CourseListItem key={`${course.id}-submission-${sub.id}`} course={course as Course} type="submitted"/>)}
                                </ul>
                            </ScrollArea>
                            ) : <p className="text-xs text-muted-foreground italic p-2">No courses in this submission.</p>}
                        </CardContent>
                        <CardFooter className="border-t pt-4 pb-4 flex flex-col sm:flex-row justify-end gap-2 mt-auto">
                           <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" onClick={() => handleAcceptScheduleSubmission(sub)}>
                            <PackageCheck className="mr-1.5 h-4 w-4"/> Accept Schedule
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          
          {hasGraduatedStudents && (
           <Card className="shadow-lg border-2 border-purple-500/30 bg-purple-500/5">
                <CardHeader className="bg-purple-500/10 border-b border-purple-500/20">
                    <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-purple-700 dark:text-purple-300">
                        <MessageCircleQuestion className="h-5 w-5 sm:h-6 sm:w-6" />
                        Post-Graduation Course Requests
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mt-0.5">
                        Requests from alumni for specific courses or workshops (mock data for graduated students).
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 px-3 sm:px-4 md:px-5">
                    {mockPostGradCourseRequests.length > 0 ? (
                        <ScrollArea className="max-h-60">
                        <ul className="space-y-3 pr-2">
                            {mockPostGradCourseRequests.map(req => (
                                <li key={req.id} className="p-3 border rounded-md bg-card shadow-sm">
                                    <p className="font-semibold text-sm sm:text-base text-foreground">{req.courseName}</p>
                                    <p className="text-xs text-muted-foreground">Requested by: {req.studentName}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 italic">"{req.reason}"</p>
                                </li>
                            ))}
                        </ul>
                        </ScrollArea>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No post-graduation course requests at this time.</p>
                    )}
                </CardContent>
            </Card>
          )}


          {selectedStudent ? (
            <>
              <Card className="shadow-xl border-2 border-primary/20">
                <CardHeader className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-4 sm:p-6 bg-muted/30 border-b border-primary/10">
                  {selectedStudent.avatarUrl ? (
                     <Image src={selectedStudent.avatarUrl} data-ai-hint={selectedStudent.dataAihint || "person avatar"} alt={selectedStudent.name} width={60} height={60} className="w-14 h-14 sm:w-18 sm:h-18 rounded-full shadow-lg border-4 border-background" />
                  ) : (
                     <UserCircle className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
                  )}
                  <div className="text-center sm:text-left">
                    <CardTitle className="text-2xl sm:text-3xl font-semibold text-foreground">
                      {selectedStudent.name}
                    </CardTitle>
                    <CardDescription className="text-md sm:text-lg text-muted-foreground mt-1">Program: {selectedStudent.program} <Badge variant={selectedStudent.status === 'Active' ? 'default' : selectedStudent.status === 'Pending Approval' ? 'secondary' : 'outline'} className="ml-2 text-xs sm:text-sm align-middle">{selectedStudent.status}</Badge></CardDescription>
                  </div>
                </CardHeader>
              </Card>

              <Accordion type="multiple" defaultValue={['academic-progress', 'current-plan', 'supervisor-notes-ai']} className="w-full space-y-4 sm:space-y-5">
                <AccordionItem value="academic-progress" className="border-2 border-purple-500/15 rounded-xl shadow-md bg-card hover:shadow-lg transition-shadow overflow-hidden">
                    <AccordionTrigger className="px-4 sm:px-5 py-3 sm:py-4 hover:no-underline text-lg sm:text-xl font-semibold text-foreground bg-purple-500/10 hover:bg-purple-500/20 transition-colors rounded-t-lg data-[state=closed]:rounded-b-lg">
                        <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" /> Student Academic Progress
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-purple-500/15">
                        {selectedStudent.academicProgress ? (
                            <div className="space-y-4 pt-2">
                                <div>
                                    <h4 className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/80"><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600"/>Courses Taken</h4>
                                    {selectedStudent.academicProgress.takenCourses.length > 0 ? (
                                        <ul className="space-y-1 pl-1">
                                            {selectedStudent.academicProgress.takenCourses.map(course => <CourseListItem key={`taken-${course.id}-${selectedStudent.id}`} course={course as MockStudentCourseDisplay} type="taken"/>)}
                                        </ul>
                                    ) : <p className="text-xs text-muted-foreground italic p-2">No courses marked as taken.</p>}
                                </div>
                                <div className='mt-6'>
                                    <h4 className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/80"><ListChecks className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600"/>Remaining in Plan (Flowchart)</h4>
                                    {selectedStudent.academicProgress.remainingCourses.length > 0 ? (
                                       <div className="w-full h-[500px] bg-background border rounded-lg shadow-inner">
                                          <CourseFlowchart 
                                              allCourses={courseCatalog} 
                                              takenCourseCodes={selectedStudent.academicProgress.takenCourses.map(c => c.courseCode)}
                                              remainingCourses={selectedStudent.academicProgress.remainingCourses}
                                          />
                                      </div>
                                    ) : <p className="text-xs text-muted-foreground italic p-2">No courses marked as remaining in plan.</p>}
                                </div>
                            </div>
                        ) : <p className="text-muted-foreground pt-3 text-center py-6 text-sm sm:text-base">No academic progress data available for this student.</p>}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="current-plan" className="border-2 border-primary/15 rounded-xl shadow-md bg-card hover:shadow-lg transition-shadow overflow-hidden">
                  <AccordionTrigger className="px-4 sm:px-5 py-3 sm:py-4 hover:no-underline text-lg sm:text-xl font-semibold text-foreground bg-muted/40 hover:bg-muted/60 transition-colors rounded-t-lg data-[state=closed]:rounded-b-lg">
                    <div className="flex items-center gap-3 text-primary">
                      <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" /> Student's Current Term Plan
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-primary/15">
                    {selectedStudent.currentPlan && selectedStudent.currentPlan.length > 0 ? (
                      <ul className="space-y-1 pt-2">
                        {selectedStudent.currentPlan.map(course => (
                          <CourseListItem key={`${course.id}-current-${selectedStudent.id}`} course={course as MockStudentCourseDisplay} type="current" />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground pt-3 text-center py-6 text-sm sm:text-base">No courses planned by the student yet, or no accepted schedule.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recommended-plan" className="border-2 border-primary/15 rounded-xl shadow-md bg-card hover:shadow-lg transition-shadow overflow-hidden">
                  <AccordionTrigger className="px-4 sm:px-5 py-3 sm:py-4 hover:no-underline text-lg sm:text-xl font-semibold text-foreground bg-muted/40 hover:bg-muted/60 transition-colors data-[state=closed]:rounded-b-lg">
                     <div className="flex items-center gap-3 text-primary">
                        <Target className="h-5 w-5 sm:h-6 sm:w-6" /> Recommended Term Plan (AI Mock)
                     </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-primary/15">
                    {selectedStudent.recommendedPlan && selectedStudent.recommendedPlan.courses.length > 0 ? (
                       <div className="space-y-4">
                        <ul className="space-y-1 pt-2">
                            {selectedStudent.recommendedPlan.courses.map(course => (
                                <CourseListItem key={`${course.id}-recommended-${selectedStudent.id}`} course={course as MockStudentCourseDisplay} type="planned"/>
                            ))}
                        </ul>
                        <div>
                          <h4 className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/80"><Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500"/>AI Reasoning</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground p-3 bg-muted/60 rounded-md border shadow-inner italic">
                              "{selectedStudent.recommendedPlan.reasoning}"
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground pt-3 text-center py-6 text-sm sm:text-base">No specific AI recommendations available.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="supervisor-notes-ai" className="border-2 border-teal-500/20 rounded-xl shadow-md bg-card hover:shadow-lg transition-shadow overflow-hidden">
                    <AccordionTrigger className="px-4 sm:px-5 py-3 sm:py-4 hover:no-underline text-lg sm:text-xl font-semibold text-foreground bg-teal-500/10 hover:bg-teal-500/20 transition-colors data-[state=closed]:rounded-b-lg">
                       <div className="flex items-center gap-3 text-teal-600 dark:text-teal-400">
                          <Edit3 className="h-5 w-5 sm:h-6 sm:w-6" /> Supervisor Notes & AI Insights
                       </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-teal-500/20 space-y-6">
                       <p className="text-xs text-muted-foreground mb-3 -mt-2">
                        Review AI-generated insights for {selectedStudent.name}. You can incorporate these suggestions into your notes, dismiss them, or write your own observations independently.
                      </p>
                      {selectedStudent && aiInsightInput && !aiInsightInput.startsWith("Select a student") && aiInsightInput !== "Insight used." && aiInsightInput !== "Insight dismissed." && (
                        <div>
                            <h4 className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/90"><Brain className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500"/> AI Generated Insight (Mock)</h4>
                            <div className="text-xs sm:text-sm text-muted-foreground p-3 bg-muted/60 rounded-md border shadow-inner">
                                <p className="italic">{aiInsightInput}</p>
                            </div>
                            <div className="flex gap-2 mt-2.5">
                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 text-xs sm:text-sm" onClick={handleUseInsight}><ThumbsUp className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4"/> Use Insight</Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 text-xs sm:text-sm" onClick={handleDismissInsight}><ThumbsDown className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4"/> Dismiss</Button>
                            </div>
                        </div>
                      )}
                       {(aiInsightInput === "Insight used." || aiInsightInput === "Insight dismissed.") && (
                         <div className="text-xs sm:text-sm text-muted-foreground p-3 bg-muted/60 rounded-md border shadow-inner">
                            <p className="italic">{aiInsightInput}</p>
                         </div>
                       )}
                       {aiInsightInput && aiInsightInput.startsWith("Select a student") && !selectedStudent && ( 
                         <div className="text-xs sm:text-sm text-muted-foreground p-3 bg-muted/60 rounded-md border shadow-inner">
                            <p className="italic">{aiInsightInput}</p>
                         </div>
                       )}


                      <div>
                        <label htmlFor="supervisor-note-input" className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/90"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500"/>Your Notes</label>
                        <Textarea
                            id="supervisor-note-input"
                            value={supervisorNoteInput}
                            onChange={(e) => setSupervisorNoteInput(e.target.value)}
                            placeholder={`Add your notes for ${selectedStudent.name}...`}
                            rows={5}
                            className="text-sm sm:text-base"
                        />
                        <Button size="sm" onClick={handleSaveSupervisorNotes} className="mt-2.5 text-xs sm:text-sm">Save Notes</Button>
                      </div>
                      {selectedStudent.studentMeetingNotes && (
                         <div>
                            <h4 className="font-medium text-sm sm:text-md mb-1.5 flex items-center gap-2 text-foreground/90"><MessageSquareWarning className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600"/> Student's Last Meeting Note</h4>
                            <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap p-3 bg-amber-500/10 rounded-md border border-amber-500/30 shadow-inner">
                                <p>{selectedStudent.studentMeetingNotes}</p>
                            </div>
                        </div>
                      )}
                    </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : (
            <Card className="shadow-lg border-2 border-dashed border-muted-foreground/30 lg:col-span-8 bg-card">
              <CardContent className="pt-6 text-center text-muted-foreground min-h-[200px] sm:min-h-[400px] flex flex-col justify-center items-center space-y-3 sm:space-y-4">
                <Users className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-primary/20" />
                <p className="text-xl sm:text-2xl font-medium text-foreground">Select a student from the list</p>
                <p className="text-sm sm:text-base max-w-sm sm:max-w-md">Their term plan details, academic progress, and communication tools will appear here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
       <footer className="w-full text-center py-8 sm:py-10 mt-12 sm:mt-16 border-t border-border/50">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Term Supervisor Dashboard © {new Date().getFullYear()} | Empowering Academic Success
        </p>
      </footer>
    </div>
  );
}


    

