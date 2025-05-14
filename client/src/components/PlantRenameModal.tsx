import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getPlantInventoryCount, renamePlant } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plant } from '@shared/schema';

interface PlantRenameModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
  onSuccess?: () => void;
}

export function PlantRenameModal({ 
  isOpen, 
  onOpenChange, 
  plant, 
  onSuccess 
}: PlantRenameModalProps) {
  const [newName, setNewName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Reset form when modal opens/closes or plant changes
  React.useEffect(() => {
    if (isOpen && plant) {
      setNewName(plant.name);
    } else {
      setNewName('');
    }
  }, [isOpen, plant]);

  const handleRename = async () => {
    if (!plant) {
      toast({ 
        title: 'Error', 
        description: 'No plant selected for renaming', 
        variant: 'destructive' 
      });
      return;
    }

    if (!newName.trim()) {
      toast({ 
        title: 'Validation Error', 
        description: 'New plant name cannot be empty', 
        variant: 'destructive'
      });
      return;
    }

    // Don't do anything if name hasn't changed
    if (newName.trim() === plant.name) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      // First check if plant has inventory
      const inventoryData = await getPlantInventoryCount(plant.id);
      
      let proceedWithRename = true;
      let forceRenameFlag = false;

      if (inventoryData.count > 0) {
        // Ask for confirmation if plant has inventory
        const confirmed = window.confirm(
          `Plant "${plant.name}" has ${inventoryData.count} inventory item(s). Renaming may affect associated data. Do you want to proceed with renaming?`
        );
        
        if (confirmed) {
          forceRenameFlag = true;
        } else {
          proceedWithRename = false;
          toast({ 
            title: 'Rename Cancelled', 
            description: 'Plant renaming operation was cancelled' 
          });
        }
      }

      if (proceedWithRename) {
        const renameData = await renamePlant(plant.id, newName, forceRenameFlag);
        
        toast({
          title: 'Rename Successful',
          description: renameData.message,
          variant: 'default'
        });
        
        // Close modal and trigger refresh
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error('Error during rename process:', error);
      let description = 'An unexpected error occurred';
      
      if (error.message) {
        if (error.status === 409) {
          description = error.message || 'This plant has inventory. Renaming without confirmation is not allowed';
        } else if (error.status === 404) {
          description = 'Plant not found';
        } else {
          description = error.message;
        }
      }
      
      toast({
        title: 'Rename Failed',
        description,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Plant</DialogTitle>
          <DialogDescription>
            Enter a new name for this plant. If the plant has inventory, you'll be asked to confirm.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentName" className="text-right">
              Current Name
            </Label>
            <Input
              id="currentName"
              value={plant?.name || ''}
              className="col-span-3"
              disabled
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newName" className="text-right">
              New Name
            </Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="submit"
            disabled={isLoading || !newName.trim() || newName === plant?.name}
            onClick={handleRename}
          >
            {isLoading ? 'Processing...' : 'Rename Plant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}