-- Add specialization and level columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS level TEXT;

-- Update RLS policies if necessary (assuming profiles are already protected)
-- If we want to ensure only the owner can update these, the existing policies should suffice.
