
-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  due_date TIMESTAMPTZ NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assign_to_all BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_students DISABLE ROW LEVEL SECURITY;
-- Junction table
CREATE TABLE public.assignment_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (assignment_id, student_id)
);

ALTER TABLE public.assignment_students ENABLE ROW LEVEL SECURITY;

-- Submissions table
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  grade NUMERIC(5,2),
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Assignment policies
CREATE POLICY "Teachers can insert assignments" ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = created_by);
CREATE POLICY "Teachers can update own assignments" ON public.assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND auth.uid() = created_by);
CREATE POLICY "Teachers can delete own assignments" ON public.assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND auth.uid() = created_by);
CREATE POLICY "Users can view assignments" ON public.assignments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    OR assign_to_all = true
    OR EXISTS (SELECT 1 FROM public.assignment_students WHERE assignment_id = id AND student_id = auth.uid())
  );

-- Assignment_students policies
CREATE POLICY "Teachers can manage assignment_students" ON public.assignment_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students can view own assignment links" ON public.assignment_students FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

-- Submission policies
CREATE POLICY "Students can insert own submissions" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'student') AND auth.uid() = student_id);
CREATE POLICY "Students can view own submissions" ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Students can update own ungraded submissions" ON public.submissions FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND grade IS NULL);
CREATE POLICY "Teachers can view submissions" ON public.submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND EXISTS (SELECT 1 FROM public.assignments WHERE id = assignment_id AND created_by = auth.uid()));
CREATE POLICY "Teachers can grade submissions" ON public.submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND EXISTS (SELECT 1 FROM public.assignments WHERE id = assignment_id AND created_by = auth.uid()));

-- Trigger
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
