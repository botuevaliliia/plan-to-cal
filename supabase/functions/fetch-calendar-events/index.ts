import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, url, timeMin, timeMax } = await req.json();

    if (type === 'ics') {
      console.log('Fetching ICS calendar from:', url);
      
      // Convert webcal:// to https://
      const fetchUrl = url.replace('webcal://', 'https://');
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ICS: ${response.statusText}`);
      }

      const icsData = await response.text();
      console.log('ICS data length:', icsData.length);

      // Parse ICS data
      const events = parseICS(icsData, timeMin, timeMax);
      console.log('Parsed events:', events.length);

      return new Response(
        JSON.stringify({ events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported calendar type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Calendar fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseICS(icsData: string, timeMin: string, timeMax: string): Array<{ start: string; end: string; summary: string }> {
  const events: Array<{ start: string; end: string; summary: string }> = [];
  const lines = icsData.split(/\r?\n/);
  
  let inEvent = false;
  let currentEvent: any = {};
  
  const minDate = new Date(timeMin);
  const maxDate = new Date(timeMax);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      // Check if event is within time window
      if (currentEvent.start && currentEvent.end) {
        const eventStart = parseICSDate(currentEvent.start);
        const eventEnd = parseICSDate(currentEvent.end);
        
        if (eventStart && eventEnd && eventStart < maxDate && eventEnd > minDate) {
          events.push({
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            summary: currentEvent.summary || 'Busy',
          });
        }
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('DTSTART')) {
        currentEvent.start = line.split(':')[1];
      } else if (line.startsWith('DTEND')) {
        currentEvent.end = line.split(':')[1];
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      }
    }
  }
  
  return events;
}

function parseICSDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Handle YYYYMMDDTHHMMSSZ format
  if (dateStr.length === 16 && dateStr.includes('T')) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15));
    
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  
  // Handle YYYYMMDD format (all-day events)
  if (dateStr.length === 8) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    
    return new Date(year, month, day);
  }
  
  return null;
}
