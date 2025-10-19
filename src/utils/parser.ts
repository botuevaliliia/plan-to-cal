import { Task, TaskCategory } from '@/types/task';

// Category keyword mappings
const categoryKeywords: Record<TaskCategory, string[]> = {
  Interviews: ['интервью', 'interview', 'why google', 'tmay', 'pm eval', 'mock interview'],
  Applications: ['податься', 'вакансий', 'linkedin', 'whoop', 'apply', 'application', 'job'],
  SPE: ['spe', 'интегрировать', 'seo', 'тикток', 'looker', 'chartio', 'tableau', 'mvp'],
  Study: ['прочитать', 'read', 'book', 'study', 'learn'],
  Fitness: ['бег', 'накачаться', 'помыться', 'сон', 'workout', 'gym', 'exercise', 'fitness', 'run', 'sleep'],
  Errands: ['вернуть', 'купить', 'тур', 'встреча', 'buy', 'purchase', 'return', 'errand'],
  Content: ['content', 'write', 'post', 'blog', 'video'],
  Networking: ['венчур кафе', 'network', 'coffee', 'meetup', 'venture cafe'],
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
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|час|часа|часов)/i);
  const minMatch = text.match(/(\d+)\s*(?:m|min|mins|мин|минут)/i);
  
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

export function parseTasksFromText(text: string): Task[] {
  const lines = text.split('\n').filter(line => line.trim());
  const tasks: Task[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or lines that don't look like tasks
    if (!trimmed || trimmed.length < 2) continue;
    
    // Match lines starting with bullet points
    const taskMatch = trimmed.match(/^[-—*•]\s*(.+)$/);
    if (!taskMatch) continue;
    
    const taskText = taskMatch[1];
    
    const task: Task = {
      id: crypto.randomUUID(),
      title: taskText.replace(/\d+\s*(?:h|hr|hrs|час|часа|часов|m|min|mins|мин|минут)/gi, '').trim(),
      estimatedMinutes: parseDuration(taskText),
      allowParallel: detectParallel(taskText),
      category: detectCategory(taskText),
    };
    
    tasks.push(task);
  }
  
  return tasks;
}
