import { Task, TaskCategory } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';

// Category keyword mappings
const categoryKeywords: Record<TaskCategory, string[]> = {
  Interviews: ['интервью', 'interview', 'why google', 'tmay', 'pm eval', 'mock interview'],
  Applications: ['податься', 'вакансій', 'linkedin', 'whoop', 'apply', 'application', 'job'],
  SPE: ['spe', 'інтегрувати', 'seo', 'тікток', 'looker', 'chartio', 'tableau', 'mvp'],
  Study: ['прочитати', 'read', 'book', 'study', 'learn'],
  Fitness: ['біг', 'накачатися', 'помитися', 'сон', 'workout', 'gym', 'exercise', 'fitness', 'run', 'sleep'],
  Errands: ['повернути', 'купити', 'тур', 'зустріч', 'buy', 'purchase', 'return', 'errand'],
  Content: ['content', 'write', 'post', 'blog', 'video', 'journal'],
  Networking: ['венчур кафе', 'network', 'coffee', 'meetup', 'venture cafe', 'club'],
  Learning: ['yc', 'курс', 'course', 'tutorial', 'documentation', 'docs'],
  Default: [],
};

function detectCategory(text: string): TaskCategory {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return category as TaskCategory;
    }
  }
  
  return 'Default';
}

function parseDuration(text: string): number {
  // Match patterns like: 2h, 45min, 1.5hrs, etc.
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|час|часа|часів)/i);
  const minMatch = text.match(/(\d+)\s*(?:m|min|mins|мін|хвилин)/i);
  
  let minutes = 60; // default
  
  if (hourMatch) {
    minutes = parseFloat(hourMatch[1]) * 60;
  } else if (minMatch) {
    minutes = parseInt(minMatch[1]);
  }
  
  return Math.max(5, minutes); // minimum 5 minutes
}

function detectParallel(text: string): boolean {
  const parallelKeywords = ['паралл', 'parallel', 'can be parallelized', 'simultaneously'];
  const lowerText = text.toLowerCase();
  return parallelKeywords.some(keyword => lowerText.includes(keyword));
}

// Simple local parser
function parseTasksLocally(text: string): Task[] {
  const lines = text.split('\n').filter(line => line.trim());
  const tasks: Task[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed || trimmed.length < 2) continue;
    
    // Remove leading bullets/dashes and trailing dashes
    let taskText = trimmed.replace(/^[-—*•]\s*/, '').replace(/[-—]+$/, '').trim();
    
    if (!taskText) continue;
    
    const task: Task = {
      id: crypto.randomUUID(),
      title: taskText.replace(/\d+\s*(?:h|hr|hrs|час|часа|часів|m|min|mins|мін|хвилин)/gi, '').trim(),
      estimatedMinutes: parseDuration(taskText),
      allowParallel: detectParallel(taskText),
      category: detectCategory(taskText),
    };
    
    tasks.push(task);
  }
  
  return tasks;
}

// AI-powered parser using edge function
async function parseTasksWithAI(text: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-tasks', {
      body: { text }
    });
    
    if (error) throw error;
    if (!data?.tasks) throw new Error('No tasks returned from AI');
    
    return data.tasks;
  } catch (error) {
    console.error('AI parsing failed:', error);
    throw error;
  }
}

export async function parseTasksFromText(text: string, useAI: boolean = true): Promise<Task[]> {
  // Try AI first if enabled
  if (useAI) {
    try {
      const aiTasks = await parseTasksWithAI(text);
      if (aiTasks && aiTasks.length > 0) {
        console.log('Parsed with AI:', aiTasks.length, 'tasks');
        return aiTasks;
      }
    } catch (error) {
      console.warn('AI parsing failed, falling back to local parser:', error);
    }
  }
  
  // Fallback to local parsing
  const localTasks = parseTasksLocally(text);
  console.log('Parsed locally:', localTasks.length, 'tasks');
  return localTasks;
}
