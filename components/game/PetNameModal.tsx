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

export function UsernameModal() {
  const { isConnected, publicKey, walletData, setUsername, isNewUser } = useWallet();
  const [open, setOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Set initial name field
  useEffect(() => {
    if (publicKey) {
      // Always start with an empty field for better UX
      setUsernameInput('');
    }
  }, [publicKey]);

  // Show dialog only for new users
  useEffect(() => {
    if (isConnected && isNewUser) {
      console.log("New user connected, showing pet name modal");
      setOpen(true);
    } else if (!isNewUser) {
      // Close the modal if user is no longer new (e.g. after setting pet name)
      setOpen(false);
    }
  }, [isConnected, isNewUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameInput.trim()) {
      setError('Please enter a pet name');
      return;
    }
    
    // Don't allow names that start with 'User_'
    if (usernameInput.trim().startsWith('User_')) {
      setError('Please choose a custom pet name');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await setUsername(usernameInput.trim());
      if (success) {
        console.log("Successfully set pet name to:", usernameInput.trim());
        setOpen(false);
      } else {
        setError('Failed to save pet name. Please try again');
      }
    } catch (err) {
      console.error('Error saving pet name:', err);
      setError('An error occurred. Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent closing the modal if name isn't set
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if submitting or form has been completed
    if (!newOpen && !isNewUser) {
      setOpen(false);
    } else {
      // Keep dialog open if user is new (force them to set a name)
      setOpen(true);
      
      // If trying to close without setting a name, show an error
      if (!newOpen && isNewUser) {
        setError('Please choose a pet name first');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose Your Pet Name</DialogTitle>
          <DialogDescription>
            Please enter a name for your pet to identify yourself
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
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your pet's name"
                className="col-span-3"
                maxLength={16}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !usernameInput.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Pet Name'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
