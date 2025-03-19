"use client"

import { motion } from "framer-motion"
import { useState, useEffect, useCallback, useRef } from "react"
import { Utensils, BathIcon, Stethoscope, Gamepad } from "lucide-react"
import { DeviceIndicators } from "./device-indicators"
import { HappyCat, AlertCat, SadCat, TiredCat, HungryCat, DeadCat } from "./cat-emotions"
import { DonutIcon, FishIcon, BallIcon } from "./ui/icons"

// Add interface for interaction tracking
interface Interaction {
  id: string;
  timestamp: Date;
  type: "Feed" | "Play" | "Clean" | "Doctor";
  stats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  };
  emotion: "happy" | "sad" | "tired" | "hungry" | "curious" | "dead";
}

// Expanded for all stats
const StatusBar = ({ value, type }: { value: number; type: "food" | "happiness" | "cleanliness" | "energy" | "health" }) => {
  const getIcon = () => {
    if (type === "food") return "[~]"
    if (type === "happiness" && value > 66) return "(•ω•)"
    if (type === "happiness" && value > 33) return "(•д•)"
    if (type === "happiness") return "(•A•)"
    if (type === "cleanliness") return "🛁"
    if (type === "energy") return "⚡"
    if (type === "health") return "❤️"
    return "(?)"
  }
  
  const getStatus = (value: number, type: string) => {
    if (type === "food" && value > 100) return "Unhealthy"
    if (value <= 20) return "Low"
    if (value <= 60) return "Average"
    return "Healthy"
  }
  
  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-black">{getIcon()}</span>
        <span className="text-xs text-black">{getStatus(value, type)}</span>
      </div>
      <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${
            value <= 20 ? "bg-red-500" : 
            value <= 60 ? "bg-yellow-500" : 
            type === "food" && value > 100 ? "bg-orange-500" : "bg-green-500"
          }`} 
          style={{ width: `${Math.min(value, 100)}%` }} 
        />
      </div>
    </div>
  )
}

const PixelIcon = ({
  icon,
  label,
  isHighlighted,
}: { 
  icon: "food" | "clean" | "doctor" | "play" | "fish" | "cookie" | "catFood" | "kibble" | 
        "laser" | "feather" | "ball" | "puzzle" | "brush" | "bath" | "nails" | "styling" | "dental" |
        "checkup" | "vitamins" | "vaccine" | "surgery";
  label?: string;
  isHighlighted: boolean;
}) => {
  const getIcon = () => {
    switch (icon) {
      case "food":
        return <Utensils className="w-6 h-6" />;
      case "clean":
        return <BathIcon className="w-6 h-6" />;
      case "doctor":
        return <Stethoscope className="w-6 h-6" />;
      case "play":
        return <Gamepad className="w-6 h-6" />;
      case "fish":
        return <FishIcon className="w-6 h-6" />;
      case "cookie":
        return <DonutIcon className="w-6 h-6" />;
      case "catFood":
        return <span className="text-xl">🥫</span>;
      case "kibble":
        return <span className="text-xl">🥣</span>;
      case "laser":
        return <span className="text-xl">🔴</span>;
      case "feather":
        return <span className="text-xl">🪶</span>;
      case "ball":
        return <BallIcon className="w-6 h-6" />;
      case "puzzle":
        return <span className="text-xl">🧩</span>;
      case "brush":
        return <span className="text-xl">🧹</span>;
      case "bath":
        return <span className="text-xl">🛁</span>;
      case "nails":
        return <span className="text-xl">✂️</span>;
      case "styling":
        return <span className="text-xl">💇</span>;
      case "dental":
        return <span className="text-xl">🦷</span>;
      case "checkup":
        return <span className="text-xl">🩺</span>;
      case "vitamins":
        return <span className="text-xl">💊</span>;
      case "vaccine":
        return <span className="text-xl">💉</span>;
      case "surgery":
        return <span className="text-xl">🏥</span>;
      default:
        return <span className="text-xl">❓</span>;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 flex items-center justify-center rounded-lg ${
          isHighlighted ? "bg-gray-100 text-black" : "bg-transparent text-black hover:bg-gray-300 transition-colors"
        }`}
      >
        {getIcon()}
      </div>
      {label && <span className="text-xs mt-1">{label}</span>}
    </div>
  );
};

