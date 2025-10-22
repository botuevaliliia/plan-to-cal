import { create } from 'zustand';
import { Task, ScheduledEvent, TimeWindow, TimeSlot } from '@/types/task';

interface ConnectedCalendar {
  type: 'google' | 'microsoft' | 'ics';
  name: string;
  url?: string;
  accessToken?: string;
}

interface PlanStore {
  tasks: Task[];
  events: ScheduledEvent[];
  timeWindow: TimeWindow | null;
  busySlots: TimeSlot[];
  connectedCalendar: ConnectedCalendar | null;
  conflicts: Array<{ taskTitle: string; reason: string; suggestedTime?: string }>;
  
  setTasks: (tasks: Task[]) => void;
  setEvents: (events: ScheduledEvent[]) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setBusySlots: (slots: TimeSlot[]) => void;
  setConnectedCalendar: (calendar: ConnectedCalendar | null) => void;
  setConflicts: (conflicts: Array<{ taskTitle: string; reason: string; suggestedTime?: string }>) => void;
  updateEvent: (id: string, updates: Partial<ScheduledEvent>) => void;
  removeEvent: (id: string) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  tasks: [],
  events: [],
  timeWindow: null,
  busySlots: [],
  connectedCalendar: null,
  conflicts: [],
  
  setTasks: (tasks) => set({ tasks }),
  setEvents: (events) => set({ events }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setBusySlots: (busySlots) => set({ busySlots }),
  setConnectedCalendar: (connectedCalendar) => set({ connectedCalendar }),
  setConflicts: (conflicts) => set({ conflicts }),
  
  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...updates } : event
      ),
    })),
  
  removeEvent: (id) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    })),
  
  reset: () => set({ tasks: [], events: [], timeWindow: null, busySlots: [], connectedCalendar: null, conflicts: [] }),
}));
