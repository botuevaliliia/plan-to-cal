export type TaskCategory = 
  | 'Interviews'
  | 'Applications'
  | 'SPE'
  | 'Study'
  | 'Fitness'
  | 'Errands'
  | 'Content'
  | 'Networking'
  | 'Learning'
  | 'Default';

export interface RecurringPattern {
  freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  count?: number;
  byDay?: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'>;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  estimatedMinutes: number;
  earliestStart?: string;
  latestEnd?: string;
  dayPreference?: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  fixedStart?: string;
  allowParallel: boolean;
  recurring?: RecurringPattern;
  category: TaskCategory;
  priority?: 'low' | 'medium' | 'high';
}

export interface TimeWindow {
  startISO: string;
  endISO: string;
  workHours?: {
    start: string;
    end: string;
  };
  timezone: string;
}

export interface Plan {
  timeWindow: TimeWindow;
  tasks: Task[];
}

export interface ScheduledEvent {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  category: TaskCategory;
  rrule?: string;
  allowParallel?: boolean;
  notes?: string;
}

export interface Conflict {
  eventId: string;
  reason: 'overlap-busy' | 'outside-window' | 'invalid-duration';
  suggestions?: ScheduledEvent[];
}

export interface TimeSlot {
  start: string; // ISO string
  end: string;   // ISO string
}
