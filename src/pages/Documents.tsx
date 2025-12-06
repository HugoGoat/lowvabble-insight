import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import UploadButton from '@/components/documents/UploadButton';
import DocumentCard from '@/components/documents/DocumentCard';
import FolderCard from '@/components/documents/FolderCard';
import CreateFolderDialog from '@/components/documents/CreateFolderDialog';
import MoveToFolderDialog from '@/components/documents/MoveToFolderDialog';
import FolderAccessDialog from '@/components/documents/FolderAccessDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, FolderOpen, FolderPlus, ChevronLeft, Lock, Users, UserCheck } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  status: string;
  created_at: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  created_at: string;
  access_level: 'private' | 'team' | 'custom';
  created_by: string | null;
}

const accessIcons = {
  private: Lock,
  team: Users,
  custom: UserCheck,
};

export default function Documents() {
  const { user } = useAuth();
  const { 
    canUploadDocuments, 
    canDeleteDocuments, 
    canCreateFolders, 
    canDeleteFolders,
    canRenameFolders,
    canRenameDocuments,
    hasRole,
  } = usePermissions();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderData, setRenameFolderData] = useState<Folder | null>(null);
  const [moveDocumentId, setMoveDocumentId] = useState<string | null>(null);
  const [accessDialogFolder, setAccessDialogFolder] = useState<Folder | null>(null);
  const { toast } = useToast();

  const currentFolder = folders.find(f => f.id === currentFolderId);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [docsResult, foldersResult] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('folders')
        .select('*')
        .order('name', { ascending: true }),
    ]);

    if (!docsResult.error && docsResult.data) {
      setDocuments(docsResult.data);
    }
    if (!foldersResult.error && foldersResult.data) {
      setFolders(foldersResult.data as Folder[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter documents for current view
  const currentDocuments = documents.filter(d => d.folder_id === currentFolderId);

  const handleDeleteDocument = async (id: string) => {
    if (!canDeleteDocuments) {
      toast({
        title: 'Action non autorisée',
        description: 'Vous n\'avez pas les permissions pour supprimer des documents.',
        variant: 'destructive',
      });
      return;
    }

    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    setDeletingId(id);

    try {
      // Call the n8n Delete webhook via Edge Function
      await supabase.functions.invoke('n8n-delete', {
        body: {
          file_path: doc.file_path,
          file_name: doc.name,
          document_id: doc.id,
        },
      });

      // Delete from storage and database
      await supabase.storage.from('documents').remove([doc.file_path]);
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

  const handleCreateFolder = async (name: string) => {
    if (!user || !canCreateFolders) return;

    const { data, error } = await supabase
      .from('folders')
      .insert([{ name, user_id: user.id, created_by: user.id }])
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le dossier',
        variant: 'destructive',
      });
      return;
    }

    setFolders(prev => [...prev, data as Folder].sort((a, b) => a.name.localeCompare(b.name)));
    toast({ title: 'Dossier créé', description: `"${name}" a été créé.` });
  };

  const handleRenameFolder = async (name: string) => {
    if (!renameFolderData || !canRenameFolders) return;

    const { error } = await supabase
      .from('folders')
      .update({ name })
      .eq('id', renameFolderData.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer le dossier',
        variant: 'destructive',
      });
      return;
    }

    setFolders(prev =>
      prev.map(f => (f.id === renameFolderData.id ? { ...f, name } : f))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setRenameFolderData(null);
    toast({ title: 'Dossier renommé' });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!canDeleteFolders) {
      toast({
        title: 'Action non autorisée',
        description: 'Vous n\'avez pas les permissions pour supprimer des dossiers.',
        variant: 'destructive',
      });
      return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const { error } = await supabase.from('folders').delete().eq('id', folderId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le dossier',
        variant: 'destructive',
      });
      return;
    }

    setFolders(prev => prev.filter(f => f.id !== folderId));
    // Documents in this folder will have folder_id set to null due to ON DELETE SET NULL
    setDocuments(prev => prev.map(d => d.folder_id === folderId ? { ...d, folder_id: null } : d));
    if (currentFolderId === folderId) {
      setCurrentFolderId(null);
    }
    toast({ title: 'Dossier supprimé', description: `"${folder.name}" a été supprimé.` });
  };

  const handleMoveDocument = async (targetFolderId: string | null) => {
    if (!moveDocumentId) return;

    const { error } = await supabase
      .from('documents')
      .update({ folder_id: targetFolderId })
      .eq('id', moveDocumentId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de déplacer le document',
        variant: 'destructive',
      });
      return;
    }

    setDocuments(prev =>
      prev.map(d => (d.id === moveDocumentId ? { ...d, folder_id: targetFolderId } : d))
    );
    setMoveDocumentId(null);
    toast({ title: 'Document déplacé' });
  };

  const documentToMove = documents.find(d => d.id === moveDocumentId);
  const canManageAccess = hasRole('admin');

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentFolderId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentFolderId(null)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold">
                  {currentFolder ? currentFolder.name : 'Documents'}
                </h1>
                {currentFolder && (
                  (() => {
                    const Icon = accessIcons[currentFolder.access_level];
                    return <Icon className="w-5 h-5 text-muted-foreground" />;
                  })()
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {currentFolder
                  ? `${currentDocuments.length} document${currentDocuments.length !== 1 ? 's' : ''}`
                  : 'Gérez vos documents et leur statut d\'ingestion'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreateFolders && (
              <Button
                variant="outline"
                onClick={() => setCreateFolderOpen(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Nouveau dossier
              </Button>
            )}
            {canUploadDocuments && <UploadButton onUploadComplete={fetchData} />}
          </div>
        </div>

        {/* Content */}
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
        ) : (
          <>
            {/* Folders (only show at root level) */}
            {!currentFolderId && folders.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Dossiers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folders.map(folder => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      documentCount={documents.filter(d => d.folder_id === folder.id).length}
                      onClick={() => setCurrentFolderId(folder.id)}
                      onDelete={canDeleteFolders ? () => handleDeleteFolder(folder.id) : undefined}
                      onRename={canRenameFolders ? () => setRenameFolderData(folder) : undefined}
                      onManageAccess={canManageAccess ? () => setAccessDialogFolder(folder) : undefined}
                      accessLevel={folder.access_level}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {currentDocuments.length === 0 && (!currentFolderId ? folders.length === 0 : true) ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {currentFolderId ? 'Dossier vide' : 'Aucun document'}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    {currentFolderId
                      ? 'Déplacez des documents dans ce dossier pour les organiser.'
                      : 'Commencez par uploader vos premiers documents pour les interroger avec le chatbot.'}
                  </p>
                  {!currentFolderId && canUploadDocuments && <UploadButton onUploadComplete={fetchData} />}
                </CardContent>
              </Card>
            ) : currentDocuments.length > 0 && (
              <div className="space-y-3">
                {!currentFolderId && folders.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Documents (racine)
                  </h2>
                )}
                {currentDocuments.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={canDeleteDocuments ? handleDeleteDocument : undefined}
                    onMove={canRenameDocuments ? (id) => setMoveDocumentId(id) : undefined}
                    isDeleting={deletingId === doc.id}
                  />
                ))}
              </div>
            )}
          </>
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

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onConfirm={handleCreateFolder}
        mode="create"
      />

      {/* Rename Folder Dialog */}
      <CreateFolderDialog
        open={!!renameFolderData}
        onOpenChange={(open) => !open && setRenameFolderData(null)}
        onConfirm={handleRenameFolder}
        initialName={renameFolderData?.name}
        mode="rename"
      />

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={!!moveDocumentId}
        onOpenChange={(open) => !open && setMoveDocumentId(null)}
        folders={folders}
        currentFolderId={documentToMove?.folder_id ?? null}
        onMove={handleMoveDocument}
      />

      {/* Folder Access Dialog */}
      {accessDialogFolder && (
        <FolderAccessDialog
          open={!!accessDialogFolder}
          onOpenChange={(open) => !open && setAccessDialogFolder(null)}
          folderId={accessDialogFolder.id}
          currentAccessLevel={accessDialogFolder.access_level}
          onUpdated={fetchData}
        />
      )}
    </AppLayout>
  );
}
