import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, RefreshCw } from 'lucide-react';
import { TimeWindow } from '@/types/task';
import { toast } from '@/hooks/use-toast';

interface TimeWindowEditorProps {
  timeWindow: TimeWindow;
  onUpdate: (timeWindow: TimeWindow) => void;
  onReschedule: () => void;
}

export const TimeWindowEditor = ({ timeWindow, onUpdate, onReschedule }: TimeWindowEditorProps) => {
  const [startDate, setStartDate] = useState(
    timeWindow.startISO ? new Date(timeWindow.startISO).toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    timeWindow.endISO ? new Date(timeWindow.endISO).toISOString().split('T')[0] : ''
  );
  const [workStart, setWorkStart] = useState(timeWindow.workHours?.start || '09:00');
  const [workEnd, setWorkEnd] = useState(timeWindow.workHours?.end || '18:00');

  const handleApply = () => {
    console.log('Apply button clicked', { startDate, endDate, workStart, workEnd });
    
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please set both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    const updated: TimeWindow = {
      startISO: new Date(startDate).toISOString(),
      endISO: new Date(endDate).toISOString(),
      workHours: { start: workStart, end: workEnd },
      timezone: timeWindow.timezone,
    };

    console.log('Updating time window:', updated);
    onUpdate(updated);
    
    toast({
      title: "Time window updated",
      description: "Click 'Apply & Reschedule' to update your schedule with the new time range",
    });
  };

  return (
    <Card className="border border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider">
          <Calendar className="w-4 h-4" />
          Adjust Schedule Window
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Modify dates or work hours to resolve conflicts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-start-date" className="text-xs">Start Date</Label>
            <Input
              id="edit-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="edit-end-date" className="text-xs">End Date</Label>
            <Input
              id="edit-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-work-start" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Work Start
            </Label>
            <Input
              id="edit-work-start"
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label htmlFor="edit-work-end" className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Work End
            </Label>
            <Input
              id="edit-work-end"
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => {
              console.log('Apply & Reschedule clicked');
              handleApply();
              setTimeout(onReschedule, 200);
            }}
            size="sm"
            className="flex-1 h-8 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Apply & Reschedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
