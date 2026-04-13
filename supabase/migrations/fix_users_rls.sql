-- Fix RLS policies for the users table to allow frontend INSERT/SELECT/UPDATE
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can select own row" ON public.users;
DROP POLICY IF EXISTS "Users can insert own row" ON public.users;
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
DROP POLICY IF EXISTS "Users can delete own row" ON public.users;

-- 3. Create SELECT policy - users can only read their own row
CREATE POLICY "Users can select own row"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- 4. Create INSERT policy - authenticated users can only insert with their own auth.uid()
-- This is the critical fix for the 42501 error
CREATE POLICY "Users can insert own row"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- 5. Create UPDATE policy - users can only update their own row
CREATE POLICY "Users can update own row"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 6. Optional: Create DELETE policy (if needed)
CREATE POLICY "Users can delete own row"
  ON public.users
  FOR DELETE
  USING (id = auth.uid());

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';
