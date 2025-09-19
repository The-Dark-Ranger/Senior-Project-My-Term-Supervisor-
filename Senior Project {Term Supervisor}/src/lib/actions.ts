
'use server';

import { optimizeTermSchedule, type OptimizeTermScheduleInput, type OptimizeTermScheduleOutput } from '@/ai/flows/optimize-term-schedule';

export interface OptimizerResult {
  data?: OptimizeTermScheduleOutput;
  error?: string;
}

export async function getOptimizedScheduleAction(input: OptimizeTermScheduleInput): Promise<OptimizerResult> {
  try {
    const result = await optimizeTermSchedule(input);
    if (!result || !result.optimizedSchedule) {
        // Handle cases where the AI might return an unexpected empty or partial response
        return { error: "AI returned an unexpected result. Please check your input or try again." };
    }
    return { data: result };
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    // It's good practice to not expose raw error messages to the client
    // For debugging, you might log more details on the server
    // const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { error: "Failed to optimize schedule due to an internal error. Please try again later." };
  }
}
