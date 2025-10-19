import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseTasksFromText } from '@/utils/parser';
import { scheduleTasks } from '@/utils/scheduler';
import { usePlanStore } from '@/store/planStore';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const PlanInput = () => {
  const navigate = useNavigate();
  const { setTasks, setEvents, setTimeWindow } = usePlanStore();
  
  const [planText, setPlanText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('19:00');
  const [timezone] = useState('America/New_York');
  
  const handleParse = () => {
    if (!planText.trim()) {
      toast.error('Please enter your plan');
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    
    try {
      const tasks = parseTasksFromText(planText);
      
      if (tasks.length === 0) {
        toast.error('No tasks found. Make sure to use bullet points (-, —, *, •)');
        return;
      }
      
      const timeWindow = {
        startISO: new Date(startDate).toISOString(),
        endISO: new Date(endDate).toISOString(),
        workHours: { start: workStart, end: workEnd },
        timezone,
      };
      
      const scheduledEvents = scheduleTasks(tasks, timeWindow);
      
      setTasks(tasks);
      setEvents(scheduledEvents);
      setTimeWindow(timeWindow);
      
      toast.success(`Parsed ${tasks.length} tasks, scheduled ${scheduledEvents.length} events`);
      navigate('/calendar');
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse plan. Please check your format.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 pt-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
            <Calendar className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Plan to Calendar
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Paste your plan, set your time window, and let AI schedule it perfectly
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Plan
            </CardTitle>
            <CardDescription>
              Enter your tasks using bullet points (-, —, *, •). Include durations like "2h" or "45min"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="plan-text">Task List</Label>
              <Textarea
                id="plan-text"
                placeholder="— Пройти YC курс 2h&#10;— Сделать маркет рисерч и сделать презентацию 3h&#10;— Построить MVP&#10;— Пойти бегать 45min&#10;— Mock interview 1h"
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

            <Button
              onClick={handleParse}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Parse & Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Example */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Example Format</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono text-muted-foreground">
{`— Complete YC course 2h
— Market research and presentation 3h
— Build MVP
— Go for a run 45min
— Mock interview 1h
— Study Tableau documentation 1.5h`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanInput;
