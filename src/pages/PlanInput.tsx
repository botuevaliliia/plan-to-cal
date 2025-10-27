import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduleTasksExpanded } from '@/utils/schedulerExpanded';
import { usePlanStore } from '@/store/planStore';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import GoalBasedPlanner from '@/components/GoalBasedPlanner';
import { CalendarConnect } from '@/components/CalendarConnect';
import { Task } from '@/types/task';
import { Card } from '@/components/ui/card';

const PlanInput = () => {
  const navigate = useNavigate();
  const { setTasks, setEvents, setTimeWindow, setConflicts, busySlots, setBusySlots, setConnectedCalendar } = usePlanStore();
  
  const [timezone] = useState('America/New_York');
  
  const scheduleAndNavigate = (tasksToSchedule: Task[], periodDays?: number) => {
    // Use period from goal if provided, otherwise require manual dates
    let start = DateTime.now().setZone(timezone);
    let end = periodDays 
      ? start.plus({ days: periodDays })
      : start.plus({ days: 7 }); // default 1 week

    const timeWindow = {
      startISO: start.startOf('day').toISO() || '',
      endISO: end.endOf('day').toISO() || '',
      workHours: { start: '09:00', end: '18:00' }, // Reasonable work hours
      timezone,
    };
    
    setTimeWindow(timeWindow);
    setTasks(tasksToSchedule);

    // Process tasks with dayOffset
    const processedTasks = tasksToSchedule.map(task => {
      if (task.earliestStart?.startsWith('day-')) {
        const dayOffset = parseInt(task.earliestStart.replace('day-', ''));
        const taskDate = start.plus({ days: dayOffset });
        return {
          ...task,
          earliestStart: taskDate.toISO() || undefined,
        };
      }
      return task;
    });

    const { events, conflicts } = scheduleTasksExpanded(processedTasks, timeWindow, busySlots);
    setEvents(events);
    setConflicts(conflicts);

    toast.success(`${events.length} events scheduled${conflicts.length > 0 ? `, ${conflicts.length} conflicts found` : ''}`);
    navigate('/calendar');
  };

  const handleGoalTasksGenerated = (tasks: Task[], periodDays?: number) => {
    scheduleAndNavigate(tasks, periodDays);
    return true;
  };
  
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-6 pt-16">
          <h1 className="text-6xl md:text-7xl font-mono tracking-tight uppercase">
            Goal to Calendar
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            AI-powered scheduling that understands your goals
          </p>
        </div>

        {/* Calendar Import */}
        <Card className="p-6 max-w-2xl mx-auto border border-border/50">
          <CalendarConnect
            onBusySlotsLoaded={(slots) => {
              setBusySlots(slots);
              toast.success(`Imported ${slots.length} events from your calendar`);
            }}
            onCalendarConnected={(calendar) => {
              setConnectedCalendar(calendar);
              toast.info(`Connected to ${calendar.name}`);
            }}
            timeWindow={null}
          />
        </Card>

        {/* Goal-Based Planner */}
        <GoalBasedPlanner onTasksGenerated={handleGoalTasksGenerated} />

      </div>
    </div>
  );
};

export default PlanInput;
