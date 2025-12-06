-- Drop and recreate has_role function with SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Also fix has_role_or_higher if it exists
CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id uuid, _min_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND (
      CASE _min_role
        WHEN 'reader' THEN ur.role IN ('reader', 'editor', 'admin', 'super_admin')
        WHEN 'editor' THEN ur.role IN ('editor', 'admin', 'super_admin')
        WHEN 'admin' THEN ur.role IN ('admin', 'super_admin')
        WHEN 'super_admin' THEN ur.role = 'super_admin'
        ELSE false
      END
    )
  )
$$;

-- Also fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;