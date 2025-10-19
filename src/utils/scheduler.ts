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
  
  // Sort tasks: fixed times first, recurring tasks next, then by estimated duration (longest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.fixedStart && !b.fixedStart) return -1;
    if (!a.fixedStart && b.fixedStart) return 1;
    if (a.recurring && !b.recurring) return -1;
    if (!a.recurring && b.recurring) return 1;
    return b.estimatedMinutes - a.estimatedMinutes;
  });
  
  const scheduled: TimeSlot[] = [...busySlots];
  
  for (const task of sortedTasks) {
    let proposedStart: DateTime;
    
    if (task.fixedStart) {
      proposedStart = DateTime.fromISO(task.fixedStart, { zone: timezone });
    } else if (task.recurring) {
      // For recurring tasks, find a good starting slot based on frequency and day preferences
      proposedStart = findRecurringStartSlot(
        windowStart,
        windowEnd,
        task.estimatedMinutes,
        scheduled,
        workHours,
        task.recurring,
        task.allowParallel
      );
    } else {
      // Find the earliest available slot for one-time tasks
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
    
    // For recurring tasks, block time on all recurrence days if not allowing parallel
    if (task.recurring && !task.allowParallel) {
      const recurrenceDates = generateRecurrenceDates(proposedStart, windowEnd, task.recurring);
      for (const recDate of recurrenceDates) {
        scheduled.push({ 
          start: recDate, 
          end: recDate.plus({ minutes: task.estimatedMinutes }) 
        });
      }
    } else if (!task.allowParallel) {
      scheduled.push({ start: proposedStart, end: proposedEnd });
    }
  }
  
  return events;
}

function generateRecurrenceDates(start: DateTime, windowEnd: DateTime, recurring: Task['recurring']): DateTime[] {
  if (!recurring) return [];
  
  const dates: DateTime[] = [];
  let current = start;
  const { freq, count, byDay } = recurring;
  
  const maxOccurrences = count || 100; // Fallback to prevent infinite loop
  let occurrences = 0;
  
  while (current < windowEnd && occurrences < maxOccurrences) {
    if (byDay && byDay.length > 0) {
      // Check if current day matches byDay
      const dayMap: Record<string, number> = {
        'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 7
      };
      const currentWeekday = current.weekday;
      const matchesDay = byDay.some(day => dayMap[day] === currentWeekday);
      
      if (matchesDay) {
        dates.push(current);
        occurrences++;
      }
    } else {
      dates.push(current);
      occurrences++;
    }
    
    // Move to next occurrence
    if (freq === 'DAILY') {
      current = current.plus({ days: 1 });
    } else if (freq === 'WEEKLY') {
      current = current.plus({ weeks: 1 });
    } else if (freq === 'MONTHLY') {
      current = current.plus({ months: 1 });
    } else {
      break;
    }
  }
  
  return dates;
}

function findRecurringStartSlot(
  windowStart: DateTime,
  windowEnd: DateTime,
  durationMinutes: number,
  busySlots: TimeSlot[],
  workHours?: { start: string; end: string },
  recurring?: Task['recurring'],
  allowParallel: boolean = false
): DateTime {
  // For recurring tasks, try to find a consistent time slot
  // Start by trying the beginning of work hours on appropriate days
  
  if (!workHours) {
    return windowStart;
  }
  
  const [startHour, startMin] = workHours.start.split(':').map(Number);
  let current = windowStart.set({ hour: startHour, minute: startMin });
  
  // If byDay is specified, find the first matching day
  if (recurring?.byDay && recurring.byDay.length > 0) {
    const dayMap: Record<string, number> = {
      'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 7
    };
    
    // Find the first day that matches byDay
    while (current < windowEnd) {
      const currentWeekday = current.weekday;
      const matchesDay = recurring.byDay.some(day => dayMap[day] === currentWeekday);
      
      if (matchesDay) {
        // Check if this time slot is available
        const proposedEnd = current.plus({ minutes: durationMinutes });
        const hasConflict = busySlots.some(slot => 
          current < slot.end && proposedEnd > slot.start
        );
        
        if (!hasConflict || allowParallel) {
          return current;
        }
      }
      
      current = current.plus({ days: 1 }).set({ hour: startHour, minute: startMin });
    }
  }
  
  // Fallback to regular slot finding
  return findNextAvailableSlot(windowStart, windowEnd, durationMinutes, busySlots, workHours, allowParallel);
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
