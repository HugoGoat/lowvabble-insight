import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'editor' | 'reader' | null;

interface PermissionsContextType {
  role: AppRole;
  loading: boolean;
  // User management
  canManageUsers: boolean;
  canViewUsers: boolean;
  // Folder management
  canCreateFolders: boolean;
  canDeleteFolders: boolean;
  canRenameFolders: boolean;
  // Document management
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canRenameDocuments: boolean;
  // Chat
  canUseChat: boolean;
  canExportConversations: boolean;
  canViewAllConversations: boolean;
  // Settings
  canAccessSettings: boolean;
  canManageBilling: boolean;
  // Helper functions
  hasRole: (minRole: AppRole) => boolean;
  refreshRole: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const roleHierarchy: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  editor: 2,
  reader: 1,
};

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setRole(data?.role as AppRole || null);
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [authLoading, fetchRole]);

  const hasRole = useCallback((minRole: AppRole): boolean => {
    if (!role || !minRole) return false;
    return roleHierarchy[role] >= roleHierarchy[minRole];
  }, [role]);

  const value: PermissionsContextType = {
    role,
    loading: loading || authLoading,
    // User management - Super Admin only
    canManageUsers: role === 'super_admin',
    canViewUsers: role === 'super_admin' || role === 'admin',
    // Folder management
    canCreateFolders: hasRole('editor'),
    canDeleteFolders: hasRole('admin'),
    canRenameFolders: hasRole('editor'),
    // Document management
    canUploadDocuments: hasRole('editor'),
    canDeleteDocuments: hasRole('admin'),
    canRenameDocuments: hasRole('editor'),
    // Chat - everyone can use
    canUseChat: !!role,
    canExportConversations: hasRole('editor'),
    canViewAllConversations: hasRole('admin'),
    // Settings
    canAccessSettings: hasRole('admin'),
    canManageBilling: role === 'super_admin',
    // Helpers
    hasRole,
    refreshRole: fetchRole,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
