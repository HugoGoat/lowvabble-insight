-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view accessible folders" ON public.folders;

-- Create a simplified policy that avoids recursion
CREATE POLICY "Users can view accessible folders" ON public.folders
FOR SELECT USING (
  -- User owns the folder
  user_id = auth.uid()
  -- Super admin sees all
  OR public.has_role(auth.uid(), 'super_admin')
  -- Team folders visible to all authenticated users
  OR access_level = 'team'
  -- Private folders only to creator
  OR (access_level = 'private' AND created_by = auth.uid())
  -- Custom access via separate permissions table (no recursion here)
  OR (access_level = 'custom' AND EXISTS (
    SELECT 1 FROM public.folder_permissions fp 
    WHERE fp.folder_id = folders.id AND fp.user_id = auth.uid()
  ))
);