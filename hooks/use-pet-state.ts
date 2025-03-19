import { useState, useEffect, useCallback, useRef } from "react";

export function usePetState() {
  // Basic stats
  const [food, setFood] = useState(50);
  const [happiness, setHappiness] = useState(40);
  const [cleanliness, setCleanliness] = useState(40);
  const [energy, setEnergy] = useState(30);
  const [health, setHealth] = useState(30);
  const [isDead, setIsDead] = useState(false);
  const [points, setPoints] = useState(0);
  
  // Refs to track current values
  const foodRef = useRef(food);
  const happinessRef = useRef(happiness);
  const cleanlinessRef = useRef(cleanliness);
  const energyRef = useRef(energy);
  const healthRef = useRef(health);
  
  // Keep refs in sync with state
  useEffect(() => {
    foodRef.current = food;
    happinessRef.current = happiness;
    cleanlinessRef.current = cleanliness;
    energyRef.current = energy;
    healthRef.current = health;
  }, [food, happiness, cleanliness, energy, health]);
  
  // Health calculation
  const updateHealth = useCallback(() => {
    let newHealth = (food * 0.4) + (happiness * 0.2) + (cleanliness * 0.2) + (energy * 0.2);
    
    // Apply penalty for overfeeding
    if (food > 100) {
      newHealth -= (food - 100) * 0.1;
    }
    
    newHealth = Math.max(newHealth, 0);
    setHealth(newHealth);
    
    // Check for death condition
    if (newHealth === 0 || food === 0) {
      setIsDead(true);
    }
  }, [food, happiness, cleanliness, energy]);
  
  // Update health when stats change
  useEffect(() => {
    updateHealth();
  }, [food, happiness, cleanliness, energy, updateHealth]);
  
  return {
    food, setFood,
    happiness, setHappiness,
    cleanliness, setCleanliness,
    energy, setEnergy,
    health, setHealth,
    isDead, setIsDead,
    points, setPoints,
    updateHealth
  };
} 