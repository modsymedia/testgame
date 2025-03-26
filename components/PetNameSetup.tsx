import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PetNameSetup() {
  const { publicKey, setPetName } = useWallet();
  const [petName, setPetNameInput] = useState(`Pet_${publicKey?.substring(0, 4) || 'New'}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!petName.trim()) {
      setError('Please enter a name for your pet');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await setPetName(petName.trim());
      if (!success) {
        setError('Failed to save pet name. Please try again.');
      }
    } catch (err) {
      console.error('Error saving pet name:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Welcome to CryptoKitty!</h2>
        
        <p className="mb-4 text-gray-600">
          Please name your virtual pet before you begin your journey.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">
              Pet Name
            </label>
            <Input
              id="petName"
              type="text"
              value={petName}
              onChange={(e) => setPetNameInput(e.target.value)}
              placeholder="Enter a name for your pet"
              maxLength={16}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !petName.trim()}
              className="w-full"
            >
              {isSubmitting ? 'Setting up your pet...' : 'Start Game'}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            You can change your pet's name later in the settings.
          </p>
        </form>
      </div>
    </div>
  );
} 