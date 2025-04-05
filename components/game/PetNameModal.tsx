import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import PixelatedContainer from '@/components/game/PixelatedContainerBig';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/dialog';

export function UsernameModal() {
  const { isConnected, publicKey, walletData, setUsername, isNewUser, showPetNamePrompt } = useWallet();
  const [open, setOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add debug logging
  useEffect(() => {
    console.log('UsernameModal state:', { 
      isConnected, 
      hasPublicKey: !!publicKey, 
      hasWalletData: !!walletData,
      isNewUser,
      showPetNamePrompt,
      isOpen: open
    });
  }, [isConnected, publicKey, walletData, isNewUser, showPetNamePrompt, open]);

  // Set initial name field
  useEffect(() => {
    if (publicKey && walletData?.username) {
      // Pre-fill with current username for better UX
      setUsernameInput(walletData.username);
    } else {
      setUsernameInput('');
    }
  }, [publicKey, walletData]);

  // Show dialog based on showPetNamePrompt flag
  useEffect(() => {
    console.log("showPetNamePrompt changed:", showPetNamePrompt);
    if (showPetNamePrompt) {
      console.log("Showing pet name modal");
      setOpen(true);
    } else {
      console.log("Hiding pet name modal");
      setOpen(false);
    }
  }, [showPetNamePrompt]);

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

  // Prevent closing the modal if no name is set
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Allow closing if user already has a name
      if (!isNewUser) {
        setOpen(false);
      } else {
        // Keep dialog open if user is new (force them to set a name)
        setOpen(true);
        setError('Please choose a pet name first');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 bg-transparent border-none shadow-none">
        <PixelatedContainer bgcolor="#EBFFB7" className="p-6 rounded-xl">
          <DialogHeader className="font-pixelify text-[#304700]">
            <DialogTitle className="text-2xl">Choose Your Pet Name</DialogTitle>
            <DialogDescription className="text-[#304700]/80 font-pixelify">
              Please enter a name for your pet to identify yourself
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right col-span-1 font-pixelify text-[#304700]">
                  Pet Name
                </label>
                <Input
                  id="name"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your pet's name"
                  className="col-span-3 bg-white/70 border-[#304700] font-pixelify text-[#304700] placeholder-[#304700]/50"
                  maxLength={16}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center font-pixelify">{error}</p>}
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting || !usernameInput.trim()}
                className="bg-[#304700] hover:bg-[#3a5800] text-white font-pixelify px-6 py-3"
              >
                {isSubmitting ? 'Saving...' : 'Save Pet Name'}
              </Button>
            </DialogFooter>
          </form>
        </PixelatedContainer>
      </DialogContent>
    </Dialog>
  );
} 
