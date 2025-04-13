"use client";

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image'; // Import Image component
import { useWallet } from '@/context/WalletContext';

const BackgroundMusic = () => {
  const { isConnected } = useWallet();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isUserPaused, setIsUserPaused] = useState<boolean>(() => {
    // Get initial state from localStorage, default to false (not paused)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('musicPaused') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const initializeAudio = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/sounds/music.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
      }
    };

    if (isConnected) {
      initializeAudio();
      if (!isUserPaused && audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error("Error playing background music:", err);
          // Attempt to play again after user interaction if autoplay fails initially
          const playOnClick = () => {
             if (audioRef.current && !isUserPaused && isConnected) {
                audioRef.current.play().catch(innerErr => {
                    console.error("Error playing background music after interaction:", innerErr);
                });
             }
             document.removeEventListener('click', playOnClick);
          }
          document.addEventListener('click', playOnClick);
        });
      } else if (isUserPaused && audioRef.current) {
        audioRef.current.pause();
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }

    // Correct cleanup function
    return () => {
      // Optional: Pause audio on effect cleanup if desired, though pausing on disconnect might be sufficient.
      // if (audioRef.current) {
      //  audioRef.current.pause();
      // }
      // Consider if full audio element cleanup is needed on component unmount vs. just pausing.
    };
  }, [isConnected, isUserPaused]);

  const toggleMusic = () => {
    const newUserPaused = !isUserPaused;
    setIsUserPaused(newUserPaused);

    if (typeof window !== 'undefined') {
      localStorage.setItem('musicPaused', newUserPaused.toString());
    }

    if (audioRef.current) {
        if (newUserPaused) {
            audioRef.current.pause();
        } else if (isConnected) { // Only play if connected
            audioRef.current.play().catch(err => {
                console.error("Error playing background music on toggle:", err);
            });
        }
    } else if (!newUserPaused && isConnected) {
        // Audio not initialized yet, useEffect will handle play on state change
    }
  };

  // Component return statement with styled button
  return (
    <button
      onClick={toggleMusic}
      className="fixed bottom-20 sm:bottom-5 right-5 z-[1000] flex items-center justify-center bg-[#304700] text-[#EBFFB7] rounded-md font-pixelify text-sm hover:bg-[#709926] transition-colors shadow-md border border-[#EBFFB7]/30"
      style={{
        width: '40px',
        height: '40px',
      }}
      aria-label={isUserPaused ? "Play Music" : "Pause Music"} 
    >
      <Image
        src={isUserPaused ? "/assets/icons/play-pixel-icon.svg" : "/assets/icons/pause-pixel-icon.svg"} 
        alt={isUserPaused ? "Play" : "Pause"}
        width={16}
        height={16} 
        unoptimized 
      />
    </button>
  );
};

export default BackgroundMusic; 