import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, Upload, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: Upload,
      title: 'Upload illimité',
      description: 'PDF, DOCX, TXT, CSV, JSON, Markdown - tous vos documents en un seul endroit.',
    },
    {
      icon: MessageSquare,
      title: 'Chatbot intelligent',
      description: 'Posez vos questions et obtenez des réponses précises basées sur vos documents.',
    },
    {
      icon: CheckCircle,
      title: 'RAG avancé',
      description: 'Technologie de retrieval augmentée pour des réponses contextuelles et pertinentes.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">DocuChat</span>
          </div>
          <Button asChild variant="outline">
            <Link to="/auth">Connexion</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Propulsé par RAG + IA
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
            Interrogez vos documents<br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              avec l'intelligence artificielle
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uploadez vos documents professionnels et posez vos questions.
            Notre IA analyse, recherche et synthétise les informations pour vous.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="xl" variant="premium">
              <Link to="/auth">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-large transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="gradient-hero rounded-3xl p-12 text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à transformer votre façon de travailler ?
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque jour.
            </p>
            <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to="/auth">
                Créer un compte
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">DocuChat</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 DocuChat. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
