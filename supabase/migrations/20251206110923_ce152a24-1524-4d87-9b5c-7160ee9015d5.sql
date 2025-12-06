-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view accessible folders" ON public.folders;

-- Recreate with corrected query (fix fp.folder_id = fp.id to fp.folder_id = folders.id)
CREATE POLICY "Users can view accessible folders" 
ON public.folders 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'super_admin')
  OR access_level = 'team'
  OR (access_level = 'private' AND created_by = auth.uid())
  OR (access_level = 'custom' AND EXISTS (
    SELECT 1 FROM public.folder_permissions fp 
    WHERE fp.folder_id = folders.id AND fp.user_id = auth.uid()
  ))
);