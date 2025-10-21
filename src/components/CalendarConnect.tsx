import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CalendarConnectProps {
  onBusySlotsLoaded: (slots: Array<{ start: string; end: string }>) => void;
  onCalendarConnected: (calendar: { type: 'google' | 'microsoft' | 'ics'; name: string; url?: string }) => void;
  timeWindow: { startISO: string; endISO: string } | null;
}

export const CalendarConnect = ({ onBusySlotsLoaded, onCalendarConnected, timeWindow }: CalendarConnectProps) => {
  const [icsUrl, setIcsUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleICSConnect = async () => {
    if (!icsUrl.trim()) {
      toast.error('Please enter a calendar URL');
      return;
    }

    if (!timeWindow) {
      toast.error('Please set a time window first');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching calendar events...', { url: icsUrl, timeWindow });
      
      const { data, error } = await supabase.functions.invoke('fetch-calendar-events', {
        body: {
          type: 'ics',
          url: icsUrl,
          timeMin: timeWindow.startISO,
          timeMax: timeWindow.endISO,
        },
      });

      console.log('Calendar fetch response:', { data, error });

      if (error) {
        console.error('Calendar fetch error:', error);
        throw error;
      }

      if (!data || !data.events) {
        throw new Error('No events data received');
      }

      const busySlots = data.events.map((event: any) => ({
        start: event.start,
        end: event.end,
      }));

      console.log('Loaded busy slots:', busySlots);

      onBusySlotsLoaded(busySlots);
      onCalendarConnected({ type: 'ics', name: 'ICS Calendar', url: icsUrl });
      toast.success(`Connected! Found ${busySlots.length} existing events - they'll appear as grey blocks when you schedule`);
    } catch (error) {
      console.error('ICS fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendar events';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!timeWindow) {
      toast.error('Please set a time window first');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'authorize' },
      });

      if (error) throw error;

      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        toast.info('Complete authorization in the popup window');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Failed to connect Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Connect Calendar
        </CardTitle>
        <CardDescription>
          Import existing events to schedule tasks around them
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ics-url">Calendar URL (ICS/webcal)</Label>
          <div className="flex gap-2">
            <Input
              id="ics-url"
              placeholder="webcal://calendar.google.com/..."
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={handleICSConnect} 
              disabled={loading || !icsUrl.trim()}
              variant="secondary"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            For Apple Calendar: Calendar → Calendar → Share → Public Calendar
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleGoogleConnect} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Connect Google Calendar
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            OAuth integration for automatic sync
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
