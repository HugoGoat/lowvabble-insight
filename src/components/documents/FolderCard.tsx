import { Folder, MoreVertical, Trash2, Edit2, Lock, Users, UserCheck, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AccessLevel = 'private' | 'team' | 'custom';

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    created_at: string;
  };
  documentCount: number;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onManageAccess?: () => void;
  accessLevel?: AccessLevel;
  isDeleting?: boolean;
}

const accessIcons = {
  private: Lock,
  team: Users,
  custom: UserCheck,
};

export default function FolderCard({
  folder,
  documentCount,
  onClick,
  onDelete,
  onRename,
  onManageAccess,
  accessLevel = 'team',
  isDeleting,
}: FolderCardProps) {
  const AccessIcon = accessIcons[accessLevel];
  const hasActions = onDelete || onRename || onManageAccess;

  return (
    <Card
      className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center relative">
          <Folder className="w-6 h-6 text-primary" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
            <AccessIcon className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{folder.name}</h3>
          <p className="text-sm text-muted-foreground">
            {documentCount} document{documentCount !== 1 ? 's' : ''}
          </p>
        </div>
        {hasActions && (
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
              {onRename && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Renommer
                </DropdownMenuItem>
              )}
              {onManageAccess && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageAccess(); }}>
                  <Settings2 className="w-4 h-4 mr-2" />
                  Gérer l'accès
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
