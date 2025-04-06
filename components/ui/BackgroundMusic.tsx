"use client";

import { useEffect, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';

const BackgroundMusic = () => {
  const { isConnected } = useWallet();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isConnected) {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/sounds/music.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3; // Set volume to 30%
      }
      
      // Play music when connected
      audioRef.current.play().catch(err => {
        console.error("Error playing background music:", err);
      });
    } else if (audioRef.current) {
      // Pause music when disconnected
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [isConnected]);

  return null; // This component doesn't render anything
};

export default BackgroundMusic; 