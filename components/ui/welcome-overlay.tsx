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
  const { isConnected, publicKey, walletData, setUsername: updateUsername } = useWallet();

  useEffect(() => {
    // Show overlay when user is connected
    if (isConnected && publicKey) {
      setVisible(true);
    }
  }, [isConnected, publicKey]);

  // Handle manual dismiss
  const handleDismiss = () => {
    setVisible(false);
  };

  // Check if username is already taken
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
        throw new Error(data.error || 'Failed to check username availability');
      }
      
      return data.available;
    } catch (error) {
      console.error('Error checking username availability:', error);
      setError('Could not verify username availability. Please try again.');
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
      // First check if username is available
      const isAvailable = await checkUsernameAvailability(username.trim());
      
      if (!isAvailable) {
        setError("This username is already taken. Please choose another.");
        setIsSubmitting(false);
        return;
      }
      
      // If available, update the username
      const result = await updateUsername(username.trim());
      
      if (result) {
        // Show success message briefly before closing
        setSuccess(true);
        setTimeout(() => {
          setVisible(false);
        }, 1500);
      } else {
        setError("Failed to save username to database. Please try again.");
      }
    } catch (error) {
      console.error('Failed to update username:', error);
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
          <div className="absolute inset-0 bg-black/50" onClick={handleDismiss}></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-md w-full mx-4"
          >
            <form onSubmit={handleSubmit} className="bg-gradient-to-br from-purple-500 to-cyan-400 rounded-xl shadow-2xl p-8 border-2 border-white">
              <h1 className="text-3xl font-pixelify text-white mb-6 text-center">
                Choose Your Username
              </h1>
              
              {success ? (
                <div className="text-center mb-6">
                  <div className="bg-white/20 rounded-lg p-4 mb-4">
                    <p className="text-xl font-pixelify text-white">
                      Username saved successfully!
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
                      What username would you like to use?
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-white/90 rounded-lg font-pixelify text-lg text-indigo-900 placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white"
                      placeholder="Enter username..."
                      maxLength={20}
                      required
                    />
                    <p className="text-white/80 text-sm mt-2 font-pixelify">
                      Your username must be unique. It will be visible to other players.
                    </p>
                  </div>
                
                  {error && (
                    <div className="mb-6">
                      <div className="bg-red-500/30 border border-red-500/50 rounded-lg p-3">
                        <p className="text-white font-pixelify">{error}</p>
                      </div>
                    </div>
                  )}
                
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="px-6 py-3 bg-white/30 text-white rounded-lg font-pixelify hover:bg-white/40 transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      disabled={!username.trim() || isSubmitting || isChecking}
                      className="px-6 py-3 bg-white text-indigo-700 rounded-lg font-pixelify hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChecking ? 'Checking...' : isSubmitting ? 'Saving...' : 'Save Username'}
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