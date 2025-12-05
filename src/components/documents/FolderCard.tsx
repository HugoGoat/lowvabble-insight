import { Folder, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    created_at: string;
  };
  documentCount: number;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
  isDeleting?: boolean;
}

export default function FolderCard({
  folder,
  documentCount,
  onClick,
  onDelete,
  onRename,
  isDeleting,
}: FolderCardProps) {
  return (
    <Card
      className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Folder className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{folder.name}</h3>
          <p className="text-sm text-muted-foreground">
            {documentCount} document{documentCount !== 1 ? 's' : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
