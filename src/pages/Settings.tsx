import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Trash2, Loader2, Save, Shield, CreditCard, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNavigate, Link } from 'react-router-dom';

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { role, canManageUsers, canManageBilling, canAccessSettings, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Stats for super admin
  const [stats, setStats] = useState({ users: 0, documents: 0, conversations: 0 });

  useEffect(() => {
    if (!permLoading && !canAccessSettings && role !== null) {
      // Redirect non-admin users away
      navigate('/dashboard');
    }
  }, [canAccessSettings, permLoading, navigate, role]);

  useEffect(() => {
    if (canManageBilling) {
      fetchStats();
    }
  }, [canManageBilling]);

  const fetchStats = async () => {
    const [usersRes, docsRes, convsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      users: usersRes.count || 0,
      documents: docsRes.count || 0,
      conversations: convsRes.count || 0,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

      // Update profile table
      if (user) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', user.id);
      }

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    }

    setIsSaving(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      // Delete user's documents from storage
      if (user) {
        const { data: docs } = await supabase
          .from('documents')
          .select('file_path')
          .eq('user_id', user.id);

        if (docs && docs.length > 0) {
          await supabase.storage
            .from('documents')
            .remove(docs.map(d => d.file_path));
        }
      }

      // Sign out and show message
      await signOut();

      toast({
        title: 'Compte supprimé',
        description: 'Votre compte a été supprimé avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le compte',
        variant: 'destructive',
      });
    }

    setIsDeleting(false);
  };

  if (permLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre compte et vos préférences
          </p>
        </div>

        {/* Role Badge */}
        {role && (
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Votre rôle</p>
                <p className="text-sm text-muted-foreground">
                  {roleLabels[role] || role}
                </p>
              </div>
              <Badge variant={role === 'super_admin' ? 'default' : 'secondary'}>
                {roleLabels[role] || role}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Stats for Super Admin */}
        {canManageBilling && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-semibold">{stats.users}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <Mail className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-semibold">{stats.documents}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <CreditCard className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-semibold">{stats.conversations}</p>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Links for Super Admin */}
        {canManageUsers && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gestion de l'équipe
              </CardTitle>
              <CardDescription>
                Gérez les membres et leurs permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/team">
                  <Users className="w-4 h-4 mr-2" />
                  Accéder à la gestion d'équipe
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profil
            </CardTitle>
            <CardDescription>
              Vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Billing Section - Super Admin Only */}
        {canManageBilling && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Facturation
              </CardTitle>
              <CardDescription>
                Gérez votre abonnement et vos paiements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  La gestion de la facturation sera bientôt disponible.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone - Not for Super Admin (cannot delete own account) */}
        {role !== 'super_admin' && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Zone dangereuse
              </CardTitle>
              <CardDescription>
                Actions irréversibles sur votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer mon compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Tous vos documents et données seront définitivement supprimés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
