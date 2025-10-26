import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseTasksFromText } from '@/utils/parser';
import { scheduleTasksExpanded } from '@/utils/schedulerExpanded';
import { usePlanStore } from '@/store/planStore';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CalendarConnect } from '@/components/CalendarConnect';
import { DateTime } from 'luxon';
import GoalBasedPlanner from '@/components/GoalBasedPlanner';
import { Task } from '@/types/task';

const PlanInput = () => {
  const navigate = useNavigate();
  const { setTasks, setEvents, setTimeWindow, setBusySlots, setConnectedCalendar, setConflicts, busySlots } = usePlanStore();
  
  const [planText, setPlanText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('19:00');
  const [timezone] = useState('America/New_York');
  
  const scheduleAndNavigate = (tasksToSchedule: Task[]) => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates first');
      return;
    }

    const timeWindow = {
      startISO: DateTime.fromISO(startDate).startOf('day').toISO() || '',
      endISO: DateTime.fromISO(endDate).endOf('day').toISO() || '',
      workHours: { start: workStart, end: workEnd },
      timezone,
    };
    
    setTimeWindow(timeWindow);
    setTasks(tasksToSchedule);

    const { events, conflicts } = scheduleTasksExpanded(tasksToSchedule, timeWindow, busySlots);
    setEvents(events);
    setConflicts(conflicts);

    toast.success(`${events.length} events scheduled${conflicts.length > 0 ? `, ${conflicts.length} conflicts found` : ''}`);
    navigate('/calendar');
  };

  const handleGoalTasksGenerated = (tasks: Task[]) => {
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates to schedule tasks');
      return false;
    }
    scheduleAndNavigate(tasks);
    return true;
  };
  
  const handleParse = async () => {
    if (!planText.trim()) {
      toast.error('Please enter your plan');
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    
    const toastId = toast.loading('Parsing tasks with AI...');
    
    try {
      const tasks = await parseTasksFromText(planText, true);
      
      toast.dismiss(toastId);
      
      if (tasks.length === 0) {
        toast.error('No tasks found. Please check your format.');
        return;
      }
      
      scheduleAndNavigate(tasks);
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Parse error:', error);
      toast.error('Failed to parse plan. Falling back to local parser...');
      
      // Immediate fallback to local parser
      try {
        const tasks = await parseTasksFromText(planText, false);
        
        if (tasks.length === 0) {
          toast.error('No tasks found. Please check your format.');
          return;
        }
        
        scheduleAndNavigate(tasks);
      } catch (fallbackError) {
        toast.error('Failed to parse plan even with local parser.');
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-6 pt-16">
          <h1 className="text-6xl md:text-7xl font-mono tracking-tight uppercase">
            Plan to Calendar
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            Turn your goals into scheduled tasks
          </p>
        </div>

        {/* Goal-Based Planner */}
        <GoalBasedPlanner onTasksGenerated={handleGoalTasksGenerated} />

        {/* Main Card */}
        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5" />
              Enter Tasks Manually
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter tasks (one per line) with optional durations. Example: "Python tutorial (2h)"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="plan-text">Task List or Goal</Label>
              <Textarea
                id="plan-text"
                placeholder="TASK LIST:&#10;Take a YC course&#10;Do market research and make a presentation&#10;Create an MVP&#10;&#10;OR GOAL:&#10;I'm preparing for a half marathon, I can currently run 13km at 10kmh, I have 3 months, give me a progressive schedule&#10;&#10;I want to read 10 books in 3 months, schedule this for me"
                className="min-h-[300px] mt-2 font-mono text-sm"
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  className="mt-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="end-date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  className="mt-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="work-start" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Work Hours Start
                </Label>
                <Input
                  id="work-start"
                  type="time"
                  className="mt-2"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="work-end" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Work Hours End
                </Label>
                <Input
                  id="work-end"
                  type="time"
                  className="mt-2"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                />
              </div>
            </div>

            <CalendarConnect
              onBusySlotsLoaded={(slots) => {
                console.log('Setting busy slots in store:', slots.length);
                setBusySlots(slots);
                toast.info(`Loaded ${slots.length} busy time slots from your calendar`);
              }}
              onCalendarConnected={(calendar) => {
                setConnectedCalendar(calendar);
              }}
              timeWindow={
                startDate && endDate
                  ? {
                      startISO: DateTime.fromISO(startDate).startOf('day').toISO() || '',
                      endISO: DateTime.fromISO(endDate).endOf('day').toISO() || '',
                    }
                  : null
              }
            />

            <Button
              onClick={handleParse}
              size="lg"
              className="w-full"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Parse & Schedule
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default PlanInput;
