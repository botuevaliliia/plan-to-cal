import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GoalBasedPlanner from '@/components/GoalBasedPlanner';
import { usePlanStore } from '@/store/planStore';
import { useNavigate } from 'react-router-dom';
import { scheduleTasksExpanded } from '@/utils/schedulerExpanded';
import { Task } from '@/types/task';

export default function Chat() {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [deadline, setDeadline] = useState('');
  const [duration, setDuration] = useState('60');
  const [loading, setLoading] = useState(false);
  const [savedWeblinks, setSavedWeblinks] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [newWeblinkName, setNewWeblinkName] = useState('');
  const [newWeblinkUrl, setNewWeblinkUrl] = useState('');
  const { user } = useAuth();
  const { setEvents, setConflicts, busySlots } = usePlanStore();
  const navigate = useNavigate();

  const loadWeblinks = async () => {
    const { data, error } = await supabase
      .from('calendar_weblinks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading weblinks:', error);
    } else {
      setSavedWeblinks(data || []);
    }
  };

  const handleSaveWeblink = async () => {
    if (!newWeblinkName.trim() || !newWeblinkUrl.trim()) {
      toast.error('Please enter both name and URL');
      return;
    }

    const { error } = await supabase
      .from('calendar_weblinks')
      .insert({
        user_id: user?.id,
        name: newWeblinkName.trim(),
        url: newWeblinkUrl.trim(),
      });

    if (error) {
      toast.error('Failed to save weblink');
      console.error(error);
    } else {
      toast.success('Weblink saved!');
      setNewWeblinkName('');
      setNewWeblinkUrl('');
      loadWeblinks();
    }
  };

  const handleDeleteWeblink = async (id: string) => {
    const { error } = await supabase
      .from('calendar_weblinks')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete weblink');
    } else {
      toast.success('Weblink deleted');
      loadWeblinks();
    }
  };

  const handleSimpleTaskSubmit = async () => {
    if (!taskTitle.trim() || !deadline) {
      toast.error('Please enter task title and deadline');
      return;
    }

    setLoading(true);
    try {
      const task: Task = {
        id: `task-${Date.now()}`,
        title: taskTitle,
        notes: taskNotes,
        estimatedMinutes: parseInt(duration),
        latestEnd: new Date(deadline).toISOString(),
        allowParallel: false,
        category: 'Default',
        priority: 'medium',
      };

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const deadlineDate = new Date(deadline);
      
      const result = scheduleTasksExpanded(
        [task],
        {
          startISO: now.toISOString(),
          endISO: deadlineDate.toISOString(),
          workHours: { start: '09:00', end: '18:00' },
          timezone,
        },
        busySlots
      );

      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts.map(c => ({
          taskTitle: taskTitle,
          reason: c.reason,
        })));
        toast.error('Could not schedule task due to conflicts');
      } else {
        setEvents(result.events);
        toast.success('Task scheduled!');
        navigate('/calendar');
      }

      setTaskTitle('');
      setTaskNotes('');
      setDeadline('');
      setDuration('60');
    } catch (error) {
      console.error('Error scheduling task:', error);
      toast.error('Failed to schedule task');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalTasksGenerated = async (tasks: Task[], periodDays?: number) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const endDate = new Date(now.getTime() + (periodDays || 90) * 24 * 60 * 60 * 1000);

    const result = scheduleTasksExpanded(
      tasks,
      {
        startISO: now.toISOString(),
        endISO: endDate.toISOString(),
        workHours: { start: '09:00', end: '18:00' },
        timezone,
      },
      busySlots
    );

    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts.map(c => ({
        taskTitle: 'Task',
        reason: c.reason,
      })));
      toast.error(`${result.conflicts.length} conflicts detected`);
    } else {
      setEvents(result.events);
      toast.success('Schedule created!');
      navigate('/calendar');
    }

    return true;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Tabs defaultValue="goal" onValueChange={(value) => {
          if (value === 'weblinks') loadWeblinks();
        }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="goal">Goal-Based</TabsTrigger>
            <TabsTrigger value="simple">Simple Task</TabsTrigger>
            <TabsTrigger value="weblinks">My Weblinks</TabsTrigger>
          </TabsList>

          <TabsContent value="goal" className="space-y-4 mt-6">
            <GoalBasedPlanner onTasksGenerated={handleGoalTasksGenerated} />
          </TabsContent>

          <TabsContent value="simple" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Add Simple Task
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="task-title">Task Title</Label>
                  <Input
                    id="task-title"
                    placeholder="e.g., Build MVP in Lovable"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="task-notes">Notes (Optional)</Label>
                  <Textarea
                    id="task-notes"
                    placeholder="Additional details..."
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSimpleTaskSubmit}
                  disabled={loading || !taskTitle.trim() || !deadline}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Task'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weblinks" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Save Calendar Weblinks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="weblink-name">Name</Label>
                  <Input
                    id="weblink-name"
                    placeholder="e.g., My Google Calendar"
                    value={newWeblinkName}
                    onChange={(e) => setNewWeblinkName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="weblink-url">URL</Label>
                  <Input
                    id="weblink-url"
                    placeholder="webcal://..."
                    value={newWeblinkUrl}
                    onChange={(e) => setNewWeblinkUrl(e.target.value)}
                  />
                </div>

                <Button onClick={handleSaveWeblink} className="w-full">
                  Save Weblink
                </Button>

                <div className="space-y-2 mt-6">
                  <h3 className="text-sm font-medium">Saved Weblinks</h3>
                  {savedWeblinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved weblinks yet</p>
                  ) : (
                    savedWeblinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3 border border-border rounded-md"
                      >
                        <div>
                          <p className="font-medium">{link.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {link.url}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWeblink(link.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
