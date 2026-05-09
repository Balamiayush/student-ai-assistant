-- MASTER FIX FOR SCHEMA AND RLS
-- This script ensures all tables have the correct columns and RLS policies are permissive for authenticated users.

-- 1. FIX PROFILES TABLE
DO $$ 
BEGIN
    -- If user_id exists but id should be the main identity, we ensure id is the PK and references auth.users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        -- Check if user_id and id are different
        -- If they are, we might need to migrate data, but for now we just ensure they exist.
        NULL;
    END IF;
END $$;

-- 2. FIX ASSIGNMENTS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'created_by') THEN
        -- If created_by is missing, maybe it was named user_id?
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'user_id') THEN
            ALTER TABLE public.assignments RENAME COLUMN user_id TO created_by;
        ELSE
            ALTER TABLE public.assignments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. FIX SUBMISSIONS TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'assignment_id') THEN
        ALTER TABLE public.submissions ADD COLUMN assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'student_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'user_id') THEN
            ALTER TABLE public.submissions RENAME COLUMN user_id TO student_id;
        ELSE
            ALTER TABLE public.submissions ADD COLUMN student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;


-- 3. ENSURE RLS IS CORRECT
-- Assignments
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.assignments;
CREATE POLICY "Enable read access for all users" ON public.assignments FOR SELECT TO authenticated USING (
    assign_to_all = true 
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assignment_students WHERE assignment_id = id AND student_id = auth.uid())
);
DROP POLICY IF EXISTS "Enable insert for teachers" ON public.assignments;
CREATE POLICY "Enable insert for teachers" ON public.assignments FOR INSERT TO authenticated WITH CHECK (true);

-- Assignment Students (Junction)
ALTER TABLE public.assignment_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for students" ON public.assignment_students;
CREATE POLICY "Enable read for students" ON public.assignment_students FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for teachers" ON public.assignment_students;
CREATE POLICY "Enable insert for teachers" ON public.assignment_students FOR INSERT TO authenticated WITH CHECK (true);


-- Submissions
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for students and teachers" ON public.submissions;
CREATE POLICY "Enable read for students and teachers" ON public.submissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for students" ON public.submissions;
CREATE POLICY "Enable insert for students" ON public.submissions FOR INSERT TO authenticated WITH CHECK (true);

-- Profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON public.user_roles;
CREATE POLICY "Roles are viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);
