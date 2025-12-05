import { Folder, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Folder {
  id: string;
  name: string;
}

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
}

export default function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  onMove,
}: MoveToFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Déplacer vers un dossier</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
          <Button
            variant={currentFolderId === null ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              onMove(null);
              onOpenChange(false);
            }}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Racine (aucun dossier)
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={currentFolderId === folder.id ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                onMove(folder.id);
                onOpenChange(false);
              }}
            >
              <Folder className="w-4 h-4 mr-2" />
              {folder.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
