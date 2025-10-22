import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeWindow } from '@/types/task';
import { TimeWindowEditor } from './TimeWindowEditor';

interface ConflictWarning {
  taskTitle: string;
  reason: string;
  suggestedTime?: string;
}

interface ConflictWarningsProps {
  conflicts: ConflictWarning[];
  timeWindow: TimeWindow;
  onTimeWindowUpdate: (timeWindow: TimeWindow) => void;
  onReschedule: () => void;
}

export const ConflictWarnings = ({ 
  conflicts, 
  timeWindow, 
  onTimeWindowUpdate, 
  onReschedule 
}: ConflictWarningsProps) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4 border-destructive/50 bg-destructive/5">
        <Alert variant="destructive" className="border-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="mb-2">
            {conflicts.length} Task{conflicts.length > 1 ? 's' : ''} Could Not Be Scheduled
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded bg-background/50"
                >
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conflict.taskTitle}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {conflict.reason}
                    </div>
                    {conflict.suggestedTime && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Earliest: {conflict.suggestedTime}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      </Card>
      
      <TimeWindowEditor 
        timeWindow={timeWindow}
        onUpdate={onTimeWindowUpdate}
        onReschedule={onReschedule}
      />
    </div>
  );
};
