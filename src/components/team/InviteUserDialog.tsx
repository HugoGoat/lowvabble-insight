import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, Copy, Check } from 'lucide-react';
import { z } from 'zod';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}

const inviteSchema = z.object({
  email: z.string().email('Email invalide').max(255, 'Email trop long'),
  role: z.enum(['admin', 'editor', 'reader']),
});

export default function InviteUserDialog({
  open,
  onOpenChange,
  onInvited,
}: InviteUserDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('reader');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    // Validate input
    const validation = inviteSchema.safeParse({ email, role });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        setError('Cet email est déjà enregistré');
        setLoading(false);
        return;
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .is('accepted_at', null)
        .maybeSingle();

      if (existingInvite) {
        setError('Une invitation est déjà en attente pour cet email');
        setLoading(false);
        return;
      }

      // Create invitation
      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert([{
          email,
          role: role as 'admin' | 'editor' | 'reader',
          invited_by: user?.id,
        }])
        .select('token')
        .single();

      if (insertError) throw insertError;

      const link = `${window.location.origin}/accept-invite?token=${data.token}`;
      setInviteLink(link);

      toast({
        title: 'Invitation créée',
        description: 'Copiez le lien pour l\'envoyer à l\'utilisateur.',
      });

      onInvited();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de créer l\'invitation',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('reader');
    setInviteLink(null);
    setError(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? 'Partagez ce lien avec le nouvel utilisateur.'
              : 'Entrez l\'email et sélectionnez un rôle pour le nouveau membre.'}
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono break-all">{inviteLink}</p>
            </div>
            <Button onClick={handleCopy} className="w-full">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le lien
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div>
                        <p className="font-medium">Admin</p>
                        <p className="text-xs text-muted-foreground">
                          Gestion complète des documents et dossiers
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div>
                        <p className="font-medium">Éditeur</p>
                        <p className="text-xs text-muted-foreground">
                          Peut créer et renommer, mais pas supprimer
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="reader">
                      <div>
                        <p className="font-medium">Lecteur</p>
                        <p className="text-xs text-muted-foreground">
                          Consultation uniquement
                        </p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !email}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer l'invitation
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
