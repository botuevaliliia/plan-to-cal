import { Task, ScheduledEvent } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categoryColorClasses } from '@/utils/categoryColors';
import { Clock, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  events: ScheduledEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export const TaskList = ({ tasks, events, selectedEventId, onSelectEvent }: TaskListProps) => {
  const scheduledTaskIds = new Set(events.map(e => e.id));
  
  return (
    <Card className="h-fit sticky top-24 shadow-lg border-0 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {tasks.map((task) => {
          const isScheduled = scheduledTaskIds.has(task.id);
          const event = events.find(e => e.id === task.id);
          const isSelected = selectedEventId === task.id;
          
          return (
            <div
              key={task.id}
              onClick={() => event && onSelectEvent(task.id)}
              className={cn(
                "p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                isSelected ? "bg-accent border-accent-foreground/20 shadow-md" : "bg-background border-border",
                !isScheduled && "opacity-60"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {isScheduled ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 mb-1.5">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs px-2 py-0.5",
                        categoryColorClasses[task.category],
                        "text-white"
                      )}
                    >
                      {task.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {task.estimatedMinutes}m
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No tasks yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
