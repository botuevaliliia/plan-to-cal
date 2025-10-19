import { DateTime } from 'luxon';
import { Task, ScheduledEvent, TimeWindow } from '@/types/task';

interface TimeSlot {
  start: DateTime;
  end: DateTime;
}

export function scheduleTasks(
  tasks: Task[],
  timeWindow: TimeWindow,
  busySlots: TimeSlot[] = []
): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  const { startISO, endISO, workHours, timezone } = timeWindow;
  
  const windowStart = DateTime.fromISO(startISO, { zone: timezone });
  const windowEnd = DateTime.fromISO(endISO, { zone: timezone });
  
  // Sort tasks: fixed times first, then by estimated duration (longest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.fixedStart && !b.fixedStart) return -1;
    if (!a.fixedStart && b.fixedStart) return 1;
    return b.estimatedMinutes - a.estimatedMinutes;
  });
  
  const scheduled: TimeSlot[] = [...busySlots];
  
  for (const task of sortedTasks) {
    let proposedStart: DateTime;
    
    if (task.fixedStart) {
      proposedStart = DateTime.fromISO(task.fixedStart, { zone: timezone });
    } else {
      // Find the earliest available slot
      proposedStart = findNextAvailableSlot(
        windowStart,
        windowEnd,
        task.estimatedMinutes,
        scheduled,
        workHours,
        task.allowParallel
      );
    }
    
    if (!proposedStart || proposedStart >= windowEnd) {
      continue; // Can't fit this task
    }
    
    const proposedEnd = proposedStart.plus({ minutes: task.estimatedMinutes });
    
    // Generate RRULE if task is recurring
    let rrule: string | undefined;
    if (task.recurring) {
      const { freq, count, byDay } = task.recurring;
      const rruleParts = ['FREQ=' + freq];
      if (count) rruleParts.push('COUNT=' + count);
      if (byDay && byDay.length > 0) rruleParts.push('BYDAY=' + byDay.join(','));
      rrule = rruleParts.join(';');
    }
    
    const event: ScheduledEvent = {
      id: task.id,
      title: task.title,
      startISO: proposedStart.toISO() || '',
      endISO: proposedEnd.toISO() || '',
      category: task.category,
      allowParallel: task.allowParallel,
      notes: task.notes,
      rrule,
    };
    
    events.push(event);
    
    if (!task.allowParallel) {
      scheduled.push({ start: proposedStart, end: proposedEnd });
    }
  }
  
  return events;
}

function findNextAvailableSlot(
  windowStart: DateTime,
  windowEnd: DateTime,
  durationMinutes: number,
  busySlots: TimeSlot[],
  workHours?: { start: string; end: string },
  allowParallel: boolean = false
): DateTime {
  let current = windowStart;
  
  while (current < windowEnd) {
    const proposedEnd = current.plus({ minutes: durationMinutes });
    
    if (proposedEnd > windowEnd) break;
    
    // Check if within work hours
    if (workHours) {
      const [startHour, startMin] = workHours.start.split(':').map(Number);
      const [endHour, endMin] = workHours.end.split(':').map(Number);
      
      const dayStart = current.set({ hour: startHour, minute: startMin });
      const dayEnd = current.set({ hour: endHour, minute: endMin });
      
      if (current < dayStart) {
        current = dayStart;
        continue;
      }
      
      if (current >= dayEnd) {
        current = current.plus({ days: 1 }).set({ hour: startHour, minute: startMin });
        continue;
      }
      
      if (proposedEnd > dayEnd) {
        current = current.plus({ days: 1 }).set({ hour: startHour, minute: startMin });
        continue;
      }
    }
    
    // Check for conflicts with busy slots
    const hasConflict = busySlots.some(slot => {
      return current < slot.end && proposedEnd > slot.start;
    });
    
    if (!hasConflict || allowParallel) {
      return current;
    }
    
    // Move to the end of the conflicting slot plus buffer
    const conflictingSlot = busySlots.find(slot => current < slot.end && proposedEnd > slot.start);
    if (conflictingSlot) {
      current = conflictingSlot.end.plus({ minutes: 15 }); // 15 min buffer
    } else {
      current = current.plus({ minutes: 30 });
    }
  }
  
  return windowStart; // Fallback
}