export function KawaiiDevice() {
  // Expanded state management
  const [food, setFood] = useState(50)
  const [happiness, setHappiness] = useState(40)
  const [cleanliness, setCleanliness] = useState(40)
  const [energy, setEnergy] = useState(30)
  const [health, setHealth] = useState(30)
  const [isDead, setIsDead] = useState(false)
  const [points, setPoints] = useState(0)
  
  // Original states
  const [selectedMenuItem, setSelectedMenuItem] = useState<number | null>(null)
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now())
  const [isFeeding, setIsFeeding] = useState(false)
  const [isMenuActive, setIsMenuActive] = useState(false)
  const [menuStack, setMenuStack] = useState<string[]>(["main"])
  const [selectedFoodItem, setSelectedFoodItem] = useState<number | null>(null)
  const [selectedPlayItem, setSelectedPlayItem] = useState<number | null>(null)
  const [selectedCleanItem, setSelectedCleanItem] = useState<number | null>(null)
  const [selectedDoctorItem, setSelectedDoctorItem] = useState<number | null>(null)
  
  // Animation states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isHealing, setIsHealing] = useState(false)
  const [showInteraction, setShowInteraction] = useState(false)
  const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null)
  
  // Create refs to track current state values
  const foodRef = useRef(food)
  const happinessRef = useRef(happiness)
  const cleanlinessRef = useRef(cleanliness)
  const energyRef = useRef(energy)
  const healthRef = useRef(health)
  
  // Keep refs in sync with state
  useEffect(() => {
    foodRef.current = food;
    happinessRef.current = happiness;
    cleanlinessRef.current = cleanliness;
    energyRef.current = energy;
    healthRef.current = health;
  }, [food, happiness, cleanliness, energy, health]);
  
  // Calculate health based on stats
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
  
  // Update health whenever stats change
  useEffect(() => {
    updateHealth();
  }, [food, happiness, cleanliness, energy, updateHealth]);
  
  // Stat decay over time
  useEffect(() => {
    if (isDead) return;
    
    const decayInterval = setInterval(() => {
      const timeElapsed = (Date.now() - lastInteractionTime) / (1000 * 60); // in minutes
      // Using accelerated decay for testing (32 points/hour = 0.53 points/minute)
      const decayRate = 0.53 * (timeElapsed / 60);
      
      setFood(prev => Math.max(prev - decayRate, 0));
      setHappiness(prev => Math.max(prev - decayRate, 0));
      setCleanliness(prev => Math.max(prev - decayRate, 0));
      setEnergy(prev => Math.max(prev - decayRate, 0));
      
      // Award points based on average health
      const averageStats = (food + happiness + cleanliness + energy) / 4;
      if (averageStats > 60) {
        setPoints(prev => prev + 100/60); // 100 points per hour = 100/60 per minute
      } else if (averageStats > 20) {
        setPoints(prev => prev + 50/60);
      } else {
        setPoints(prev => prev + 20/60);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(decayInterval);
  }, [lastInteractionTime, isDead]);
  
  // Menu inactivity timeout
  useEffect(() => {
    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastInteractionTime > 30000 && selectedMenuItem !== null) {
        setSelectedMenuItem(null)
        setIsMenuActive(false)
        setMenuStack(["main"])
      }
    }, 1000)
    return () => clearInterval(inactivityTimer)
  }, [lastInteractionTime, selectedMenuItem])
  
  // Interaction tracking
  const addInteraction = useCallback(
    (type: "Feed" | "Play" | "Clean" | "Doctor") => {
      // Access state via refs
      const currentFood = foodRef.current;
      const currentHappiness = happinessRef.current;
      const currentCleanliness = cleanlinessRef.current;
      const currentEnergy = energyRef.current;
      const currentHealth = healthRef.current;
      
      let emotion: "happy" | "sad" | "tired" | "hungry" | "curious" | "dead" = "curious";
      
      if (isDead) {
        emotion = "dead";
      } else if (currentFood < 30) {
        emotion = "hungry";
      } else if (currentHappiness < 30) {
        emotion = "sad";
      } else if (currentEnergy < 30) {
        emotion = "tired";
      } else if (currentHappiness > 70) {
        emotion = "happy";
      }
      
      const newInteraction: Interaction = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        type,
        stats: {
          food: currentFood,
          happiness: currentHappiness,
          cleanliness: currentCleanliness,
          energy: currentEnergy,
          health: currentHealth
        },
        emotion
      };
      
      setCurrentInteraction(newInteraction);
      setShowInteraction(true);
      
      // Hide interaction after 3 seconds
      setTimeout(() => {
        setShowInteraction(false);
      }, 3000);
    },
    [isDead]
  );
  
  // Apply stat changes
  const interact = useCallback((updates: {
    food?: number;
    happiness?: number;
    cleanliness?: number;
    energy?: number;
    health?: number;
  }) => {
    if (isDead) return;
    
    // Apply the updates with scaling factor for balance
    if (updates.food !== undefined) {
      setFood(prev => Math.min(Math.max(prev + updates.food! * 0.3, 0), 150));
    }
    if (updates.happiness !== undefined) {
      setHappiness(prev => Math.min(Math.max(prev + updates.happiness! * 0.3, 0), 100));
    }
    if (updates.cleanliness !== undefined) {
      setCleanliness(prev => Math.min(Math.max(prev + updates.cleanliness! * 0.3, 0), 100));
    }
    if (updates.energy !== undefined) {
      setEnergy(prev => Math.min(Math.max(prev + updates.energy! * 0.3, 0), 100));
    }
    if (updates.health !== undefined) {
      setHealth(prev => Math.min(Math.max(prev + updates.health! * 0.3, 0), 100));
    }
    
    setLastInteractionTime(Date.now());
  }, [isDead]);
  
  // Handle feeding actions
  const handleFeeding = useCallback((foodType: string) => {
    setIsFeeding(true);
    
    setTimeout(() => {
      setIsFeeding(false);
      
      switch(foodType) {
        case "fish":
          interact({ food: 12, energy: 6 });
          break;
        case "cookie":
          interact({ food: 10, energy: 12, health: -0.45 });
          break;
        case "catFood":
          interact({ food: 25, energy: 16 });
          break;
        case "kibble":
          interact({ food: 30, energy: 20 });
          break;
      }
      
      setMenuStack(["main"]);
      setSelectedMenuItem(null);
      setSelectedFoodItem(null);
      addInteraction("Feed");
    }, 1000);
  }, [interact, addInteraction]);
  
  // Handle play actions
  const handlePlaying = useCallback((playType: string) => {
    setIsPlaying(true);
    
    setTimeout(() => {
      setIsPlaying(false);
      
      switch(playType) {
        case "laser":
          interact({ happiness: 16, energy: -7, food: -2.5 });
          break;
        case "feather":
          interact({ happiness: 15, energy: -5, food: -2 });
          break;
        case "ball":
          interact({ happiness: 20, energy: -15, food: -3 });
          break;
        case "puzzle":
          interact({ happiness: 25, energy: -5, food: -4 });
          break;
      }
      
      setMenuStack(["main"]);
      setSelectedMenuItem(null);
      setSelectedPlayItem(null);
      addInteraction("Play");
    }, 1000);
  }, [interact, addInteraction]);
  
  // Handle cleaning actions
  const handleCleaning = useCallback((cleanType: string) => {
    setIsCleaning(true);
    
    setTimeout(() => {
      setIsCleaning(false);
      
      switch(cleanType) {
        case "brush":
          interact({ cleanliness: 25, happiness: 10 });
          break;
        case "bath":
          interact({ cleanliness: 50 });
          break;
        case "nails":
          interact({ cleanliness: 10, happiness: -5 });
          break;
        case "styling":
          interact({ cleanliness: 15, happiness: 20 });
          break;
        case "dental":
          interact({ cleanliness: 15, health: 10 });
          break;
      }
      
      setMenuStack(["main"]);
      setSelectedMenuItem(null);
      setSelectedCleanItem(null);
      addInteraction("Clean");
    }, 1000);
  }, [interact, addInteraction]);
  
  // Handle doctor action
  const handleDoctor = useCallback((treatmentType: string) => {
    setIsHealing(true);
    
    setTimeout(() => {
      setIsHealing(false);
      
      switch(treatmentType) {
        case 'checkup':
          interact({ health: 10, happiness: -5 });
          break;
        case 'vitamins':
          interact({ health: 20, happiness: -10 });
          break;
        case 'vaccine':
          interact({ health: 15, energy: 10, happiness: -15 });
          break;
        case 'surgery':
          interact({ health: 40, energy: -20, happiness: -20 });
          break;
        default:
          interact({ health: 30, happiness: -10 });
      }
      
      setMenuStack(["main"]);
      setSelectedMenuItem(null);
      setSelectedDoctorItem(null);
      addInteraction("Doctor");
    }, 1000);
  }, [interact, addInteraction]);
  
  // Button navigation handler
  const handleButtonClick = useCallback(
    (option: "food" | "clean" | "doctor" | "play" | "previous" | "next" | "a" | "b") => {
      setLastInteractionTime(Date.now());
      
      if (isDead) {
        if (option === "a") {
          // Reset game
          setFood(50);
          setHappiness(40);
          setCleanliness(40);
          setEnergy(30);
          setHealth(30);
          setIsDead(false);
          setPoints(0);
          setMenuStack(["main"]);
          setSelectedMenuItem(null);
        }
        return;
      }

      if (option === "previous" || option === "next") {
        setIsMenuActive(true);
        
        if (menuStack[menuStack.length - 1] === "main") {
          setSelectedMenuItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0;
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4;
          });
        } else if (menuStack[menuStack.length - 1] === "food") {
          setSelectedFoodItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0;
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4;
          });
        } else if (menuStack[menuStack.length - 1] === "play") {
          setSelectedPlayItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0;
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4;
          });
        } else if (menuStack[menuStack.length - 1] === "clean") {
          setSelectedCleanItem((prev) => {
            if (prev === null) return option === "previous" ? 4 : 0;
            return option === "previous" ? (prev - 1 + 5) % 5 : (prev + 1) % 5;
          });
        } else if (menuStack[menuStack.length - 1] === "doctor") {
          setSelectedDoctorItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0;
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4;
          });
        }
        return;
      }

      if (option === "a") {
        if (menuStack[menuStack.length - 1] === "main") {
          if (selectedMenuItem === 0) {
            // Food menu
            setMenuStack([...menuStack, "food"]);
            setSelectedFoodItem(0);
          } else if (selectedMenuItem === 1) {
            // Clean menu
            setMenuStack([...menuStack, "clean"]);
            setSelectedCleanItem(0);
          } else if (selectedMenuItem === 2) {
            // Doctor menu - now we show a doctor menu instead of direct action
            setMenuStack([...menuStack, "doctor"]);
          } else if (selectedMenuItem === 3) {
            // Play menu
            setMenuStack([...menuStack, "play"]);
            setSelectedPlayItem(0);
          }
        } else if (menuStack[menuStack.length - 1] === "food") {
          // Handle food selection
          const foodTypes = ["fish", "cookie", "catFood", "kibble"];
          if (selectedFoodItem !== null && selectedFoodItem < foodTypes.length) {
            handleFeeding(foodTypes[selectedFoodItem]);
          }
        } else if (menuStack[menuStack.length - 1] === "play") {
          // Handle play selection
          const playTypes = ["laser", "feather", "ball", "puzzle"];
          if (selectedPlayItem !== null && selectedPlayItem < playTypes.length) {
            handlePlaying(playTypes[selectedPlayItem]);
          }
        } else if (menuStack[menuStack.length - 1] === "clean") {
          // Handle clean selection
          const cleanTypes = ["brush", "bath", "nails", "styling", "dental"];
          if (selectedCleanItem !== null && selectedCleanItem < cleanTypes.length) {
            handleCleaning(cleanTypes[selectedCleanItem]);
          }
        } else if (menuStack[menuStack.length - 1] === "doctor") {
          // Handle doctor selection
          const doctorTypes = ["checkup", "medicine", "vaccine", "surgery"];
          if (selectedDoctorItem !== null && selectedDoctorItem < doctorTypes.length) {
            handleDoctor(doctorTypes[selectedDoctorItem]);
          }
        }
      }

      if (option === "b") {
        if (menuStack.length > 1) {
          setMenuStack((prev) => prev.slice(0, -1));
          if (menuStack[menuStack.length - 2] === "main") {
            setSelectedMenuItem(0);
            setSelectedFoodItem(null);
            setSelectedPlayItem(null);
            setSelectedCleanItem(null);
          }
        } else {
          setSelectedMenuItem(null);
          setIsMenuActive(false);
        }
      }
    },
    [
      selectedMenuItem, 
      menuStack, 
      selectedFoodItem, 
      selectedPlayItem, 
      selectedCleanItem, 
      handleFeeding, 
      handlePlaying, 
      handleCleaning, 
      handleDoctor,
      isDead
    ]
  );
  
  const getCatEmotion = () => {
    if (isDead) return <DeadCat />;
    if (isMenuActive) return <AlertCat selectedMenuItem={selectedMenuItem} />;
    if (isFeeding) return <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 0.5 }}><HappyCat /></motion.div>;
    if (isPlaying) return <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: 2, duration: 0.3 }}><HappyCat /></motion.div>;
    if (isCleaning) return <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5 }}><HappyCat /></motion.div>;
    if (isHealing) return <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5 }}><HappyCat /></motion.div>;
    if (food < 30) return <HungryCat />;
    if (happiness < 30) return <SadCat />;
    if (energy < 30 || food < 50 || happiness < 50) return <TiredCat />;
    return <HappyCat />;
  };
  
  const renderMenuContent = () => {
    if (isDead) {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <StatusBar value={food} type="food" />
            <StatusBar value={health} type="health" />
          </div>
          <div className="flex-grow flex flex-col items-center justify-center">
            {getCatEmotion()}
            <p className="text-red-500 font-bold mt-4">Your pet has died!</p>
            <button 
              onClick={() => handleButtonClick("a")}
              className="mt-2 bg-green-500 text-white py-1 px-3 rounded-md"
            >
              Revive
            </button>
          </div>
        </>
      );
    }
    
    // Main menu - show only average health and mood
    if (menuStack[menuStack.length - 1] === "main") {
      return (
        <>
          <div className="flex justify-between w-full mb-2 gap-2">
            <div className="flex-1">
              <StatusBar value={happiness} type="happiness" />
            </div>
            <div className="flex-1">
              <StatusBar value={health} type="health" />
            </div>
          </div>
          <div className="text-xs text-right mb-1">Points: {Math.floor(points)}</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            {["food", "clean", "doctor", "play"].map((icon, index) => (
              <PixelIcon
                key={icon}
                icon={icon as "food" | "clean" | "doctor" | "play"}
                isHighlighted={selectedMenuItem === index}
              />
            ))}
          </div>
        </>
      );
    }
    
    // Food page - show hunger and energy stats
    if (menuStack[menuStack.length - 1] === "food") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={food} type="food" />
            </div>
            <div className="flex-1">
              <StatusBar value={energy} type="energy" />
            </div>
          </div>
          <div className="text-xs mb-2">Select food to feed your pet:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="fish" label="Fish" isHighlighted={selectedFoodItem === 0} />
            <PixelIcon icon="cookie" label="Cookie" isHighlighted={selectedFoodItem === 1} />
            <PixelIcon icon="catFood" label="Cat Food" isHighlighted={selectedFoodItem === 2} />
            <PixelIcon icon="kibble" label="Kibble" isHighlighted={selectedFoodItem === 3} />
          </div>
        </>
      );
    }
    
    // Play page - show happiness and energy stats
    if (menuStack[menuStack.length - 1] === "play") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={happiness} type="happiness" />
            </div>
            <div className="flex-1">
              <StatusBar value={energy} type="energy" />
            </div>
          </div>
          <div className="text-xs mb-2">Choose a game to play:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="laser" label="Laser" isHighlighted={selectedPlayItem === 0} />
            <PixelIcon icon="feather" label="Feather" isHighlighted={selectedPlayItem === 1} />
            <PixelIcon icon="ball" label="Ball" isHighlighted={selectedPlayItem === 2} />
            <PixelIcon icon="puzzle" label="Puzzle" isHighlighted={selectedPlayItem === 3} />
          </div>
        </>
      );
    }
    
    // Clean page - show cleanliness and happiness stats
    if (menuStack[menuStack.length - 1] === "clean") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={cleanliness} type="cleanliness" />
            </div>
            <div className="flex-1">
              <StatusBar value={happiness} type="happiness" />
            </div>
          </div>
          <div className="text-xs mb-2">Choose grooming method:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="brush" label="Brush" isHighlighted={selectedCleanItem === 0} />
            <PixelIcon icon="bath" label="Bath" isHighlighted={selectedCleanItem === 1} />
            <PixelIcon icon="nails" label="Nails" isHighlighted={selectedCleanItem === 2} />
            <PixelIcon icon="styling" label="Style" isHighlighted={selectedCleanItem === 3} />
            <PixelIcon icon="dental" label="Dental" isHighlighted={selectedCleanItem === 4} />
          </div>
        </>
      );
    }
    
    // Doctor page - show health and specific treatment options in the same format
    if (menuStack[menuStack.length - 1] === "doctor") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={health} type="health" />
            </div>
            <div className="flex-1">
              <StatusBar value={happiness} type="happiness" />
            </div>
          </div>
          <div className="text-xs mb-2">Select treatment option:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="checkup" label="Check-up" isHighlighted={selectedDoctorItem === 0} />
            <PixelIcon icon="vitamins" label="Vitamins" isHighlighted={selectedDoctorItem === 1} />
            <PixelIcon icon="vaccine" label="Vaccine" isHighlighted={selectedDoctorItem === 2} />
            <PixelIcon icon="surgery" label="Surgery" isHighlighted={selectedDoctorItem === 3} />
          </div>
        </>
      );
    }
  };

  // Add this helper function
  const getHealthStatus = () => {
    if (health > 80) return "Excellent";
    if (health > 60) return "Good";
    if (health > 40) return "Fair";
    if (health > 20) return "Poor";
    return "Critical";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-pink-100 p-4">
      {showInteraction && currentInteraction && (
        <motion.div 
          className="absolute top-10 right-10 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h3 className="font-bold">{currentInteraction.type}</h3>
          <p>Food: {currentInteraction.stats.food.toFixed(1)}%</p>
          <p>Happiness: {currentInteraction.stats.happiness.toFixed(1)}%</p>
          <p>Cleanliness: {currentInteraction.stats.cleanliness.toFixed(1)}%</p>
          <p>Energy: {currentInteraction.stats.energy.toFixed(1)}%</p>
          <p>Health: {currentInteraction.stats.health.toFixed(1)}%</p>
          <p>Pet is feeling {currentInteraction.emotion}</p>
        </motion.div>
      )}
      <motion.div
        className="w-full max-w-[320px] bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-[2rem] p-4 pb-16 shadow-xl relative overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-purple-400/50" />
        <div className="absolute top-2 left-0 right-0 flex justify-center">
          <DeviceIndicators status={isDead ? "dead" : food < 30 ? "alert" : isFeeding || isPlaying || isCleaning || isHealing ? "active" : "idle"} />
        </div>
        <div className="bg-[#c3cfa1] rounded-lg p-2 mb-4 relative">
          <div className="relative bg-[#7b8d4c] rounded-md p-3 flex flex-col items-center justify-between h-[320px] border-4 border-[#5a6b2f] shadow-inner">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#00000010_1px,transparent_2px)] opacity-50" />
            {renderMenuContent()}
          </div>
        </div>

        <div className="relative mt-6 flex justify-around px-2 space-x-2">
          {["Previous", "Next", "A", "B"].map((label, index) => (
            <div key={index} className="flex flex-col items-center">
              <motion.button
                onClick={() => handleButtonClick(label.toLowerCase() as "previous" | "next" | "a" | "b")}
                className={`w-10 h-10 rounded-full relative group overflow-hidden ${
                  index < 2 ? "bg-gray-300" : "bg-red-500"
                }`}
                whileTap={{ scale: 0.95 }}
                aria-label={label}
              >
                <div
                  className={`absolute inset-0 rounded-full ${
                    index < 2
                      ? "bg-gradient-to-br from-gray-200 to-gray-400"
                      : "bg-gradient-to-br from-red-400 to-red-600"
                  }`}
                />

                <div
                  className={`absolute inset-[2px] rounded-full ${
                    index < 2
                      ? "bg-gradient-to-tl from-gray-300 to-gray-200"
                      : "bg-gradient-to-tl from-red-500 to-red-400"
                  } flex items-center justify-center`}
                >
                  {index < 2 ? (
                    <div
                      className={`w-5 h-5 flex items-center justify-center ${
                        index === 0 ? "-translate-x-0.5" : "translate-x-0.5"
                      }`}
                    >
                      <div
                        className={`w-0 h-0 ${
                          index === 0
                            ? "border-r-[8px] border-r-gray-500 border-y-[5px] border-y-transparent"
                            : "border-l-[8px] border-l-gray-500 border-y-[5px] border-y-transparent"
                        }`}
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-white">{label}</span>
                  )}
                </div>

                <div className="absolute inset-0 rounded-full opacity-0 group-active:opacity-100 bg-black/10 transition-opacity" />
              </motion.button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

