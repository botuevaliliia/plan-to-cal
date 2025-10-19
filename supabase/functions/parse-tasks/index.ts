import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    console.log('Parsing tasks with OpenAI:', text);

    const systemPrompt = `You are a task parser. Extract tasks from plain text input and return structured JSON.

Each task should have:
- title: string (the task description, cleaned up)
- estimatedMinutes: number (default 60 if not specified, parse from patterns like "2h", "45min", "1.5hrs")
- category: one of: Interviews, Applications, SPE, Study, Fitness, Errands, Content, Networking, Learning, Default
- allowParallel: boolean (true if mentions "parallel", "simultaneously", "паралл", false otherwise)

Category mapping hints:
- "interview", "интервью", "mock interview", "why google" → Interviews
- "apply", "application", "вакансий", "linkedin", "податься" → Applications
- "spe", "seo", "integrate", "mvp", "tableau", "looker" → SPE
- "study", "read", "book", "прочитать", "курс", "course" → Study
- "workout", "gym", "run", "fitness", "бег", "накачаться" → Fitness
- "buy", "purchase", "errand", "купить", "вернуть" → Errands
- "write", "content", "post", "journal" → Content
- "network", "meetup", "club", "cafe", "венчур" → Networking
- "yc", "learn", "documentation", "docs" → Learning
- default → Default

Return ONLY valid JSON array of tasks, no markdown, no explanation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse these tasks:\n${text}` }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to parse with AI', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI response:', content);

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
