import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    console.log("Parsing input:", text);

    const systemPrompt = `You are a task scheduler. Parse input and return a FLAT JSON array of tasks.

OUTPUT FORMAT — Return ONLY a flat array like this (no wrapper objects, no markdown):
[
  {
    "title": "Task name",
    "estimatedMinutes": 60,
    "category": "Fitness",
    "allowParallel": false,
    "recurring": { "freq": "WEEKLY", "count": 12, "byDay": ["MO","WE","FR"], "startWeekOffset": 0 },
    "startTime": "17:00"
  }
]

FIELDS
- title: short, human-readable; include concrete details (e.g., distance, pace target)
- estimatedMinutes: integer duration in minutes
- category: one of ["Interviews","Applications","SPE","Study","Fitness","Errands","Content","Networking","Learning","Default"]
- allowParallel: boolean
- startTime: optional "HH:mm" local suggestion
- recurring:
  - freq: "DAILY" | "WEEKLY" | "MONTHLY"
  - count: integer number of occurrences
  - byDay: array of ["MO","TU","WE","TH","FR","SA","SU"]
  - startWeekOffset: integer >= 0 to delay start by N weeks from the selected window start

GOAL-BASED INPUTS (e.g., “train for a half marathon in 3 months”)
- Expand into WEEK-BY-WEEK tasks with **specific workouts** (Easy, Tempo, Intervals/Hills, Long Run, Optional Recovery/Strength).
- Use **one task per week per workout** with:
  - "recurring": { "freq":"WEEKLY", "count": 1, "byDay": ["<day>"], "startWeekOffset": <weekIndex> }
  - Put exact distance/pace in the **title**.
  - Set "estimatedMinutes" realistically from the distance and target pace.
  - Provide helpful "startTime" suggestions (vary: e.g., Tue 17:00, Thu 07:30, Sat 09:00).
- Progress load sensibly: 2–3 build weeks, 1 cutback week; gradually increase long-run distance; include taper weeks before race.
- If the user mentions current fitness (e.g., “can run 13 km at 10–11 km/h”), calibrate paces and durations accordingly.
- Keep array FLAT. No nested weeks/blocks. No markdown. Return ONLY JSON.
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to parse with AI", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log("AI response:", content);

    // Parse the JSON from the response
    let tasks;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      // Handle nested structure (if AI returns {goal, schedule: [{tasks}]} format)
      if (parsed[0]?.schedule && Array.isArray(parsed[0].schedule)) {
        console.log("Flattening nested schedule structure");
        tasks = parsed[0].schedule.flatMap((week: any) => week.tasks || []);
      } else {
        tasks = parsed;
      }
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON from AI", content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add IDs to tasks and ensure proper format
    const tasksWithIds = tasks.map((task: any) => ({
      id: crypto.randomUUID(),
      title: task.title,
      estimatedMinutes: task.estimatedMinutes || 60,
      category: task.category || "Default",
      allowParallel: task.allowParallel || false,
      notes: task.description || task.notes,
      recurring: task.recurring,
      startTime: task.startTime, // optional HH:mm
    }));

    console.log("Parsed tasks:", tasksWithIds.length, "tasks");

    return new Response(JSON.stringify({ tasks: tasksWithIds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in parse-tasks function:", error);

    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Request timeout - please try again"
          : error.message
        : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error instanceof Error && error.name === "AbortError" ? 408 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
