import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EventActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveForLater: () => void;
  onDelete: () => void;
  eventTitle: string;
}

export function EventActionsDialog({
  open,
  onOpenChange,
  onSaveForLater,
  onDelete,
  eventTitle,
}: EventActionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What would you like to do?</DialogTitle>
          <DialogDescription>
            Selected event: <span className="font-semibold">{eventTitle}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onSaveForLater} className="flex-1">
            Save for Later
          </Button>
          <Button variant="destructive" onClick={onDelete} className="flex-1">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
