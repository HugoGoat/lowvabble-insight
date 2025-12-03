import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import UploadButton from '@/components/documents/UploadButton';
import DocumentCard from '@/components/documents/DocumentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, FolderOpen } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  status: string;
  created_at: string;
}

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    setDeletingId(id);

    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([doc.file_path]);

      // Delete from database
      const { error } = await supabase.from('documents').delete().eq('id', id);

      if (error) throw error;

      setDocuments(docs => docs.filter(d => d.id !== id));
      toast({
        title: 'Document supprimé',
        description: `"${doc.name}" a été supprimé.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }

    setDeletingId(null);
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Documents</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos documents et leur statut d'ingestion
            </p>
          </div>
          <UploadButton onUploadComplete={fetchDocuments} />
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Aucun document</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Commencez par uploader vos premiers documents pour les interroger avec le chatbot.
              </p>
              <UploadButton onUploadComplete={fetchDocuments} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
                isDeleting={deletingId === doc.id}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Formats supportés</p>
              <p className="text-sm text-muted-foreground">
                PDF, DOCX, TXT, CSV, JSON, Markdown
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
