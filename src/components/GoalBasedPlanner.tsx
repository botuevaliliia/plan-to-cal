import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/task';

interface GoalBasedPlannerProps {
  onTasksGenerated: (tasks: Task[], periodDays?: number) => boolean | Promise<boolean>;
}

interface GeneratedTask {
  title: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  estimatedMinutes: number;
  dayOffset: number;
}

// Extract period from goal text (e.g., "in 3 months", "over 2 weeks")
function extractPeriod(text: string): number | null {
  const patterns = [
    { regex: /(\d+)\s*(month|months)/i, multiplier: 30 },
    { regex: /(\d+)\s*(week|weeks)/i, multiplier: 7 },
    { regex: /(\d+)\s*(day|days)/i, multiplier: 1 },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return parseInt(match[1]) * pattern.multiplier;
    }
  }
  
  return null;
}

export default function GoalBasedPlanner({ onTasksGenerated }: GoalBasedPlannerProps) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast({ title: 'Enter a goal', description: 'Please describe what you want to achieve', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-goal-tasks', {
        body: { goal }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to invoke function');
      }

      if (!data || !data.tasks) {
        throw new Error('Invalid response from function');
      }

      const generatedTasks: GeneratedTask[] = data.tasks;
      
      // Convert to Task objects
      const tasks: Task[] = generatedTasks.map((t, i) => ({
        id: `goal-${Date.now()}-${i}`,
        title: t.title,
        notes: t.notes || '',
        estimatedMinutes: t.estimatedMinutes,
        allowParallel: false,
        category: t.category as any,
        priority: t.priority,
        // Store dayOffset in earliestStart for scheduler to use
        earliestStart: t.dayOffset !== undefined ? `day-${t.dayOffset}` : undefined,
      }));

      // Extract period from goal text
      const periodDays = extractPeriod(goal);

      const success = await Promise.resolve(onTasksGenerated(tasks, periodDays || undefined));
      
      if (success) {
        setGoal('');
        toast({ title: 'Schedule generated!', description: `${tasks.length} tasks created with detailed instructions` });
      }
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      toast({ 
        title: 'Failed to generate schedule', 
        description: error?.message || 'Unknown error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-5 w-5" />
          What do you want to achieve?
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Describe your goal with a timeframe (e.g., "I want to find a job in 3 months" or "Get fit for a half marathon in 12 weeks")
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Example:&#10;• I want to find a software engineering job in the next 3 months&#10;• Learn Spanish fluently in 6 months&#10;• Train for a half marathon in 12 weeks&#10;• Build a startup MVP in 2 months"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="min-h-[150px]"
        />
        <Button
          onClick={handleGenerate}
          disabled={loading || !goal.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Your Schedule...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Schedule
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
