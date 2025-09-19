
"use client";

import React from 'react';
import type { OptimizeTermScheduleOutput } from '@/ai/flows/optimize-term-schedule';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Lightbulb, ListOrdered, AlertCircle, Sparkles } from 'lucide-react'; 

interface OptimizerResultsProps {
  results?: OptimizeTermScheduleOutput;
  error?: string;
}

export default function OptimizerResults({ results, error }: OptimizerResultsProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mt-8 shadow-md p-5">
        <AlertCircle className="h-6 w-6" /> 
        <AlertTitle className="text-lg font-semibold">Optimization Error</AlertTitle>
        <AlertDescription className="text-base mt-1">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <Card className="mt-10 shadow-xl border-2 border-green-500/60 bg-green-500/5 dark:bg-green-500/10 dark:border-green-500/40">
      <CardHeader className="pb-4 border-b border-green-500/20">
        <CardTitle className="flex items-center gap-2.5 text-2xl font-semibold text-green-700 dark:text-green-300">
            <Sparkles className="h-7 w-7" />
            AI-Powered Schedule Suggestion
        </CardTitle>
        <CardDescription className="text-base text-green-600 dark:text-green-400 mt-1">
          Here's the AI-recommended order for your selected courses, designed for effective learning and balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        <div>
          <h3 className="font-semibold text-xl mb-3 flex items-center gap-2 text-primary dark:text-primary-foreground/90">
            <ListOrdered className="h-6 w-6" />
            Suggested Course Order:
          </h3>
          {results.optimizedSchedule.length > 0 ? (
            <ol className="list-decimal list-inside space-y-2.5 pl-4 bg-muted/50 p-5 rounded-lg border shadow-inner">
              {results.optimizedSchedule.map((courseName, index) => (
                <li key={index} className="text-md font-medium text-foreground py-1">
                  <span className="mr-2 text-primary">{index + 1}.</span>{courseName}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground p-4 border rounded-md bg-muted/30">No specific order suggested, or no courses were provided for optimization.</p>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-xl mb-3 flex items-center gap-2 text-primary dark:text-primary-foreground/90">
            <Lightbulb className="h-6 w-6" /> 
            AI Reasoning:
          </h3>
          <div className="text-muted-foreground bg-muted/50 p-5 rounded-lg border shadow-inner whitespace-pre-wrap leading-relaxed text-sm">
            {results.reasoning || "No specific reasoning provided by the AI."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
