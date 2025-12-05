-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'editor', 'reader');

-- Create user_roles table (separate from profiles as per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'reader',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Add is_active to profiles
ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'reader',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folder access level enum
CREATE TYPE public.folder_access_level AS ENUM ('private', 'team', 'custom');

-- Add access_level to folders
ALTER TABLE public.folders ADD COLUMN access_level folder_access_level NOT NULL DEFAULT 'team';
ALTER TABLE public.folders ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create folder_permissions table for custom access
CREATE TABLE public.folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (folder_id, user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user has role at or above level
CREATE OR REPLACE FUNCTION public.has_role_or_higher(_user_id UUID, _min_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND (
      role = 'super_admin' OR
      (_min_role = 'admin' AND role IN ('super_admin', 'admin')) OR
      (_min_role = 'editor' AND role IN ('super_admin', 'admin', 'editor')) OR
      (_min_role = 'reader')
    )
  )
$$;

-- Function to check folder access
CREATE OR REPLACE FUNCTION public.can_access_folder(_user_id UUID, _folder_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.folders f
    WHERE f.id = _folder_id
    AND f.user_id = _user_id
    AND (
      -- Super admin sees all
      public.has_role(_user_id, 'super_admin')
      -- Team folders visible to all
      OR f.access_level = 'team'
      -- Private folders only to creator and super_admin
      OR (f.access_level = 'private' AND (f.created_by = _user_id OR public.has_role(_user_id, 'super_admin')))
      -- Custom access check
      OR (f.access_level = 'custom' AND EXISTS (
        SELECT 1 FROM public.folder_permissions fp WHERE fp.folder_id = _folder_id AND fp.user_id = _user_id
      ))
    )
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for invitations
CREATE POLICY "Super admins can manage invitations"
ON public.invitations FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Anyone can view invitation by token for accepting"
ON public.invitations FOR SELECT
USING (true);

-- RLS Policies for folder_permissions
CREATE POLICY "Super admins can manage folder permissions"
ON public.folder_permissions FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage folder permissions"
ON public.folder_permissions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Folder creators can manage permissions"
ON public.folder_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.folders f 
    WHERE f.id = folder_id AND f.created_by = auth.uid()
  )
);

CREATE POLICY "Users can view own folder permissions"
ON public.folder_permissions FOR SELECT
USING (user_id = auth.uid());

-- Update folders RLS to include access levels
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
CREATE POLICY "Users can view accessible folders"
ON public.folders FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR access_level = 'team'
  OR (access_level = 'private' AND created_by = auth.uid())
  OR (access_level = 'custom' AND EXISTS (
    SELECT 1 FROM public.folder_permissions fp WHERE fp.folder_id = id AND fp.user_id = auth.uid()
  ))
);

-- Update profiles RLS for admins to view all
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles based on role"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

-- Trigger to update updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update delete policy for folders (only super_admin and admin)
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.folders;
CREATE POLICY "Admins can delete folders"
ON public.folders FOR DELETE
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);

-- Update delete policy for documents (only super_admin and admin)
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Admins can delete documents"
ON public.documents FOR DELETE
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
);