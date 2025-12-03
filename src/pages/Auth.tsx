import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Erreur de connexion',
            description: error.message === 'Invalid login credentials' 
              ? 'Email ou mot de passe incorrect'
              : error.message,
            variant: 'destructive',
          });
        }
      } else {
        if (password.length < 6) {
          toast({
            title: 'Mot de passe invalide',
            description: 'Le mot de passe doit contenir au moins 6 caractères',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Compte existant',
              description: 'Un compte existe déjà avec cet email. Connectez-vous.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: "Erreur d'inscription",
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Compte créé !',
            description: 'Bienvenue sur la plateforme.',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue est survenue',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-primary-foreground">DocuChat</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
            Interrogez vos documents<br />avec l'intelligence artificielle
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Uploadez vos documents et posez vos questions. Notre IA analyse et vous répond instantanément.
          </p>
        </div>

        <div className="flex items-center gap-4 text-primary-foreground/60 text-sm">
          <span>PDF</span>
          <span>•</span>
          <span>DOCX</span>
          <span>•</span>
          <span>TXT</span>
          <span>•</span>
          <span>CSV</span>
          <span>•</span>
          <span>JSON</span>
          <span>•</span>
          <span>MD</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">DocuChat</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-semibold text-foreground">
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isLogin 
                ? 'Accédez à vos documents et conversations' 
                : 'Commencez à analyser vos documents'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="h-12"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="h-12"
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
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              variant="premium"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Se connecter' : "S'inscrire"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin 
                ? "Pas encore de compte ? S'inscrire" 
                : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
