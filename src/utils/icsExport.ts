import { createEvents, EventAttributes } from 'ics';
import { ScheduledEvent } from '@/types/task';
import { DateTime } from 'luxon';

export function generateICS(events: ScheduledEvent[], timezone: string = 'America/New_York'): string {
  const icsEvents: EventAttributes[] = events.map((event) => {
    const start = DateTime.fromISO(event.startISO, { zone: timezone });
    const end = DateTime.fromISO(event.endISO, { zone: timezone });
    
    const icsEvent: EventAttributes = {
      start: [start.year, start.month, start.day, start.hour, start.minute],
      end: [end.year, end.month, end.day, end.hour, end.minute],
      title: event.title,
      description: event.notes || '',
      categories: [event.category],
      uid: event.id,
      alarms: [
        {
          action: 'display',
          trigger: { minutes: 10, before: true },
          description: 'Reminder',
        },
      ],
    };
    
    return icsEvent;
  });
  
  const { error, value } = createEvents(icsEvents);
  
  if (error) {
    console.error('ICS generation error:', error);
    throw new Error('Failed to generate ICS file');
  }
  
  return value || '';
}

export function downloadICS(icsContent: string, filename: string = 'plan.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
