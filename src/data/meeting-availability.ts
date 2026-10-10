import { addDays, addMinutes, isAfter, setHours, setMinutes, startOfDay } from 'date-fns';

/** Supervisor office hours (weekday: 0 = Sunday). Sunday-Thursday matches the Saudi work week. */
export const WEEKLY_OFFICE_HOURS = [
  { weekday: 0, hour: 10, minute: 0 },
  { weekday: 1, hour: 13, minute: 0 },
  { weekday: 2, hour: 14, minute: 0 },
  { weekday: 3, hour: 11, minute: 0 },
  { weekday: 4, hour: 9, minute: 30 },
] as const;

export const MEETING_DURATION_MINUTES = 30;

/** Minimum notice before a slot can be requested. */
const MIN_NOTICE_MINUTES = 120;

/** Upcoming office-hour slots over the next `days` days, excluding `taken` start times (ISO strings). */
export function upcomingSlots(now: Date, days = 14, taken: ReadonlySet<string> = new Set()): Date[] {
  const earliest = addMinutes(now, MIN_NOTICE_MINUTES);
  const slots: Date[] = [];
  for (let offset = 0; offset <= days; offset++) {
    const day = addDays(startOfDay(now), offset);
    for (const hours of WEEKLY_OFFICE_HOURS) {
      if (day.getDay() !== hours.weekday) continue;
      const slot = setMinutes(setHours(day, hours.hour), hours.minute);
      if (isAfter(slot, earliest) && !taken.has(slot.toISOString())) slots.push(slot);
    }
  }
  return slots;
}
