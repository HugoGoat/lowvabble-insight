-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view accessible folders" ON public.folders;

-- Create a security definer function to check folder access without recursion
CREATE OR REPLACE FUNCTION public.can_view_folder(_user_id uuid, _folder_id uuid, _folder_user_id uuid, _access_level folder_access_level, _created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _folder_user_id = _user_id
    OR has_role(_user_id, 'super_admin')
    OR _access_level = 'team'
    OR (_access_level = 'private' AND _created_by = _user_id)
    OR (_access_level = 'custom' AND EXISTS (
      SELECT 1 FROM public.folder_permissions fp 
      WHERE fp.folder_id = _folder_id AND fp.user_id = _user_id
    ))
$$;

-- Recreate the policy using a simpler approach without subqueries on the same table
CREATE POLICY "Users can view accessible folders" 
ON public.folders 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin')
  OR access_level = 'team'
  OR (access_level = 'private' AND created_by = auth.uid())
  OR (access_level = 'custom' AND EXISTS (
    SELECT 1 FROM public.folder_permissions fp 
    WHERE fp.folder_id = folders.id AND fp.user_id = auth.uid()
  ))
);