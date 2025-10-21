import { DateTime } from 'luxon';
import { Task, ScheduledEvent, TimeWindow } from '@/types/task';

interface TimeSlot {
  start: DateTime;
  end: DateTime;
}

function toStartOfDay(dt: DateTime, hhmm: string | undefined, fallback: string): DateTime {
  const time = hhmm && /^(\d{1,2}):(\d{2})$/.test(hhmm) ? hhmm : fallback;
  const [h, m] = time.split(':').map(Number);
  return dt.set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

function weekdayNumber(code: string): number {
  const map: Record<string, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
  return map[code] || 1;
}

function addBusy(busy: TimeSlot[], start: DateTime, minutes: number) {
  busy.push({ start, end: start.plus({ minutes }) });
}

function hasConflict(start: DateTime, end: DateTime, busySlots: TimeSlot[]): boolean {
  return busySlots.some((slot) => start < slot.end && end > slot.start);
}

function findNextAvailableSlot(
  windowStart: DateTime,
  windowEnd: DateTime,
  durationMinutes: number,
  busySlots: TimeSlot[],
  workHours?: { start: string; end: string }
): DateTime | null {
  let current = windowStart;
  const [startHour, startMin] = (workHours?.start || '09:00').split(':').map(Number);
  const [endHour, endMin] = (workHours?.end || '18:00').split(':').map(Number);

  while (current < windowEnd) {
    const dayStart = current.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
    const dayEnd = current.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
    if (current < dayStart) current = dayStart;
    const proposedEnd = current.plus({ minutes: durationMinutes });
    if (proposedEnd > dayEnd) {
      current = current.plus({ days: 1 }).set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
      continue;
    }
    if (!hasConflict(current, proposedEnd, busySlots)) return current;
    const conflictingSlot = busySlots.find((slot) => current < slot.end && proposedEnd > slot.start);
    current = (conflictingSlot?.end || current).plus({ minutes: 15 });
  }
  return null;
}

export function scheduleTasksExpanded(
  tasks: Task[],
  timeWindow: TimeWindow,
  busySlots: TimeSlot[] = []
): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  const { startISO, endISO, workHours, timezone } = timeWindow;
  const windowStart = DateTime.fromISO(startISO, { zone: timezone });
  const windowEnd = DateTime.fromISO(endISO, { zone: timezone });

  // Convert busySlots to DateTime objects
  const scheduled: TimeSlot[] = busySlots.map(slot => ({
    start: DateTime.fromISO(slot.start as any, { zone: timezone }),
    end: DateTime.fromISO(slot.end as any, { zone: timezone })
  }));

  for (const task of tasks) {
    const startTime: string | undefined = (task as any)?.startTime;

    if (task.fixedStart) {
      const start = DateTime.fromISO(task.fixedStart, { zone: timezone });
      const end = start.plus({ minutes: task.estimatedMinutes });
      events.push({
        id: task.id,
        title: task.title,
        startISO: start.toISO() || '',
        endISO: end.toISO() || '',
        category: task.category,
        allowParallel: task.allowParallel,
        notes: task.notes,
      });
      if (!task.allowParallel) addBusy(scheduled, start, task.estimatedMinutes);
      continue;
    }

    if (task.recurring) {
      const freq = task.recurring.freq || 'WEEKLY';
      const count = task.recurring.count || 12;
      const byDay = task.recurring.byDay && task.recurring.byDay.length > 0 ? task.recurring.byDay : undefined;
      const startWeekOffset = (task.recurring as any)?.startWeekOffset || 0;

      // Base start adjusted by offset
      let base = windowStart.plus({ weeks: startWeekOffset });

      let occurrences = 0;
      let weekCursor = base.startOf('week');

      while (occurrences < count) {
        if (freq === 'DAILY') {
          const candidate = toStartOfDay(base.plus({ days: occurrences }), startTime || workHours?.start, workHours?.start || '09:00');
          if (candidate >= windowStart && candidate < windowEnd) {
            const end = candidate.plus({ minutes: task.estimatedMinutes });
            // Check for conflicts with existing busy slots
            if (!hasConflict(candidate, end, scheduled)) {
              events.push({
                id: `${task.id}-${occurrences + 1}`,
                title: task.title,
                startISO: candidate.toISO() || '',
                endISO: end.toISO() || '',
                category: task.category,
                allowParallel: task.allowParallel,
                notes: task.notes,
              });
              if (!task.allowParallel) addBusy(scheduled, candidate, task.estimatedMinutes);
            }
          }
          occurrences++;
        } else if (freq === 'WEEKLY') {
          const days = byDay || ['MO'];
          for (const day of days) {
            if (occurrences >= count) break;
            const weekday = weekdayNumber(day);
            let candidate = weekCursor.plus({ days: weekday - 1 });
            candidate = toStartOfDay(candidate, startTime || workHours?.start, workHours?.start || '09:00');
            if (candidate < windowStart) continue;
            if (candidate >= windowEnd) { occurrences = count; break; }
            const end = candidate.plus({ minutes: task.estimatedMinutes });
            // Check for conflicts with existing busy slots
            if (!hasConflict(candidate, end, scheduled)) {
              events.push({
                id: `${task.id}-${occurrences + 1}`,
                title: task.title,
                startISO: candidate.toISO() || '',
                endISO: end.toISO() || '',
                category: task.category,
                allowParallel: task.allowParallel,
                notes: task.notes,
              });
              if (!task.allowParallel) addBusy(scheduled, candidate, task.estimatedMinutes);
            }
            occurrences++;
          }
          weekCursor = weekCursor.plus({ weeks: 1 });
        } else if (freq === 'MONTHLY') {
          let candidate = base.plus({ months: occurrences });
          candidate = toStartOfDay(candidate, startTime || workHours?.start, workHours?.start || '09:00');
          if (candidate >= windowStart && candidate < windowEnd) {
            const end = candidate.plus({ minutes: task.estimatedMinutes });
            // Check for conflicts with existing busy slots
            if (!hasConflict(candidate, end, scheduled)) {
              events.push({
                id: `${task.id}-${occurrences + 1}`,
                title: task.title,
                startISO: candidate.toISO() || '',
                endISO: end.toISO() || '',
                category: task.category,
                allowParallel: task.allowParallel,
                notes: task.notes,
              });
              if (!task.allowParallel) addBusy(scheduled, candidate, task.estimatedMinutes);
            }
          }
          occurrences++;
        } else {
          break;
        }
      }
      continue;
    }

    // One-time task: find earliest slot
    const start = findNextAvailableSlot(windowStart, windowEnd, task.estimatedMinutes, scheduled, workHours);
    if (!start) {
      console.warn(`Could not schedule task: ${task.title} (${task.estimatedMinutes} minutes) - no available slots`);
      continue;
    }
    const end = start.plus({ minutes: task.estimatedMinutes });
    console.log(`Scheduled task: ${task.title} from ${start.toISO()} to ${end.toISO()}`);
    events.push({
      id: task.id,
      title: task.title,
      startISO: start.toISO() || '',
      endISO: end.toISO() || '',
      category: task.category,
      allowParallel: task.allowParallel,
      notes: task.notes,
    });
    if (!task.allowParallel) addBusy(scheduled, start, task.estimatedMinutes);
  }

  return events;
}
