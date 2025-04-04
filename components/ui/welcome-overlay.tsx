"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeOverlayProps {
  duration?: number; // Duration in milliseconds before auto-dismissal
}

const WelcomeOverlay = ({ duration = 3000 }: WelcomeOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isConnected, publicKey, walletData, setUsername: updateUsername, isNewUser } = useWallet();

  useEffect(() => {
    // Show overlay only for new users
    if (isConnected && publicKey && isNewUser) {
      setVisible(true);
    }
  }, [isConnected, publicKey, isNewUser]);

  // Prevent dismiss by click on backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Show an error if they try to click away
    setError("Please set a pet name to continue");
  };

  // Check if pet name is already taken
  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;
    
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check pet name availability');
      }
      
      return data.available;
    } catch (error) {
      console.error('Error checking pet name availability:', error);
      setError('Could not verify pet name availability. Please try again.');
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // First check if pet name is available
      const isAvailable = await checkUsernameAvailability(username.trim());
      
      if (!isAvailable) {
        setError("This pet name is already taken. Please choose another.");
        setIsSubmitting(false);
        return;
      }
      
      // If available, update the pet name
      const result = await updateUsername(username.trim());
      
      if (result) {
        // Show success message briefly before closing
        setSuccess(true);
        setTimeout(() => {
          setVisible(false);
        }, 1500);
      } else {
        setError("Failed to save pet name to database. Please try again.");
      }
    } catch (error) {
      console.error('Failed to update pet name:', error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 555 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={handleBackdropClick}></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-md w-full mx-4"
          >
            <form onSubmit={handleSubmit} className="bg-gradient-to-br from-purple-500 to-cyan-400 rounded-xl shadow-2xl p-8 border-2 border-white">
              <h1 className="text-3xl font-pixelify text-white mb-6 text-center">
                Choose Your Pet Name
              </h1>
              
              {success ? (
                <div className="text-center mb-6">
                  <div className="bg-white/20 rounded-lg p-4 mb-4">
                    <p className="text-xl font-pixelify text-white">
                      Pet name saved successfully!
                    </p>
                    <p className="text-lg font-pixelify text-white/80 mt-2">
                      Welcome, {username}!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label htmlFor="username" className="block text-xl text-white font-pixelify mb-2">
                      What would you like to name your pet?
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-white/90 rounded-lg font-pixelify text-lg text-indigo-900 placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white"
                      placeholder="Enter pet name..."
                      maxLength={20}
                      required
                    />
                    <p className="text-white/80 text-sm mt-2 font-pixelify">
                      Your pet name must be unique. It will be visible to other players.
                    </p>
                  </div>
                
                  {error && (
                    <div className="mb-6">
                      <div className="bg-red-500/30 border border-red-500/50 rounded-lg p-3">
                        <p className="text-white font-pixelify">{error}</p>
                      </div>
                    </div>
                  )}
                
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={!username.trim() || isSubmitting || isChecking}
                      className="px-6 py-3 bg-white text-indigo-700 rounded-lg font-pixelify hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChecking ? 'Checking...' : isSubmitting ? 'Saving...' : 'Save Pet Name'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeOverlay; 