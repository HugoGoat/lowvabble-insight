import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Lien d\'invitation invalide');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    const { data, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (fetchError || !data) {
      setError('Invitation introuvable ou invalide');
      setLoading(false);
      return;
    }

    if (data.accepted_at) {
      setError('Cette invitation a déjà été utilisée');
      setLoading(false);
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setError('Cette invitation a expiré');
      setLoading(false);
      return;
    }

    setInvitation(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate
    const validation = signupSchema.safeParse({ fullName, password, confirmPassword });
    if (!validation.success) {
      setFormError(validation.error.errors[0].message);
      return;
    }

    if (!invitation) return;

    setSubmitting(true);

    try {
      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role: invitation.role as 'admin' | 'editor' | 'reader' | 'super_admin',
        }]);

      if (roleError) throw roleError;

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      toast({
        title: 'Compte créé',
        description: 'Bienvenue ! Vous pouvez maintenant vous connecter.',
      });

      navigate('/auth');
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de créer le compte',
        variant: 'destructive',
      });
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Invitation invalide</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/auth')}>Retour à la connexion</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>Créer votre compte</CardTitle>
          <CardDescription>
            Vous avez été invité en tant que{' '}
            <span className="font-medium text-foreground">
              {roleLabels[invitation?.role || ''] || invitation?.role}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invitation?.email || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer mon compte
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
