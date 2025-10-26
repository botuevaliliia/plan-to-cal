import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/types/task';

interface GoalBasedPlannerProps {
  onTasksGenerated: (tasks: Task[]) => boolean | Promise<boolean>;
}

interface SuggestedTask {
  title: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  estimatedMinutes: number;
  notes?: string;
}

export default function GoalBasedPlanner({ onTasksGenerated }: GoalBasedPlannerProps) {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'input' | 'suggestions' | 'detailed'>('input');
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    if (!goal.trim()) {
      toast({ title: 'Enter a goal', description: 'Please describe what you want to learn or achieve', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-goal-tasks', {
        body: { goal, type: 'suggest' }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to invoke function');
      }

      if (!data || !data.tasks) {
        throw new Error('Invalid response from function');
      }

      setSuggestions(data.tasks);
      setStage('suggestions');
      setApproved(new Set());
      toast({ title: 'Suggestions generated!', description: 'Review and approve tasks you want to add' });
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({ 
        title: 'Failed to generate suggestions', 
        description: error?.message || 'Unknown error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = (index: number) => {
    const newApproved = new Set(approved);
    if (newApproved.has(index)) {
      newApproved.delete(index);
    } else {
      newApproved.add(index);
    }
    setApproved(newApproved);
  };

  const handleGenerateDetails = async () => {
    if (approved.size === 0) {
      toast({ title: 'No tasks selected', description: 'Please approve at least one task', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const approvedTasks = suggestions.filter((_, i) => approved.has(i));
      
      // Send only essential task info to reduce payload size
      const tasksSummary = approvedTasks.map(t => ({
        title: t.title,
        category: t.category,
        estimatedMinutes: t.estimatedMinutes,
        priority: t.priority
      }));
      
      console.log(`Generating details for ${tasksSummary.length} tasks...`);
      
      const { data, error } = await supabase.functions.invoke('suggest-goal-tasks', {
        body: { goal, type: 'detail', tasks: tasksSummary }
      });

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to generate detailed instructions');
      }

      if (!data || !data.tasks) {
        throw new Error('Invalid response from function');
      }

      const detailedTasks: Task[] = data.tasks.map((t: SuggestedTask, i: number) => ({
        id: `goal-${Date.now()}-${i}`,
        title: t.title,
        notes: t.notes || '',
        estimatedMinutes: t.estimatedMinutes,
        allowParallel: false,
        category: t.category as any,
        priority: t.priority
      }));

      const success = await Promise.resolve(onTasksGenerated(detailedTasks));
      
      if (success) {
        // Reset
        setStage('input');
        setGoal('');
        setSuggestions([]);
        setApproved(new Set());
        
        toast({ title: 'Tasks added!', description: `${detailedTasks.length} tasks with detailed instructions added to your plan` });
      }
    } catch (error: any) {
      console.error('Error generating details:', error);
      toast({ 
        title: 'Failed to generate details', 
        description: error?.message || 'Unknown error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (stage === 'suggestions') {
    return (
      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5" />
            Review Suggestions
          </CardTitle>
          <CardDescription className="text-muted-foreground">Goal: {goal}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestions.map((task, i) => (
            <Card 
              key={i}
              className={`cursor-pointer transition-all border ${approved.has(i) ? 'border-foreground/50 bg-accent' : 'border-border/30 hover:border-border/60'}`}
              onClick={() => toggleApproval(i)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${approved.has(i) ? 'border-foreground bg-foreground' : 'border-muted-foreground'}`}>
                  {approved.has(i) && <Check className="h-3 w-3 text-background" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{task.title}</span>
                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-3">
                    <span>{task.category}</span>
                    <span>•</span>
                    <span>{task.estimatedMinutes} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStage('input')}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleGenerateDetails}
              disabled={loading || approved.size === 0}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Details for {approved.size} Task{approved.size !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add {approved.size} Task{approved.size !== 1 ? 's' : ''} with Details
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5" />
          Goal-Based Planner
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tell us what you want to learn, achieve, or explore, and we'll suggest a progressive plan with detailed instructions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., I want to become a blogger, learn Python, improve my fitness..."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="min-h-[100px]"
        />
        <Button
          onClick={handleGenerateSuggestions}
          disabled={loading || !goal.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Suggestions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get AI Suggestions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
