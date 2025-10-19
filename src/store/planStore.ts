import { create } from 'zustand';
import { Task, ScheduledEvent, TimeWindow } from '@/types/task';

interface PlanStore {
  tasks: Task[];
  events: ScheduledEvent[];
  timeWindow: TimeWindow | null;
  
  setTasks: (tasks: Task[]) => void;
  setEvents: (events: ScheduledEvent[]) => void;
  setTimeWindow: (window: TimeWindow) => void;
  updateEvent: (id: string, updates: Partial<ScheduledEvent>) => void;
  removeEvent: (id: string) => void;
  reset: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  tasks: [],
  events: [],
  timeWindow: null,
  
  setTasks: (tasks) => set({ tasks }),
  setEvents: (events) => set({ events }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  
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
  
  reset: () => set({ tasks: [], events: [], timeWindow: null }),
}));
