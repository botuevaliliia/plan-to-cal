import { TaskCategory } from '@/types/task';

export const categoryColors: Record<TaskCategory, string> = {
  Interviews: 'hsl(221 83% 53%)',
  Applications: 'hsl(25 95% 53%)',
  SPE: 'hsl(262 83% 58%)',
  Study: 'hsl(204 94% 55%)',
  Fitness: 'hsl(142 71% 45%)',
  Errands: 'hsl(17 88% 50%)',
  Content: 'hsl(280 65% 60%)',
  Networking: 'hsl(340 82% 52%)',
  Learning: 'hsl(199 89% 48%)',
  Default: 'hsl(215 16% 47%)',
};

export const categoryColorClasses: Record<TaskCategory, string> = {
  Interviews: 'bg-[hsl(221,83%,53%)]',
  Applications: 'bg-[hsl(25,95%,53%)]',
  SPE: 'bg-[hsl(262,83%,58%)]',
  Study: 'bg-[hsl(204,94%,55%)]',
  Fitness: 'bg-[hsl(142,71%,45%)]',
  Errands: 'bg-[hsl(17,88%,50%)]',
  Content: 'bg-[hsl(280,65%,60%)]',
  Networking: 'bg-[hsl(340,82%,52%)]',
  Learning: 'bg-[hsl(199,89%,48%)]',
  Default: 'bg-[hsl(215,16%,47%)]',
};
