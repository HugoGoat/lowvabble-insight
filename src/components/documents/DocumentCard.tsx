import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  FileSpreadsheet, 
  FileJson,
  File,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  csv: FileSpreadsheet,
  json: FileJson,
};

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string; bg: string; animate?: boolean }> = {
  pending: { icon: Clock, label: 'En attente', color: 'text-warning', bg: 'bg-warning/10' },
  processing: { icon: Loader2, label: 'Ingestion...', color: 'text-primary', bg: 'bg-primary/10', animate: true },
  ingested: { icon: CheckCircle, label: 'Ingéré', color: 'text-success', bg: 'bg-success/10' },
  error: { icon: AlertCircle, label: 'Erreur', color: 'text-destructive', bg: 'bg-destructive/10' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentCard({ document, onDelete, isDeleting }: DocumentCardProps) {
  const Icon = typeIcons[document.file_type] || File;
  const status = statusConfig[document.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="border-border/50 hover:shadow-medium transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6 text-primary" />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" title={document.name}>
              {document.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="uppercase">{document.file_type}</span>
              <span>•</span>
              <span>{formatFileSize(document.file_size)}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(document.created_at), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            status.bg, status.color
          )}>
            <StatusIcon className={cn("w-3.5 h-3.5", status.animate && "animate-spin")} />
            <span>{status.label}</span>
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(document.id)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
