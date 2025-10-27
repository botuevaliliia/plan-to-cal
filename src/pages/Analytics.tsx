import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanStore } from '@/store/planStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { pipeline } from '@huggingface/transformers';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

const ANALYTICS_CATEGORIES = [
  'Work Study',
  'Entertainment',
  'Health Fitness',
  'Social',
  'Misc',
  'Admin Finance',
  'Research News',
  'Shopping',
  'Travel Commute',
  'Household Errands'
];

interface CategoryData {
  category: string;
  minutes: number;
  count: number;
  percentage: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { events, timeWindow } = usePlanStore();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    if (events.length === 0) {
      navigate('/');
      return;
    }

    classifyTasks();
  }, [events]);

  const classifyTasks = async () => {
    try {
      setLoading(true);
      toast.info('Loading classification model...');

      // Initialize zero-shot classification pipeline
      const classifier = await pipeline(
        'zero-shot-classification',
        'Xenova/mobilebert-uncased-mnli'
      );

      toast.info('Classifying tasks...');

      // Classify each event
      const classifications = await Promise.all(
        events.map(async (event) => {
          const result = await classifier(event.title, ANALYTICS_CATEGORIES, {
            multi_label: false,
          });
          
          // Handle both array and single result
          const topLabel = Array.isArray(result) ? result[0].labels[0] : result.labels[0];
          
          const duration = DateTime.fromISO(event.endISO).diff(
            DateTime.fromISO(event.startISO),
            'minutes'
          ).minutes;

          return {
            category: topLabel,
            minutes: duration,
          };
        })
      );

      // Aggregate by category
      const categoryMap = new Map<string, { minutes: number; count: number }>();
      
      classifications.forEach(({ category, minutes }) => {
        const existing = categoryMap.get(category) || { minutes: 0, count: 0 };
        categoryMap.set(category, {
          minutes: existing.minutes + minutes,
          count: existing.count + 1,
        });
      });

      const totalMinutes = classifications.reduce((sum, c) => sum + c.minutes, 0);

      // Convert to array with percentages
      const data: CategoryData[] = ANALYTICS_CATEGORIES.map(cat => {
        const stats = categoryMap.get(cat) || { minutes: 0, count: 0 };
        return {
          category: cat,
          minutes: stats.minutes,
          count: stats.count,
          percentage: totalMinutes > 0 ? (stats.minutes / totalMinutes) * 100 : 0,
        };
      }).filter(d => d.count > 0)
        .sort((a, b) => b.minutes - a.minutes);

      setCategoryData(data);
      toast.success('Classification complete!');
    } catch (error) {
      console.error('Classification error:', error);
      toast.error('Failed to classify tasks');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const maxMinutes = Math.max(...categoryData.map(d => d.minutes), 1);

  return (
    <AppLayout>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/calendar')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6" />
                <div>
                  <h1 className="text-xl font-mono uppercase tracking-tight">Analytics</h1>
                  <p className="text-sm text-muted-foreground">
                    Time distribution across categories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing your schedule...</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Events</CardDescription>
                  <CardTitle className="text-3xl">{events.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Time</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatDuration(categoryData.reduce((sum, d) => sum + d.minutes, 0))}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Categories</CardDescription>
                  <CardTitle className="text-3xl">{categoryData.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution by Category</CardTitle>
                <CardDescription>
                  Classified using AI-powered zero-shot classification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryData.map((data) => (
                  <div key={data.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{data.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {data.count} task{data.count !== 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold min-w-[60px] text-right">
                          {formatDuration(data.minutes)}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(data.minutes / maxMinutes) * 100}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {data.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Period Info */}
            {timeWindow && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Schedule Period</CardTitle>
                  <CardDescription>
                    {DateTime.fromISO(timeWindow.startISO).toFormat('LLL dd, yyyy')} -{' '}
                    {DateTime.fromISO(timeWindow.endISO).toFormat('LLL dd, yyyy')}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
};

export default Analytics;
