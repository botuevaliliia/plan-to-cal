import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const INTERESTS = [
  'Travel', 'Sports', 'Fitness', 'Reading', 'Writing', 'Music', 'Movies', 'Gaming',
  'Cooking', 'Art', 'Fashion', 'Photography', 'Gardening', 'Crafting', 'Technology',
  'Science', 'History', 'Volunteering', 'Collecting', 'Meditation'
];

const VALUES = [
  'Integrity', 'Freedom', 'Family', 'Community', 'Security', 'Creativity', 'Learning',
  'Justice', 'Compassion', 'Ambition', 'Adventure', 'Tradition', 'Respect',
  'Sustainability', 'Equality', 'Growth', 'Faith', 'Responsibility', 'Health', 'Joy'
];

export default function Onboarding() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleSelection = (item: string, type: 'interest' | 'value') => {
    if (type === 'interest') {
      if (selectedInterests.includes(item)) {
        setSelectedInterests(selectedInterests.filter(i => i !== item));
      } else if (selectedInterests.length < 3) {
        setSelectedInterests([...selectedInterests, item]);
      } else {
        toast.error('You can select up to 3 interests');
      }
    } else {
      if (selectedValues.includes(item)) {
        setSelectedValues(selectedValues.filter(v => v !== item));
      } else if (selectedValues.length < 3) {
        setSelectedValues([...selectedValues, item]);
      } else {
        toast.error('You can select up to 3 values');
      }
    }
  };

  const handleComplete = async () => {
    if (selectedInterests.length === 0 || selectedValues.length === 0) {
      toast.error('Please select at least one interest and one value');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        interests: selectedInterests,
        values: selectedValues,
      })
      .eq('id', user?.id);

    if (error) {
      toast.error('Failed to save preferences');
      console.error('Error:', error);
    } else {
      toast.success('Preferences saved!');
      navigate('/plan-input');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-mono uppercase tracking-tight">Welcome!</h1>
          <p className="text-muted-foreground">Let's personalize your experience</p>
        </div>

        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider">Select Your Interests</CardTitle>
            <CardDescription>
              Choose up to 3 interests ({selectedInterests.length}/3 selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <Badge
                  key={interest}
                  variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSelection(interest, 'interest')}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider">Select Your Values</CardTitle>
            <CardDescription>
              Choose up to 3 values ({selectedValues.length}/3 selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VALUES.map((value) => (
                <Badge
                  key={value}
                  variant={selectedValues.includes(value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSelection(value, 'value')}
                >
                  {value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleComplete}
          disabled={loading || selectedInterests.length === 0 || selectedValues.length === 0}
          className="w-full"
          size="lg"
        >
          {loading ? 'Saving...' : 'Continue to App'}
        </Button>
      </div>
    </div>
  );
}
