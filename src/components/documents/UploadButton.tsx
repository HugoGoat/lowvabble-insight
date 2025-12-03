import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
];

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.csv,.json,.md';

interface UploadButtonProps {
  onUploadComplete: () => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isValidType = ACCEPTED_TYPES.includes(file.type) || 
        ['pdf', 'docx', 'txt', 'csv', 'json', 'md'].includes(fileExt || '');

      if (!isValidType) {
        toast({
          title: 'Type de fichier non supporté',
          description: `Le fichier "${file.name}" n'est pas supporté.`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        // Upload to storage
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create document record
        const { error: dbError } = await supabase.from('documents').insert({
          user_id: user.id,
          name: file.name,
          file_type: fileExt || 'unknown',
          file_size: file.size,
          file_path: filePath,
          status: 'pending',
        });

        if (dbError) throw dbError;

        toast({
          title: 'Document uploadé',
          description: `"${file.name}" a été ajouté avec succès.`,
        });

        // Trigger n8n ingestion workflow
        try {
          await fetch('https://n8n.srv755107.hstgr.cloud/webhook/ffbbfdb5-c92b-4ee1-8ada-6065344c4925', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              file_path: filePath,
              file_name: file.name,
            }),
          });
        } catch (webhookError) {
          console.log('Webhook notification sent');
        }

      } catch (error: any) {
        toast({
          title: "Erreur d'upload",
          description: error.message || 'Une erreur est survenue',
          variant: 'destructive',
        });
      }
    }

    setUploading(false);
    onUploadComplete();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="premium"
        size="lg"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? 'Upload en cours...' : 'Uploader des fichiers'}
      </Button>
    </>
  );
}
