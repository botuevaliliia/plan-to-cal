import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Draggable } from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import { EventDropArg } from '@fullcalendar/core';
import { DateTime } from 'luxon';
import { usePlanStore } from '@/store/planStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { categoryColors } from '@/utils/categoryColors';
import { generateICS, downloadICS } from '@/utils/icsExport';
import { Calendar, Download, ArrowLeft } from 'lucide-react';
import { TaskList } from '@/components/TaskList';
import { ConflictWarnings } from '@/components/ConflictWarnings';
import { CalendarConnect } from '@/components/CalendarConnect';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';

const CalendarView = () => {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const { 
    events, 
    tasks, 
    timeWindow, 
    updateEvent, 
    setEvents, 
    busySlots, 
    connectedCalendar, 
    conflicts,
    setTimeWindow,
    setConflicts,
    setBusySlots,
    setConnectedCalendar,
    setTasks,
    removeEvent,
  } = usePlanStore();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const draggableInitRef = useRef(false);
  
  // Initialize external drag for tasks
  useEffect(() => {
    if (draggableInitRef.current) return;
    const container = document.getElementById('external-tasks');
    if (container) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DraggableClass: any = Draggable;
      if (DraggableClass) {
        new DraggableClass(container, {
          itemSelector: '.fc-task',
          eventData: (el: HTMLElement) => {
            const id = el.getAttribute('data-task-id') || '';
            const title = el.getAttribute('data-title') || '';
            const minutes = Number(el.getAttribute('data-duration')) || 30;
            const category = el.getAttribute('data-category') || 'Default';
            const notes = el.getAttribute('data-notes') || '';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const pad = (n: number) => String(n).padStart(2, '0');
            return {
              id,
              title,
              duration: `${pad(hours)}:${pad(mins)}:00`,
              extendedProps: { category, notes },
            };
          },
        });
        draggableInitRef.current = true;
      }
    }
  }, [tasks]);
  
  // Auto-refresh connected ICS calendar busy slots when time window or calendar URL changes
  useEffect(() => {
    const fetchBusyFromICS = async () => {
      try {
        if (!timeWindow || !connectedCalendar || connectedCalendar.type !== 'ics' || !connectedCalendar.url) return;
        console.log('Auto-fetching ICS busy slots...', { url: connectedCalendar.url, timeWindow });
        const { data, error } = await supabase.functions.invoke('fetch-calendar-events', {
          body: {
            type: 'ics',
            url: connectedCalendar.url,
            timeMin: timeWindow.startISO,
            timeMax: timeWindow.endISO,
          },
        });
        if (error) throw error;
        if (!data || !data.events) return;
        const slots = data.events.map((event: any) => ({
          start: event.start,
          end: event.end,
          title: event.summary,
        }));
        setBusySlots(slots);
        console.log('ICS busy slots updated:', slots.length);
      } catch (err) {
        console.error('Failed to auto-fetch ICS events:', err);
        toast.error('Failed to refresh connected calendar');
      }
    };
    fetchBusyFromICS();
  }, [connectedCalendar?.url, timeWindow?.startISO, timeWindow?.endISO]);
  
  const handleEventDrop = (info: EventDropArg) => {
    const { event } = info;
    const startISO = event.start?.toISOString() || '';
    const endISO = event.end?.toISOString() || '';
    
    updateEvent(event.id, { startISO, endISO });
    toast.success('Event moved');
  };
  
  const handleEventResize = (info: any) => {
    const { event } = info;
    const startISO = event.start?.toISOString() || '';
    const endISO = event.end?.toISOString() || '';
    
    updateEvent(event.id, { startISO, endISO });
    toast.success('Event duration updated');
  };
  
  const handleEventReceive = (info: any) => {
    const { event } = info;
    const startISO = event.start?.toISOString() || '';
    const endISO = event.end?.toISOString() || '';
    const category = (event.extendedProps as any)?.category || 'Default';
    const notes = (event.extendedProps as any)?.notes || '';

    if (!startISO || !endISO) {
      toast.error('Could not place the task. Try dropping into a timed slot.');
      event.remove();
      return;
    }

    const exists = events.some(e => e.id === event.id);
    const newEvent = {
      id: event.id,
      title: event.title || 'Task',
      startISO,
      endISO,
      category,
      notes,
    };
    if (exists) {
      updateEvent(event.id, newEvent);
    } else {
      setEvents([...events, newEvent]);
    }
    toast.success('Task scheduled');
  };
  
  const handleExportICS = () => {
    try {
      const icsContent = generateICS(events, timeWindow?.timezone);
      const startDate = timeWindow?.startISO ? DateTime.fromISO(timeWindow.startISO).toFormat('yyyy-MM-dd') : 'plan';
      const endDate = timeWindow?.endISO ? DateTime.fromISO(timeWindow.endISO).toFormat('yyyy-MM-dd') : '';
      const filename = `plan-${startDate}${endDate ? '--' + endDate : ''}.ics`;
      
      downloadICS(icsContent, filename);
      toast.success('Calendar exported!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export calendar');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    removeEvent(taskId);
    toast.success('Task deleted');
  };

  const handleReschedule = () => {
    if (!timeWindow) {
      toast.error('No time window set');
      return;
    }

    try {
      const { scheduleTasksExpanded } = require('@/utils/schedulerExpanded');
      const { events: newEvents, conflicts: newConflicts } = scheduleTasksExpanded(
        tasks,
        timeWindow,
        busySlots
      );
      
      setEvents(newEvents);
      setConflicts(newConflicts);
      
      toast.success(`Rescheduled ${newEvents.length} events${newConflicts.length > 0 ? ` (${newConflicts.length} conflicts remain)` : ''}`);
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error('Failed to reschedule tasks');
    }
  };

  const handleDateClick = (arg: any) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView('timeGridWeek', arg.dateStr);
    }
  };
  
  console.log('Calendar rendering with busySlots:', busySlots.length);
  
  const calendarEvents = [
    ...events.map((event) => {
      const calEvent: any = {
        id: event.id,
        title: event.title,
        start: event.startISO,
        end: event.endISO,
        backgroundColor: categoryColors[event.category],
        borderColor: categoryColors[event.category],
        extendedProps: {
          category: event.category,
          notes: event.notes,
          allowParallel: event.allowParallel,
        },
      };
      
      // Add rrule for recurring events
      if (event.rrule) {
        calEvent.rrule = event.rrule;
        calEvent.duration = DateTime.fromISO(event.endISO).diff(DateTime.fromISO(event.startISO)).toMillis();
      }
      
      return calEvent;
    }),
    // Add busy slots from connected calendar as read-only events
    ...busySlots.map((slot, idx) => ({
      id: `busy-${idx}`,
      title: slot.title ? `📅 ${slot.title}` : '🔒 Busy',
      start: slot.start,
      end: slot.end,
      backgroundColor: 'rgba(107, 114, 128, 0.5)',
      borderColor: 'rgba(107, 114, 128, 0.9)',
      textColor: 'rgba(55, 65, 81, 1)',
      editable: false,
      display: 'block',
      classNames: ['busy-slot-highlight'],
      extendedProps: {
        isBusySlot: true,
      },
    })),
  ];
  
  return (
    <AppLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6" />
                <div>
                  <h1 className="text-xl font-mono uppercase tracking-tight">Your Schedule</h1>
                  <p className="text-sm text-muted-foreground">
                    {events.length} events scheduled
                    {connectedCalendar && ` • ${busySlots.length} busy slots from ${connectedCalendar.name}`}
                  </p>
                </div>
              </div>
            </div>
            
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportICS}
                disabled={events.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export .ICS
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Task List */}
          <div className="lg:col-span-1 space-y-4">
            <TaskList
              tasks={tasks}
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              onDeleteTask={handleDeleteTask}
            />

            {/* Connect Calendar (ICS) */}
            <CalendarConnect
              onBusySlotsLoaded={(slots) => {
                setBusySlots(slots);
                toast.success(`Imported ${slots.length} events from your calendar`);
              }}
              onCalendarConnected={(calendar) => {
                setConnectedCalendar(calendar);
                toast.info(`Connected to ${calendar.name}`);
              }}
              timeWindow={timeWindow ? { startISO: timeWindow.startISO, endISO: timeWindow.endISO } : null}
            />
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Conflict Warnings */}
            {conflicts && conflicts.length > 0 && timeWindow && (
              <ConflictWarnings 
                conflicts={conflicts} 
                timeWindow={timeWindow}
                onTimeWindowUpdate={setTimeWindow}
                onReschedule={handleReschedule}
              />
            )}
            
            <Card className="p-6 border border-border/50 bg-card">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
                initialView="dayGridMonth"
                initialDate={timeWindow?.startISO}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                allDaySlot={false}
                editable={true}
                droppable={true}
                events={calendarEvents}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                eventReceive={handleEventReceive}
                eventClick={(info) => setSelectedEventId(info.event.id)}
                dateClick={handleDateClick}
                height="auto"
                nowIndicator={true}
                slotDuration="00:30:00"
                snapDuration="00:15:00"
                businessHours={{
                  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                  startTime: timeWindow?.workHours?.start || '09:00',
                  endTime: timeWindow?.workHours?.end || '18:00',
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
};

export default CalendarView;
