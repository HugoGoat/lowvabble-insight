import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export default function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role, canManageUsers, canAccessSettings } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', show: true },
    { icon: FileText, label: 'Documents', href: '/documents', show: true },
    { icon: MessageSquare, label: 'Chatbot', href: '/chat', show: true },
    { icon: Users, label: 'Équipe', href: '/team', show: canManageUsers },
    { icon: Settings, label: 'Paramètres', href: '/settings', show: canAccessSettings },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <aside 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">DocuChat</span>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg hover:bg-muted transition-colors",
            collapsed && "absolute left-5 top-[18px]"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-accent text-accent-foreground font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-border space-y-3">
        {!collapsed && user && (
          <div className="px-3 py-2 space-y-1">
            <p className="text-sm font-medium truncate">{user.email}</p>
            {role && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {roleLabels[role] || role}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
          {!collapsed && (
            <span className="ml-3">
              {resolvedTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}
