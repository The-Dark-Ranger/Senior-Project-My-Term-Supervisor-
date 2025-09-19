
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, User, UserCog, BrainCircuit, Users, LayoutList, Zap, ShieldCheck, MessageCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] sm:min-h-[calc(100vh-150px)] py-8 sm:py-12 px-4">
      <div className="text-center space-y-6 sm:space-y-8 mb-12 sm:mb-16 max-w-3xl lg:max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
          Welcome to <span className="text-primary">Term Supervisor</span>
        </h1>
        <p className="text-md sm:text-lg md:text-xl text-muted-foreground max-w-xl md:max-w-3xl mx-auto">
          Effortlessly plan your academic terms, optimize your course schedule with AI-driven insights, and collaborate seamlessly with your supervisor for enhanced learning outcomes and a clear path to success.
        </p>
         <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4">
          <Link href="#features">
            <Button size="lg" variant="outline" className="shadow-md hover:shadow-lg transition-shadow w-full sm:w-auto">Learn More</Button>
          </Link>
          {/* "Get Started" button removed */}
        </div>
      </div>

      <div className="w-full max-w-md sm:max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 mb-16 sm:mb-24">
        <Card className="shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-primary/60 transform transition-all duration-300 ease-in-out group border-2 border-transparent hover:border-primary/30 flex flex-col">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary transition-colors" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-semibold">Student Portal</CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-base">
              Manage your courses, track deadlines, receive AI-powered schedule optimizations, and connect with your academic supervisor.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/student/login">
              <Button className="w-full text-md sm:text-lg py-5 sm:py-6" size="lg" variant="default">
                Access Student Dashboard <ArrowRight className="ml-2.5 h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-primary/60 transform transition-all duration-300 ease-in-out group border-2 border-transparent hover:border-primary/30 flex flex-col">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                <UserCog className="h-8 w-8 sm:h-10 sm:w-10 text-primary transition-colors" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-semibold">Supervisor Portal</CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-base">
              View student progress, provide personalized guidance, manage term approvals, and facilitate effective academic oversight.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/supervisor/login">
              <Button className="w-full text-md sm:text-lg py-5 sm:py-6" size="lg" variant="default">
                Access Supervisor Dashboard <ArrowRight className="ml-2.5 h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <section id="features" className="w-full max-w-5xl lg:max-w-6xl mt-12 sm:mt-16 py-12 sm:py-20 text-center bg-muted/50 rounded-xl shadow-inner border">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-6 text-foreground">Why Term Supervisor?</h2>
        <p className="text-md sm:text-lg text-muted-foreground max-w-xl md:max-w-3xl mx-auto mb-10 sm:mb-16">
          Discover features meticulously designed to streamline academic planning and enhance collaboration for both students and supervisors.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 sm:gap-x-8 gap-y-8 sm:gap-y-12 px-4 sm:px-6">
          <div className="p-6 sm:p-8 bg-card rounded-xl shadow-lg border transform hover:scale-105 transition-transform duration-300">
            <div className="p-2.5 sm:p-3 inline-flex bg-primary/10 rounded-full mb-4 sm:mb-5 ring-4 ring-primary/20">
              <BrainCircuit className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">AI-Powered Optimization</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Leverage cutting-edge artificial intelligence to discover the most effective course sequences tailored to your academic goals and workload preferences.
            </p>
          </div>
          <div className="p-6 sm:p-8 bg-card rounded-xl shadow-lg border transform hover:scale-105 transition-transform duration-300">
             <div className="p-2.5 sm:p-3 inline-flex bg-primary/10 rounded-full mb-4 sm:mb-5 ring-4 ring-primary/20">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Seamless Collaboration</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Students and supervisors can effortlessly share plans, provide feedback, and communicate effectively within a unified platform (future feature).
            </p>
          </div>
          <div className="p-6 sm:p-8 bg-card rounded-xl shadow-lg border transform hover:scale-105 transition-transform duration-300">
             <div className="p-2.5 sm:p-3 inline-flex bg-primary/10 rounded-full mb-4 sm:mb-5 ring-4 ring-primary/20">
              <LayoutList className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Organized Planning</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Maintain a clear overview of courses, prerequisites, credits, and academic progress, all conveniently centralized in one accessible location.
            </p>
          </div>
           <div className="p-6 sm:p-8 bg-card rounded-xl shadow-lg border transform hover:scale-105 transition-transform duration-300">
            <div className="p-2.5 sm:p-3 inline-flex bg-primary/10 rounded-full mb-4 sm:mb-5 ring-4 ring-primary/20">
              <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Dynamic Scheduling</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
                Adapt your term plans on the fly with intuitive tools and get instant feedback on how changes impact your overall academic trajectory.
            </p>
          </div>
          <div className="p-6 sm:p-8 bg-card rounded-xl shadow-lg border transform hover:scale-105 transition-transform duration-300">
            <div className="p-2.5 sm:p-3 inline-flex bg-primary/10 rounded-full mb-4 sm:mb-5 ring-4 ring-primary/20">
              <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Guided Pathways</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
                Receive intelligent recommendations and ensure you're meeting all program requirements for timely graduation.
            </p>
          </div>
          <div className="p-6 sm:p-8 bg-card rounded-xl shadow-lg border transform hover:scale-105 transition-transform duration-300">
            <div className="p-2.5 sm:p-3 inline-flex bg-primary/10 rounded-full mb-4 sm:mb-5 ring-4 ring-primary/20">
              <MessageCircle className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Direct Communication</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
               Facilitate clear and direct communication channels between students and supervisors for timely advice and support.
            </p>
          </div>
        </div>
      </section>

      <footer className="w-full text-center py-12 sm:py-16 mt-16 sm:mt-20 border-t">
        <p className="text-sm sm:text-base text-muted-foreground">
          © {new Date().getFullYear()} Term Supervisor. Empowering academic journeys through smart planning and collaboration.
        </p>
      </footer>
    </div>
  );
}

