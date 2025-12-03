import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, MessageSquare, Upload, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Stats {
  totalDocuments: number;
  ingestedDocuments: number;
  processingDocuments: number;
  errorDocuments: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('status')
        .eq('user_id', user.id);

      if (!error && data) {
        setStats({
          totalDocuments: data.length,
          ingestedDocuments: data.filter(d => d.status === 'ingested').length,
          processingDocuments: data.filter(d => d.status === 'processing' || d.status === 'pending').length,
          errorDocuments: data.filter(d => d.status === 'error').length,
        });
      }
      setLoading(false);
    }

    fetchStats();
  }, [user]);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'utilisateur';

  const statCards = [
    {
      icon: FileText,
      label: 'Documents totaux',
      value: stats?.totalDocuments ?? 0,
      color: 'text-primary',
      bg: 'bg-accent',
    },
    {
      icon: CheckCircle,
      label: 'Documents ingérés',
      value: stats?.ingestedDocuments ?? 0,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      icon: Clock,
      label: 'En cours',
      value: stats?.processingDocuments ?? 0,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      icon: AlertCircle,
      label: 'Erreurs',
      value: stats?.errorDocuments ?? 0,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Bonjour, {firstName} 👋
          </h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre tableau de bord. Gérez vos documents et interrogez l'IA.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-10 w-10 rounded-lg mb-4" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, i) => (
              <Card 
                key={i} 
                className="border-border/50 hover:shadow-medium transition-shadow duration-200"
              >
                <CardContent className="p-6">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-4`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-3xl font-semibold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50 overflow-hidden group hover:shadow-large transition-all duration-300">
            <CardContent className="p-0">
              <Link to="/documents" className="block p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Uploader des documents</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Ajoutez PDF, DOCX, TXT et plus encore
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 overflow-hidden group hover:shadow-large transition-all duration-300">
            <CardContent className="p-0">
              <Link to="/chat" className="block p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Interroger le Chatbot</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Posez vos questions sur vos documents
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        {stats && stats.totalDocuments === 0 && (
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Commencez par uploader un document</h3>
                  <p className="text-sm text-muted-foreground">
                    Uploadez votre premier document pour commencer à utiliser le chatbot IA.
                  </p>
                </div>
                <Button asChild variant="premium">
                  <Link to="/documents">
                    Uploader
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
