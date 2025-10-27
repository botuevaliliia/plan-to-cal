import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, BarChart3, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
  };

  const tabs = [
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/find-user', icon: Users, label: 'Find User' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-mono uppercase tracking-tight">Plan to Calendar</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <Link key={tab.path} to={tab.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
