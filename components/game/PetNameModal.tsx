import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/dialog';

export function PetNameModal() {
  const { isConnected, publicKey, walletData, setPetName, isNewUser } = useWallet();
  const [open, setOpen] = useState(false);
  const [petNameInput, setPetNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Set initial name field
  useEffect(() => {
    if (publicKey) {
      // Always start with an empty field for better UX
      setPetNameInput('');
    }
  }, [publicKey]);

  // Show dialog only for new users
  useEffect(() => {
    if (isConnected && isNewUser) {
      console.log("New user connected, showing pet name modal");
      setOpen(true);
    }
  }, [isConnected, isNewUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!petNameInput.trim()) {
      setError('Please enter a name for your pet');
      return;
    }
    
    // Don't allow names that start with 'Pet_'
    if (petNameInput.trim().startsWith('Pet_')) {
      setError('Please choose a custom name');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await setPetName(petNameInput.trim());
      if (success) {
        console.log("Successfully set pet name to:", petNameInput.trim());
        setOpen(false);
      } else {
        setError('Failed to save name. Please try again');
      }
    } catch (err) {
      console.error('Error saving pet name:', err);
      setError('An error occurred. Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent closing the modal if we have a default name
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if submitting or form has been completed
    if (!newOpen && isSubmitting) {
      setOpen(false);
    } else if (!newOpen) {
      // If trying to close with a default name, show an error
      setError('Please choose a name for your pet first');
    } else {
      setOpen(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Name Your Pet</DialogTitle>
          <DialogDescription>
            Please enter a name for your new pet
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right col-span-1">
                Pet Name
              </label>
              <Input
                id="name"
                value={petNameInput}
                onChange={(e) => setPetNameInput(e.target.value)}
                placeholder="Enter your pet's name"
                className="col-span-3"
                maxLength={16}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !petNameInput.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Name'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
