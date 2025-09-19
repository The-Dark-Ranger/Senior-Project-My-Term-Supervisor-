import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, setDay, addWeeks, setHours, setMinutes, setSeconds, setMilliseconds, isBefore, format, startOfDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to parse time like "10:00 AM" or "2:30 PM" from a longer string
function parseTimeFromSlot(slotStr: string): { hours: number; minutes: number } | null {
  const timeMatch = slotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) {
    // Attempt to match military time if AM/PM is not present
    const militaryMatch = slotStr.match(/(\d{1,2}):(\d{2})/);
    if (militaryMatch) {
        return { hours: parseInt(militaryMatch[1], 10), minutes: parseInt(militaryMatch[2], 10) };
    }
    return null;
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) { // Midnight case: 12 AM is 00 hours
    hours = 0;
  }
  return { hours, minutes };
}

const dayOfWeekMap: { [key: string]: number } = {
  'sunday': 0, 'sun': 0,
  'monday': 1, 'mon': 1,
  'tuesday': 2, 'tue': 2, 'tues': 2,
  'wednesday': 3, 'wed': 3,
  'thursday': 4, 'thu': 4, 'thurs': 4,
  'friday': 5, 'fri': 5,
  'saturday': 6, 'sat': 6,
};

// Derives the next occurrence of a slot (e.g., "Monday 10:00 AM") 
// on or after the referenceIsoTimestamp.
export function deriveDateForSlot(slotString: string, referenceIsoTimestamp: string): Date | null {
  try {
    const studentRequestDateTime = parseISO(referenceIsoTimestamp);

    // Extract the day string (first word)
    const slotDayStringOnly = slotString.split(' ')[0].toLowerCase();
    const targetDayOfWeek = dayOfWeekMap[slotDayStringOnly];

    if (targetDayOfWeek === undefined) {
      console.warn(`Could not parse day of week from slot: "${slotString}" (parsed as "${slotDayStringOnly}")`);
      return null;
    }

    const timeDetails = parseTimeFromSlot(slotString);
    if (!timeDetails) {
      console.warn(`Could not parse time from slot: "${slotString}"`);
      return null;
    }

    let potentialEventDate = setDay(studentRequestDateTime, targetDayOfWeek, { weekStartsOn: 0 }); // date-fns default: weekStartsOn: 0 (Sunday)
    
    potentialEventDate = setHours(potentialEventDate, timeDetails.hours);
    potentialEventDate = setMinutes(potentialEventDate, timeDetails.minutes);
    potentialEventDate = setSeconds(potentialEventDate, 0);
    potentialEventDate = setMilliseconds(potentialEventDate, 0);

    // If this potential date is before the student even made the request (considering the full datetime),
    // it means the day in the current week has passed, or it is today but the time has passed.
    // So, we schedule it for the same day and time in the next week.
    if (isBefore(potentialEventDate, studentRequestDateTime)) {
      potentialEventDate = addWeeks(potentialEventDate, 1);
    }
    
    // Ensure the date is not in the past from "now" if we always want future dates
    // However, the logic above should place it on or after studentRequestDateTime.
    // For simplicity, we'll stick to the "on or after student request time" logic.

    return potentialEventDate;
  } catch (error) {
    console.error("Error deriving date for slot:", error, { slotString, referenceIsoTimestamp });
    return null;
  }
}
