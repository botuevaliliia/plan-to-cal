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

  console.log('Parsing ICS with time window:', { timeMin, timeMax, totalLines: lines.length });

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Handle line continuation (lines starting with space or tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].trim();
    }
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      // Check if event is within time window
      if (currentEvent.start && currentEvent.end) {
        const eventStart = parseICSDate(currentEvent.start);
        const eventEnd = parseICSDate(currentEvent.end);
        
        console.log('Event parsed:', { 
          summary: currentEvent.summary, 
          start: currentEvent.start, 
          end: currentEvent.end,
          parsedStart: eventStart?.toISOString(),
          parsedEnd: eventEnd?.toISOString()
        });
        
        if (eventStart && eventEnd && eventStart < maxDate && eventEnd > minDate) {
          events.push({
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            summary: currentEvent.summary || 'Busy',
          });
        }
      } else {
        console.log('Skipped event - missing start or end:', currentEvent);
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('DTSTART')) {
        // Extract value after the colon, handling parameters like ;TZID=...
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          currentEvent.start = line.substring(colonIndex + 1);
          // Check for timezone parameter
          const tzidMatch = line.match(/;TZID=([^:]+):/);
          if (tzidMatch) {
            currentEvent.startTzid = tzidMatch[1];
          }
        }
      } else if (line.startsWith('DTEND')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          currentEvent.end = line.substring(colonIndex + 1);
          const tzidMatch = line.match(/;TZID=([^:]+):/);
          if (tzidMatch) {
            currentEvent.endTzid = tzidMatch[1];
          }
        }
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      }
    }
  }
  
  console.log('Total events parsed and filtered:', events.length);
  return events;
}

function parseICSDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Remove any whitespace
  dateStr = dateStr.trim();
  
  // Handle YYYYMMDDTHHMMSSZ format (UTC)
  if (dateStr.endsWith('Z') && dateStr.includes('T')) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15));
    
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  
  // Handle YYYYMMDDTHHMMSS format (floating time - treat as local)
  if (dateStr.includes('T') && dateStr.length >= 15) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15));
    
    // For floating times, create as UTC (will be displayed in user's timezone)
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  
  // Handle YYYYMMDD format (all-day events)
  if (dateStr.length === 8 && !dateStr.includes('T')) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    
    // All-day events start at midnight UTC
    return new Date(Date.UTC(year, month, day, 0, 0, 0));
  }
  
  console.log('Could not parse date format:', dateStr);
  return null;
}
