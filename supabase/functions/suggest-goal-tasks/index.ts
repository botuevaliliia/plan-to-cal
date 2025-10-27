import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Request received:', req.method);
    const { goal } = await req.json();
    console.log('Request body:', { goal });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    if (!goal) {
      throw new Error('Missing required field: goal');
    }

    const systemPrompt = `You are an expert goal planner that creates realistic, progressive schedules with adequate rest and recovery time.

CRITICAL RULES:
1. SMART TASK QUANTITY: 
   - 1 week = 8-12 tasks
   - 1 month = 25-35 tasks  
   - 3 months = 40-60 tasks
   - 6 months = 60-90 tasks
   
2. MANDATORY REST DAYS:
   - Include 1-2 rest days per week (typically weekends)
   - Add buffer days between intense work periods
   - Never schedule tasks every single day
   
3. REALISTIC WORK HOURS:
   - Tasks during 9 AM - 6 PM only
   - Individual tasks: 30-120 minutes (never longer)
   - Max 2-3 tasks per day
   
4. PROGRESSIVE DIFFICULTY:
   - Week 1: Foundation & easy tasks
   - Week 2-3: Building momentum
   - Mid-period: Peak intensity
   - Final weeks: Consolidation & polish
   
5. DISTRIBUTION ACROSS PERIOD:
   - Spread tasks evenly throughout the ENTIRE timeframe
   - For "3 months" goal, use all ~90 days (with rest days)
   - Don't cram tasks into first few weeks
   
6. TASK QUALITY:
   - Specific actionable steps
   - Clear deliverables
   - Realistic time estimates
   - Detailed instructions in notes
   
7. CATEGORIES: Learning, Applications, Interviews, Study, Fitness, Content, Networking, SPE, Errands

Return as a flat JSON array:
[
  {
    "title": "Specific task title with concrete action",
    "notes": "Detailed step-by-step instructions: what to do, which tools/resources to use, expected outcome",
    "priority": "low" | "medium" | "high",
    "category": "appropriate category",
    "estimatedMinutes": realistic_duration_in_minutes,
    "dayOffset": day_number_from_start (0 for first day, 1 for second day, etc. - distribute evenly with rest days)
  }
]`;

    const userPrompt = `Goal: ${goal}\n\nCreate a comprehensive schedule with daily tasks spread across the entire timeframe. Be realistic about pacing and include specific instructions for each task.`;


    const body: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_schedule",
            description: "Generate a complete schedule with daily tasks for the goal",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      notes: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                      category: { type: "string" },
                      estimatedMinutes: { type: "number" },
                      dayOffset: { type: "number" }
                    },
                    required: ["title", "notes", "priority", "category", "estimatedMinutes", "dayOffset"],
                    additionalProperties: false
                  }
                }
              },
              required: ["tasks"],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "generate_schedule" } }
    };

    console.log('Calling Lovable AI with model: google/gemini-2.5-flash');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI response received, processing...');
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const finalTasks = result.tasks;
    
    console.log('Returning tasks:', finalTasks.length);
    return new Response(JSON.stringify({ tasks: finalTasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-goal-tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
