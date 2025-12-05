import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import InviteUserDialog from '@/components/team/InviteUserDialog';
import { Users, UserPlus, MoreHorizontal, Search, Filter, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeamMember {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  super_admin: 'default',
  admin: 'secondary',
  editor: 'outline',
  reader: 'outline',
};

export default function Team() {
  const { user } = useAuth();
  const { canManageUsers, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Action states
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!permLoading && !canManageUsers) {
      navigate('/dashboard');
    }
  }, [canManageUsers, permLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch members (profiles joined with roles)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_active, created_at');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

    const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    const membersData: TeamMember[] = (profiles || []).map(p => ({
      id: p.id,
      user_id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: rolesMap.get(p.id) || 'reader',
      is_active: p.is_active,
      created_at: p.created_at,
    }));

    setMembers(membersData);

    // Fetch pending invitations
    const { data: invites } = await supabase
      .from('invitations')
      .select('*')
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    setInvitations(invites || []);
    setLoading(false);
  };

  const handleChangeRole = async () => {
    if (!editRoleUserId || !newRole) return;

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as 'admin' | 'editor' | 'reader' | 'super_admin' })
      .eq('user_id', editRoleUserId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le rôle',
        variant: 'destructive',
      });
    } else {
      setMembers(prev =>
        prev.map(m => (m.user_id === editRoleUserId ? { ...m, role: newRole } : m))
      );
      toast({ title: 'Rôle modifié' });
    }

    setEditRoleUserId(null);
    setNewRole('');
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentActive })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut',
        variant: 'destructive',
      });
    } else {
      setMembers(prev =>
        prev.map(m => (m.user_id === userId ? { ...m, is_active: !currentActive } : m))
      );
      toast({ title: currentActive ? 'Utilisateur désactivé' : 'Utilisateur activé' });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    // Delete role first, then profile (auth user cascade will handle the rest)
    await supabase.from('user_roles').delete().eq('user_id', deleteUserId);
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteUserId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'utilisateur',
        variant: 'destructive',
      });
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== deleteUserId));
      toast({ title: 'Utilisateur supprimé' });
    }

    setDeleteUserId(null);
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: 'Lien copié' });
  };

  const handleDeleteInvitation = async (id: string) => {
    const { error } = await supabase.from('invitations').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'invitation',
        variant: 'destructive',
      });
    } else {
      setInvitations(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Invitation supprimée' });
    }
  };

  // Filtering
  const filteredMembers = members.filter(m => {
    const matchesSearch =
      !searchQuery ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && m.is_active) ||
      (statusFilter === 'inactive' && !m.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (permLoading || loading) {
    return (
      <AppLayout>
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Gestion de l'équipe
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les membres et leurs permissions
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Inviter un membre
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Éditeur</SelectItem>
                  <SelectItem value="reader">Lecteur</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Membres ({filteredMembers.length})</CardTitle>
            <CardDescription>Liste des utilisateurs de l'organisation</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Date d'ajout</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.full_name || '—'}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariants[member.role] || 'outline'}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(member.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.user_id !== user?.id && member.role !== 'super_admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditRoleUserId(member.user_id);
                                setNewRole(member.role);
                              }}
                            >
                              Modifier le rôle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(member.user_id, member.is_active)}
                            >
                              {member.is_active ? 'Désactiver' : 'Activer'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteUserId(member.user_id)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun membre trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Invitations en attente ({invitations.length})</CardTitle>
              <CardDescription>
                Invitations envoyées en attente d'acceptation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Envoyée le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[invite.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invite.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invite.expires_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyInviteLink(invite.token)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteInvitation(invite.id)}
                          >
                            ×
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Invite Dialog */}
        <InviteUserDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onInvited={fetchData}
        />

        {/* Edit Role Dialog */}
        <AlertDialog open={!!editRoleUserId} onOpenChange={() => setEditRoleUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Modifier le rôle</AlertDialogTitle>
              <AlertDialogDescription>
                Sélectionnez le nouveau rôle pour cet utilisateur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Éditeur</SelectItem>
                <SelectItem value="reader">Lecteur</SelectItem>
              </SelectContent>
            </Select>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleChangeRole}>Confirmer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete User Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. L'utilisateur et toutes ses données seront supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
