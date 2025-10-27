-- Create table for saved for later events
CREATE TABLE public.saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own saved events"
ON public.saved_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved events"
ON public.saved_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved events"
ON public.saved_events
FOR DELETE
USING (auth.uid() = user_id);