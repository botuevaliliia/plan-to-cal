import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    console.log('Parsing input:', text);

    const systemPrompt = `You are an intelligent task and goal scheduler. You can handle two types of inputs:

1. TASK LIST: Simple list of tasks to parse
2. GOAL-BASED: A goal statement that needs a progressive schedule (e.g., "train for half marathon", "read 10 books in 3 months")

For TASK LIST inputs, extract each task with:
- title: string (cleaned description)
- estimatedMinutes: number (parse from "2h", "45min", or default 60)
- category: Interviews, Applications, SPE, Study, Fitness, Errands, Content, Networking, Learning, Default
- allowParallel: boolean (true if "parallel" mentioned)

For GOAL-BASED inputs, generate a PROGRESSIVE RECURRING SCHEDULE:
- Break the goal into progressive steps (e.g., week 1: 5km, week 2: 7km, week 3: 10km)
- Create recurring tasks with proper patterns
- Use recurring field: { freq: "WEEKLY" or "DAILY", count: number, byDay: ["MO","TU","WE","TH","FR","SA","SU"] }
- Make it realistic and progressive
- Include rest days for fitness goals
- Spread learning/reading goals across available time

Category hints:
- "interview", "интервью" → Interviews
- "apply", "вакансий", "linkedin" → Applications
- "spe", "seo", "mvp" → SPE
- "study", "read", "book", "прочитать" → Study
- "workout", "gym", "run", "fitness", "бег" → Fitness
- "buy", "errand", "купить" → Errands
- "content", "write", "journal" → Content
- "network", "club", "cafe" → Networking
- "yc", "course", "learn" → Learning

CRITICAL: Return ONLY valid JSON array. No markdown, no explanation.`;


    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to parse with AI', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);

    // Parse the JSON from the response
    let tasks;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      tasks = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON from AI', content }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add IDs to tasks
    const tasksWithIds = tasks.map((task: any) => ({
      ...task,
      id: crypto.randomUUID(),
    }));

    console.log('Parsed tasks:', tasksWithIds);

    return new Response(JSON.stringify({ tasks: tasksWithIds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-tasks function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
