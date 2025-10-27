import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  interests: string[];
  values: string[];
}

export default function FindUser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a username to search');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, interests, values')
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
      
      if (!data || data.length === 0) {
        toast.info('No users found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="space-y-3 mt-6">
              {searchResults.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">@{user.username}</h3>
                        {user.full_name && (
                          <p className="text-sm text-muted-foreground">{user.full_name}</p>
                        )}
                        {user.interests && user.interests.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Interests:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.interests.map((interest) => (
                                <span
                                  key={interest}
                                  className="text-xs px-2 py-1 bg-primary/5 border border-border rounded"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {user.values && user.values.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Values:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.values.map((value) => (
                                <span
                                  key={value}
                                  className="text-xs px-2 py-1 bg-secondary/5 border border-border rounded"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
