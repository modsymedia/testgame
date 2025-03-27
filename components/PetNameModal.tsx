import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function PetNameModal() {
  const { isConnected, publicKey, walletData, setPetName } = useWallet();
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

  // Show dialog when user is connected - ALWAYS show for all users for testing
  useEffect(() => {
    if (isConnected) {
      console.log("Connected user, showing pet name modal");
      // Force the modal to be open for all users
      setOpen(true);
    }
  }, [isConnected, walletData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!petNameInput.trim()) {
      setError('لطفا نام حیوان خانگی خود را وارد کنید');
      return;
    }
    
    // Don't allow names that start with 'Pet_'
    if (petNameInput.trim().startsWith('Pet_')) {
      setError('لطفاً یک نام سفارشی انتخاب کنید');
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
        setError('خطا در ذخیره نام. لطفا دوباره تلاش کنید');
      }
    } catch (err) {
      console.error('Error saving pet name:', err);
      setError('خطایی رخ داد. لطفا دوباره تلاش کنید');
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
      setError('لطفاً ابتدا یک نام برای حیوان خانگی خود انتخاب کنید');
    } else {
      setOpen(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>مرحله نام گذاری پت شما</DialogTitle>
          <DialogDescription>
            لطفاً یک نام جدید برای حیوان خانگی خود وارد کنید
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right col-span-1">
                نام پت
              </label>
              <Input
                id="name"
                value={petNameInput}
                onChange={(e) => setPetNameInput(e.target.value)}
                placeholder="نام جدید پت را وارد کنید"
                className="col-span-3"
                maxLength={16}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !petNameInput.trim()}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره نام'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 