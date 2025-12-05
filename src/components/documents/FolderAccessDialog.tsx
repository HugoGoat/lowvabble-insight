import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Lock, Users, UserCheck } from 'lucide-react';

type AccessLevel = 'private' | 'team' | 'custom';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface FolderAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  currentAccessLevel: AccessLevel;
  onUpdated: () => void;
}

const accessOptions = [
  {
    value: 'private',
    label: 'Privé',
    description: 'Visible uniquement par vous et le Super Admin',
    icon: Lock,
  },
  {
    value: 'team',
    label: 'Équipe',
    description: 'Visible par tous les membres selon leurs permissions',
    icon: Users,
  },
  {
    value: 'custom',
    label: 'Personnalisé',
    description: 'Sélectionnez les utilisateurs qui peuvent voir ce dossier',
    icon: UserCheck,
  },
];

export default function FolderAccessDialog({
  open,
  onOpenChange,
  folderId,
  currentAccessLevel,
  onUpdated,
}: FolderAccessDialogProps) {
  const { toast } = useToast();
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(currentAccessLevel);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAccessLevel(currentAccessLevel);
      fetchData();
    }
  }, [open, folderId, currentAccessLevel]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('is_active', true);

    setUsers(profiles || []);

    // Fetch current permissions if custom
    if (currentAccessLevel === 'custom') {
      const { data: permissions } = await supabase
        .from('folder_permissions')
        .select('user_id')
        .eq('folder_id', folderId);

      setSelectedUsers(permissions?.map(p => p.user_id) || []);
    } else {
      setSelectedUsers([]);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Update folder access level
      const { error: updateError } = await supabase
        .from('folders')
        .update({ access_level: accessLevel })
        .eq('id', folderId);

      if (updateError) throw updateError;

      // Handle custom permissions
      if (accessLevel === 'custom') {
        // Delete existing permissions
        await supabase
          .from('folder_permissions')
          .delete()
          .eq('folder_id', folderId);

        // Insert new permissions
        if (selectedUsers.length > 0) {
          const { error: permError } = await supabase
            .from('folder_permissions')
            .insert(
              selectedUsers.map(userId => ({
                folder_id: folderId,
                user_id: userId,
              }))
            );

          if (permError) throw permError;
        }
      } else {
        // Clear permissions if not custom
        await supabase
          .from('folder_permissions')
          .delete()
          .eq('folder_id', folderId);
      }

      toast({ title: 'Accès mis à jour' });
      onUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de mettre à jour l\'accès',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres d'accès</DialogTitle>
          <DialogDescription>
            Définissez qui peut voir ce dossier et son contenu.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Niveau d'accès</Label>
              <Select
                value={accessLevel}
                onValueChange={(v) => setAccessLevel(v as AccessLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accessOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {accessLevel === 'custom' && (
              <div className="space-y-2">
                <Label>Utilisateurs autorisés</Label>
                <ScrollArea className="h-48 border rounded-lg p-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 py-2 px-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => toggleUser(user.id)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || user.email}
                        </p>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun utilisateur disponible
                    </p>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
