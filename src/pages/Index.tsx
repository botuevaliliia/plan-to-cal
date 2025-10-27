import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Target, Sparkles } from "lucide-react";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/plan-input");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 space-y-12">
      <div className="max-w-3xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-mono uppercase tracking-tight">
            Plan to Calendar
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your goals into actionable schedules with AI-powered planning
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto pt-8">
          <div className="space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Smart Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              AI finds the perfect time slots for your tasks
            </p>
          </div>
          <div className="space-y-2">
            <Target className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Goal Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Break down big goals into manageable tasks
            </p>
          </div>
          <div className="space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Calendar Sync</h3>
            <p className="text-sm text-muted-foreground">
              Import and export to your favorite calendar apps
            </p>
          </div>
        </div>

        <div className="pt-8 space-x-4">
          <Button 
            onClick={() => navigate("/auth")} 
            size="lg"
            className="text-lg px-8"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
