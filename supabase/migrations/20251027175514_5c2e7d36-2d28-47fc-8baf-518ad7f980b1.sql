-- Add username to profiles
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;

-- Create table for saved calendar weblinks
CREATE TABLE public.calendar_weblinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_weblinks ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_weblinks
CREATE POLICY "Users can view own calendar weblinks"
ON public.calendar_weblinks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar weblinks"
ON public.calendar_weblinks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar weblinks"
ON public.calendar_weblinks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar weblinks"
ON public.calendar_weblinks
FOR DELETE
USING (auth.uid() = user_id);