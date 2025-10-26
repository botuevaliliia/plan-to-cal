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
    const { goal, type, tasks } = await req.json();
    console.log('Request body:', { goal, type, tasksCount: tasks?.length });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    if (!goal || !type) {
      throw new Error('Missing required fields: goal and type');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'suggest') {
      systemPrompt = `You are a goal achievement advisor. When given a learning or achievement goal, suggest 3-5 actionable tasks that form a progressive learning path. Each task should be realistic and specific.

Return suggestions as a flat JSON array with this structure:
[
  {
    "title": "Task name",
    "priority": "low" | "medium" | "high",
    "category": "Learning" | "Content" | "Networking" | "Study" | etc,
    "estimatedMinutes": number
  }
]`;
      userPrompt = `Goal: ${goal}\n\nSuggest 3-5 progressive tasks to achieve this goal.`;
    } else if (type === 'detail') {
      systemPrompt = `You are a detailed task planner. For each task, provide extremely specific, actionable step-by-step instructions that leave no room for confusion. Be concrete about what to do, what tools to use, and what the output should look like.

Return detailed tasks as a flat JSON array with this structure:
[
  {
    "title": "Task name",
    "notes": "Very detailed step-by-step instructions on exactly what to do during this time block",
    "priority": "low" | "medium" | "high",
    "category": "Task category",
    "estimatedMinutes": number
  }
]`;
      userPrompt = `Goal: ${goal}\n\nTasks to detail:\n${JSON.stringify(tasks, null, 2)}\n\nFor each task, provide extremely specific instructions on exactly what to do, which tools to use, and what to create.`;
    }

    const body: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    };

    if (type === 'suggest') {
      body.tools = [
        {
          type: "function",
          function: {
            name: "suggest_tasks",
            description: "Return 3-5 actionable task suggestions.",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      priority: { type: "string", enum: ["low", "medium", "high"] },
                      category: { type: "string" },
                      estimatedMinutes: { type: "number" }
                    },
                    required: ["title", "priority", "category", "estimatedMinutes"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "suggest_tasks" } };
    } else {
      body.tools = [
        {
          type: "function",
          function: {
            name: "detail_tasks",
            description: "Return detailed task instructions.",
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
                      estimatedMinutes: { type: "number" }
                    },
                    required: ["title", "notes", "priority", "category", "estimatedMinutes"],
                    additionalProperties: false
                  }
                }
              },
              required: ["tasks"],
              additionalProperties: false
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "detail_tasks" } };
    }

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
    const finalTasks = type === 'suggest' ? result.suggestions : result.tasks;
    
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
