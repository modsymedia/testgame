"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import Tilt from "react-parallax-tilt";
import { useMediaQuery } from "react-responsive";
import { PixelIcon } from "@/components/ui/pixel-icon";
import {
  HappyCat,
  AlertCat,
  SadCat,
  TiredCat,
  HungryCat,
  DeadCat,
} from "@/components/pet/cat-emotions";
import {
  usePetInteractions,
  DEFAULT_COOLDOWNS,
} from "@/hooks/use-pet-interactions";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { formatPoints } from "@/utils/stats-helpers";
import { AIPetAdvisor } from "@/components/ui/ai-pet-advisor";
import { useWallet } from "@/context/WalletContext";
import { useUserData } from "@/context/UserDataContext";
import { useRouter } from "next/navigation";
import { PointsEarnedPanel } from "@/components/ui/points-earned-panel";
import CustomSlider from "@/components/game/CustomSlider";
import { dbService } from "@/lib/database-service"; // Re-add dbService import
import { pointsManager } from "@/lib/points-manager"; // Import pointsManager

// Add this interface for activities right after the imports
interface UserActivity {
  id: string;
  type: "feed" | "play" | "clean" | "heal" | string;
  name: string;
  points: number;
  timestamp: number;
}

// Define the type for PixelIcon icons based on the PixelIconProps in pixel-icon.tsx
type PixelIconType =
  | "food"
  | "clean"
  | "doctor"
  | "play"
  | "fish"
  | "cookie"
  | "catFood"
  | "kibble"
  | "laser"
  | "feather"
  | "ball"
  | "puzzle"
  | "brush"
  | "bath"
  | "nails"
  | "dental"
  | "checkup"
  | "vitamins"
  | "vaccine"
  | "surgery"
  | "medicine";

// Add this component near the top of the file, outside the KawaiiDevice component
interface StatusHeaderProps {
  animatedPoints: number;
  health: number;
  isDatabaseReady: boolean;
}

const StatusHeader = ({
  animatedPoints,
  health,
  isDatabaseReady,
}: StatusHeaderProps) => {
  return (
    <div className="flex justify-between w-full pt-2 pb-1 px-5">
      <div className="flex-1">
        <div className="flex items-center">
          <Image
            src="/assets/icons/coin.png"
            alt="Coins"
            width={25}
            height={25}
            className="mr-1"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="text-base text-[#4b6130] font-numbers">
            {formatPoints(animatedPoints)}
          </span>
        </div>
      </div>
      <div className="flex-1 ml-2">
        <div className="flex items-center">
          <Image
            src="/assets/icons/hart.png"
            alt="Health"
            width={21}
            height={21}
            className="mr-2"
            style={{ imageRendering: "pixelated" }}
          />
          <CustomSlider
            value={health}
            maxValue={100}
            backgroundColor="#EBFFB7"
            barColor="#a7ba75"
            className="flex-1 mb-1"
            borderWidth={2}
          />
        </div>
      </div>
      {!isDatabaseReady && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/50">
          <div className="text-white font-pixel text-lg">Syncing...</div>
        </div>
      )}
    </div>
  );
};

export function KawaiiDevice() {
  const router = useRouter();
  const { isConnected, publicKey, walletData /*, burnPoints */ } =
    useWallet();
  // Get unlockedItems and updateUnlockedItems from context
  const {
    userData,
    updatePoints: updateUserDataPoints,
    updateUnlockedItems,
  } = useUserData();
  const { unlockedItems = {} } = userData; // Use unlockedItems from context, default to {}

  // Add tilt configuration state
  const [tiltConfig] = useState({
    tiltEnable: true,
    tiltMaxAngleX: 5,
    tiltMaxAngleY: 5,
    tiltReverse: false,
    tiltAngleXManual: null as null | number,
    tiltAngleYManual: null as null | number,
  });

  // Use ref for tilt position tracking to avoid render loops
  const tiltPositionRef = useRef({
    tiltAngleX: 0,
    tiltAngleY: 0,
  });

  // Add refs for the glare elements to directly manipulate DOM
  const primaryGlareRef = useRef<HTMLDivElement>(null);
  const secondaryGlareRef = useRef<HTMLDivElement>(null);
  const deviceWrapperRef = useRef<HTMLDivElement>(null);
  const deviceContentRef = useRef<HTMLDivElement>(null);

  // Scale factor for the device
  const [deviceScale, setDeviceScale] = useState(1);

  // Device original dimensions
  const deviceWidth = 398;
  const deviceHeight = 514;

  // Use media queries for responsive behavior
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const isMediumScreen = useMediaQuery({ minWidth: 641, maxWidth: 1024 });
  const isLargeScreen = useMediaQuery({ minWidth: 1025 });

  // Handle device scaling on resize
  useEffect(() => {
    if (!deviceWrapperRef.current || !deviceContentRef.current) return;

    const deviceWrapper = deviceWrapperRef.current;

    // Create a resize observer to adjust scale when container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length) return;

      const entry = entries[0];
      const containerWidth = entry.contentRect.width;
      const containerHeight = entry.contentRect.height;

      // Available space for the device
      const availableWidth = containerWidth * 0.95; // Leave some margin
      const availableHeight = containerHeight * 0.95;

      // Calculate scale factors for width and height
      const widthScale = availableWidth / deviceWidth;
      const heightScale = availableHeight / deviceHeight;

      // Use the smaller scale to ensure device fits within container
      let newScale = Math.min(widthScale, heightScale);
      newScale = Math.min(newScale, 1.0);

      // Update scale state
      setDeviceScale(newScale);
    });

    // Start observing
    resizeObserver.observe(deviceWrapper);

    // Clean up observer on component unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, [isSmallScreen, isMediumScreen, isLargeScreen]);

  // Add premium item unlock tracking
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [unlockConfirmSelection, setUnlockConfirmSelection] = useState<
    "yes" | "no"
  >("no");
  const [itemToUnlock, setItemToUnlock] = useState<{
    type: string;
    name: string;
    cost: number;
    index: number;
  }>({
    type: "",
    name: "",
    cost: 0,
    index: -1,
  });

  // Premium item costs and configuration - Memoize this
  const premiumItems = useMemo(
    () => ({
      food: {
        items: ["catFood", "kibble"],
        costs: [500, 1000],
        benefits: [1.5, 2.0], // Multiplier for points earned
      },
      play: {
        items: ["ball", "puzzle"],
        costs: [500, 1000],
        benefits: [1.5, 2.0],
      },
      clean: {
        items: ["nails", "dental"],
        costs: [500, 1000],
        benefits: [1.5, 2.0],
      },
      doctor: {
        items: ["vaccine", "surgery"],
        costs: [500, 1000],
        benefits: [1.5, 2.0],
      },
    }),
    []
  ); // Empty dependency array means it's created only once

  // Check if an item is locked - moved to the top to prevent reference errors
  const isItemLocked = useCallback(
    (type: string, name: string): boolean => {
      // Check if this item type exists in premiumItems and if the item name is listed there
      const isPremium =
        premiumItems[type as keyof typeof premiumItems]?.items.includes(name);

      // If it's not a premium item, it's considered unlocked by default
      if (!isPremium) {
        return false;
      }

      // If it IS a premium item, check if it's in the unlockedItems map
      const itemKey = `${type}-${name}`;
      return !unlockedItems[itemKey]; // It's locked if it's NOT in the map
    },
    [unlockedItems, premiumItems] // Add premiumItems to the dependency array
  );

  // Add state to track the most recent task type
  const [mostRecentTask, setMostRecentTask] = useState<string | null>(null);

  // Add this new state for tracking user activities
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);

  // Load user activities from database on component mount
  useEffect(() => {
    async function loadUserActivities() {
      // Use userData.uid if available, otherwise skip
      const currentUid = userData?.uid;
      if (!currentUid) {
         console.log('KawaiiDevice: No UID found yet, cannot load activities.');
         setIsActivitiesLoading(false); // Stop loading state if no UID
         return; 
      }

      try {
        setIsActivitiesLoading(true);

        // Load activities using the UID from UserDataContext
        console.log(`KawaiiDevice: Loading activities for UID: ${currentUid}`);
        const activities = await dbService.getUserActivities(currentUid); // Pass UID here

        setUserActivities(activities);
      } catch (error) {
        console.error("Failed to load user activities:", error);
      } finally {
        setIsActivitiesLoading(false);
      }
    }

    loadUserActivities();
    // Depend on userData.uid to reload if it changes (e.g., on initial load)
  }, [userData?.uid]);

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Use our custom hooks
  const {
    food,
    happiness,
    cleanliness,
    energy,
    health,
    isDead,
    points,
    isFeeding,
    isPlaying,
    isCleaning,
    isHealing,
    setLastInteractionTime,
    handleFeeding,
    handlePlaying,
    handleCleaning,
    handleDoctor,
    resetPet,
    cooldowns,
    isOnCooldown,
    aiAdvice,
    aiPersonality,
    aiPointMultiplier,
  } = usePetInteractions();

  // Save pet data to the database (moved here after hooks are defined)
  // Wrap in useCallback to stabilize its reference
  const savePetStateToDatabase = useCallback(async () => {
    if (!publicKey) return;

    try {
      const petState = {
        walletAddress: publicKey,
        health,
        happiness,
        hunger: food,
        cleanliness,
        energy,
        isDead,
      };

      console.log("Attempting to save pet state to database:", petState);

      // Save to the new pet-state API endpoint
      const response = await fetch("/api/pet-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(petState),
      });

      // First get the response text for better debugging
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse as JSON if possible
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch{
        responseData = null;
      }

      if (!response.ok) {
        // Create a detailed error message
        let errorMessage = `HTTP error ${response.status}`;
        if (responseData && responseData.error) {
          errorMessage = `Database error: ${responseData.error}`;
          if (responseData.details) {
            errorMessage += ` - ${responseData.details}`;
          }
        } else if (responseText) {
          errorMessage = responseText;
        }

        console.error("Error saving pet state:", errorMessage);
        console.error("Response status:", response.status);
        console.error("Response headers:", Object.fromEntries(response.headers.entries()));
        
        return;
      }

      console.log("Pet state saved successfully to database:", responseData || responseText);
    } catch (error) {
      console.error("Failed to save pet state to database:", error);
      
      // Add more detailed error info
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
    }
  }, [publicKey, health, happiness, food, cleanliness, energy, isDead]);

  // Save pet state whenever relevant stats change
  useEffect(() => {
    if (publicKey && isConnected) {
      // Use a debounce to avoid too many updates
      const debounceTimer = setTimeout(() => {
        savePetStateToDatabase(); // Now using the memoized function
      }, 5000); // 5 second debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [
    food,
    happiness,
    cleanliness,
    energy,
    health,
    isDead,
    publicKey,
    isConnected,
    savePetStateToDatabase,
  ]); // Add savePetStateToDatabase

  // Function to save activity to database
  // Wrap in useCallback to stabilize its reference
  const saveActivityToDatabase = useCallback(
    async (activity: UserActivity) => {
      if (!publicKey) return;
      try {
        // Assuming dbService has a method like saveActivity
        await dbService.saveUserActivity(publicKey, activity);
      } catch (error) {
        console.error("Failed to save activity:", error);
      }
    },
    [publicKey]
  ); // dbService is likely a singleton/stable, so not needed here if imported

  const {
    selectedMenuItem,
    isMenuActive,
    menuStack,
    selectedFoodItem,
    selectedPlayItem,
    selectedCleanItem,
    selectedDoctorItem,
    handleButtonNavigation,
    resetMenu,
    setSelectedMenuItem,
    setSelectedFoodItem,
    setSelectedPlayItem,
    setSelectedCleanItem,
    setSelectedDoctorItem,
  } = useMenuNavigation();

  // Keep track of last updated points to prevent loops
  const lastUpdatedPointsRef = useRef(0);

  // Create a ref for debouncing updates
  const pointsUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const POINTS_UPDATE_DELAY = 5000; // 5 seconds between server updates

  // Add this near the other refs
  const lastInteractionUpdateRef = useRef<number>(0);
  const INTERACTION_UPDATE_THROTTLE = 3000; // 3 seconds between lastInteraction updates

  // Update UserData when local points change (with debouncing)
  useEffect(() => {
    if (!isConnected || !publicKey) return;

    // Don't update if points haven't changed
    if (points <= 0 || points === lastUpdatedPointsRef.current) return;

    // Clear any existing timer
    if (pointsUpdateTimerRef.current) {
      clearTimeout(pointsUpdateTimerRef.current);
    }

    // Set timer for next update
    pointsUpdateTimerRef.current = setTimeout(async () => {
      try {
        // Update points in centralized user data
        await updateUserDataPoints(points);
        console.log("💰 Points updated successfully");
        lastUpdatedPointsRef.current = points;
      } catch (error) {
        console.error("❌ Error updating points:", error);
      }
    }, POINTS_UPDATE_DELAY);

    // Cleanup
    return () => {
      if (pointsUpdateTimerRef.current) {
        clearTimeout(pointsUpdateTimerRef.current);
      }
    };
  }, [points, isConnected, publicKey, updateUserDataPoints]);

  const [showReviveConfirm, setShowReviveConfirm] = useState(false);

  const [animatedPoints, setAnimatedPoints] = useState(userData.points);

  // Add this ref to track the previous points value
  const prevPointsRef = useRef(userData.points);

  // Animation effect when global points change
  useEffect(() => {
    // Only animate if points increased
    if (userData.points > prevPointsRef.current) {
      const startValue = prevPointsRef.current;
      const endValue = userData.points;
      const duration = 1000; // 1 second duration
      const startTime = performance.now();

      // Update the reference immediately
      prevPointsRef.current = userData.points;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic function: progress = 1 - (1 - progress)^3
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.round(
          startValue + (endValue - startValue) * easeOut
        );
        setAnimatedPoints(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      // If points decreased or stayed same, update immediately
      setAnimatedPoints(userData.points);
      prevPointsRef.current = userData.points;
    }
  }, [userData.points]);

  // Add an effect to reset mostRecentTask when cooldowns finish
  useEffect(() => {
    // If there's a most recent task but its cooldown is finished, reset it
    if (mostRecentTask === "feed" && !isOnCooldown.feed) {
      setMostRecentTask(null);
    } else if (mostRecentTask === "clean" && !isOnCooldown.clean) {
      setMostRecentTask(null);
    } else if (mostRecentTask === "play" && !isOnCooldown.play) {
      setMostRecentTask(null);
    } else if (mostRecentTask === "heal" && !isOnCooldown.heal) {
      setMostRecentTask(null);
    }
  }, [
    isOnCooldown.feed,
    isOnCooldown.clean,
    isOnCooldown.play,
    isOnCooldown.heal,
    mostRecentTask,
  ]);

  const getCatEmotion = () => {
    // Consider the pet sick when health is below 20
    const isSick = health < 20 && !isDead;

    if (isDead) return <DeadCat />;
    if (isMenuActive)
      return (
        <AlertCat
          selectedMenuItem={selectedMenuItem}
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask={mostRecentTask}
        />
      );
    if (isFeeding)
      return (
        <HappyCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask={mostRecentTask}
        />
      );
    if (isPlaying)
      return (
        <HappyCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask="play"
        />
      );
    if (isCleaning)
      return (
        <HappyCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask={mostRecentTask}
        />
      );
    if (isHealing)
      return (
        <HappyCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask="heal"
        />
      );
    if (food < 30)
      return (
        <HungryCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask={mostRecentTask}
        />
      );
    if (happiness < 30)
      return (
        <SadCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask={mostRecentTask}
        />
      );
    if (energy < 30 || food < 50 || happiness < 50)
      return (
        <TiredCat
          hygieneTaskOnCooldown={isOnCooldown.clean}
          foodTaskOnCooldown={isOnCooldown.feed}
          playTaskOnCooldown={isOnCooldown.play}
          healTaskOnCooldown={isOnCooldown.heal}
          sickStatus={isSick}
          mostRecentTask={mostRecentTask}
        />
      );
    return (
      <HappyCat
        hygieneTaskOnCooldown={isOnCooldown.clean}
        foodTaskOnCooldown={isOnCooldown.feed}
        playTaskOnCooldown={isOnCooldown.play}
        healTaskOnCooldown={isOnCooldown.heal}
        sickStatus={isSick}
        mostRecentTask={mostRecentTask}
      />
    );
  };

  // Add this function to get the premium benefit multiplier
  const getPremiumMultiplier = useCallback(
    (type: string, itemName: string /*, index: number*/) => {
      // Check if it's a premium item and is unlocked
      const isPremium =
        premiumItems[type as keyof typeof premiumItems]?.items.includes(
          itemName
        );
      const itemKey = `${type}-${itemName}`;
      const isUnlocked = unlockedItems[itemKey];

      // If it's a premium item and unlocked, return the benefit multiplier
      if (isPremium && isUnlocked) {
        const itemIndex =
          premiumItems[type as keyof typeof premiumItems].items.indexOf(
            itemName
          );
        return premiumItems[type as keyof typeof premiumItems].benefits[
          itemIndex
        ];
      }

      // Default multiplier is 1 (no boost)
      return 1;
    },
    [premiumItems, unlockedItems]
  );

  // Moved this function definition above handleInteraction where it is used
  const simulateFeedingTilt = useCallback(() => {
    // Function made inactive to remove feeding animation
    // No-op function that doesn't do any animation
  }, []);

  // Modify the existing handleInteraction function to use premium multipliers
  const handleInteraction = useCallback(
    async (option: string /*, selectedItem: number*/) => {
      let pointsToAdd = 0;
      let basePoints = 0;
      let itemName = "";
      let itemType = "";
      let interactionSource: 'interaction' | 'gameplay' | 'daily' | 'achievement' | 'streak' | 'purchase' = 'interaction'; // Default

      if (option === "food" && selectedFoodItem !== null) {
        itemType = "food";
        interactionSource = 'interaction'; // Or specific if needed
        const foodItems = ["fish", "cookie", "catFood", "kibble"];
        itemName = foodItems[selectedFoodItem];
        basePoints = 10; // Define base points for calculation visibility
        const premiumMultiplier = getPremiumMultiplier(itemType, itemName);
        pointsToAdd = Math.floor(basePoints * aiPointMultiplier * premiumMultiplier);
        await handleFeeding();
        simulateFeedingTilt();
        setMostRecentTask("feed");

      } else if (option === "play" && selectedPlayItem !== null) {
        itemType = "play";
        interactionSource = 'interaction';
        const playItems = ["laser", "feather", "ball", "puzzle"];
        itemName = playItems[selectedPlayItem];
        basePoints = 15;
        const premiumMultiplier = getPremiumMultiplier(itemType, itemName);
        pointsToAdd = Math.floor(basePoints * aiPointMultiplier * premiumMultiplier);
        await handlePlaying();
        setMostRecentTask("play");

      } else if (option === "clean" && selectedCleanItem !== null) {
        itemType = "clean";
        interactionSource = 'interaction';
        const cleanItems = ["brush", "bath", "nails", "dental"];
        itemName = cleanItems[selectedCleanItem];
        basePoints = 12;
        const premiumMultiplier = getPremiumMultiplier(itemType, itemName);
        pointsToAdd = Math.floor(basePoints * aiPointMultiplier * premiumMultiplier);
        await handleCleaning();
        setMostRecentTask("clean");

      } else if (option === "doctor" && selectedDoctorItem !== null) {
        itemType = "doctor";
        interactionSource = 'interaction'; // Or 'heal' if distinct logic exists
        const doctorItems = ["checkup", "medicine", "vaccine", "surgery"];
        itemName = doctorItems[selectedDoctorItem];
        basePoints = 20;
        const premiumMultiplier = getPremiumMultiplier(itemType, itemName);
        pointsToAdd = Math.floor(basePoints * aiPointMultiplier * premiumMultiplier);
        await handleDoctor();
        setMostRecentTask("heal");
      }

      // --- Centralized Point Awarding via PointsManager ---
      if (pointsToAdd > 0 && publicKey) {
        try {
          console.log(`KawaiiDevice: Awarding ${pointsToAdd} points via PointsManager for ${itemType} - ${itemName}`);
          // Use pointsManager to award points. Pass base amount before multipliers.
          // PointsManager will apply its own multipliers (streak, etc.) if configured.
          // Let's assume pointsToAdd *already includes* AI and Premium multipliers from KawaiiDevice scope
          // So, we tell PointsManager to award this specific calculated amount.
          // We might need a specific 'earn' operation if PointsManager applies multipliers itself.
          // For now, let's assume we pass the final calculated amount.
          // A potentially better approach: Pass basePoints and let PointsManager calculate everything.
          // Sticking to current logic: pass final amount.
          const result = await pointsManager.awardPoints(
              publicKey,
              pointsToAdd, // Pass the final calculated points
              interactionSource, // The source category
              'earn', // Operation type
              { interactionType: itemType, itemName: itemName } // Metadata
          );

          if (result.success) {
            console.log(`KawaiiDevice: PointsManager successful. New total maybe: ${result.total}`);
            // TODO: UI state should update based on events from PointsManager, not direct calls here.
            // For now, let's keep the UserDataContext update temporarily for UI feedback
             updateUserDataPoints(result.total);
          } else {
            console.warn(`KawaiiDevice: PointsManager failed to award points for ${itemType} - ${itemName}.`);
            // Handle failure? Show message?
          }

           // --- Activity Saving (can stay here or move to PointsManager if desired) ---
           const activityId = uuidv4();
           const activity: UserActivity = {
             id: activityId,
             type: itemType || option, // Use itemType if available
             name: `${itemType ? (itemType.charAt(0).toUpperCase() + itemType.slice(1)) : 'Unknown'}: ${itemName}`,
             points: result.success ? result.points : 0, // Log points actually awarded by manager
             timestamp: Date.now(),
           };
           saveActivityToDatabase(activity);
           setUserActivities((prev) => [activity, ...prev].slice(0, 10));
           // --- End Activity Saving ---

        } catch (error) {
           console.error(`KawaiiDevice: Error calling PointsManager for ${itemType} - ${itemName}:`, error);
           // Handle error state in UI?
        }


        // REMOVE direct context updates:
        // updatePoints(pointsToAdd);
        // updateUserDataPoints(userData.points + pointsToAdd);
        // updateUserPoints(publicKey, userData.points + pointsToAdd); // Already removed
      }

      // Always reset the menu to go back to main screen after completing a task
      resetMenu();
    },
    [
      selectedFoodItem,
      selectedPlayItem,
      selectedCleanItem,
      selectedDoctorItem,
      handleFeeding,
      handlePlaying,
      handleCleaning,
      handleDoctor,
      resetMenu,
      // updatePoints, // Removed dependency
      publicKey,
      // userData.points, // Total points dependency might change based on how UI updates
      updateUserDataPoints, // Temporary dependency for UI feedback
      aiPointMultiplier,
      saveActivityToDatabase,
      setUserActivities,
      getPremiumMultiplier,
      simulateFeedingTilt,
    ]
  );

  // Set up point animation tracking
  // const [pointAnimations, setPointAnimations] = useState<PointAnimation[]>([]); // Unused

  // Handle revive confirmation
  // Wrap in useCallback
  const handleReviveRequest = useCallback(() => {
    setShowReviveConfirm(true);
  }, []); // No dependencies needed

  // Wrap in useCallback
  const handleReviveConfirm = useCallback(async () => {
    // Burn 50% of points using PointsManager
    const pointsToDeduct = Math.floor((userData.points || 0) / 2);

    if (publicKey && pointsToDeduct > 0) {
       try {
          console.log(`KawaiiDevice: Spending ${pointsToDeduct} points via PointsManager for revive`);
          const result = await pointsManager.deductPoints(
             publicKey,
             pointsToDeduct,
             'penalty', // Or a more specific source like 'revive'
             { reason: 'Pet revival' }
          );

          if (result.success) {
             console.log(`KawaiiDevice: PointsManager successful deduction for revive. New total maybe: ${result.total}`);
             // TODO: Update UI via events
             // Temporary update:
             updateUserDataPoints(result.total);

             // Reset pet stats only after successful deduction
             resetPet();

             // Record activity?
              const activityId = uuidv4();
              const activity = {
                id: activityId,
                type: "revive",
                name: `Revived Pet`,
                points: -pointsToDeduct, 
                timestamp: Date.now(),
              };
              saveActivityToDatabase(activity);
              setUserActivities((prev) => [activity, ...prev].slice(0, 10));

          } else {
             console.warn(`KawaiiDevice: PointsManager failed to deduct points for revive.`);
             // Maybe show an error message? Don't resetPet if deduction failed.
             setShowReviveConfirm(false); // Close confirm if failed
             return; // Stop execution if deduction failed
          }
       } catch (error) {
          console.error(`KawaiiDevice: Error calling PointsManager for revive deduction:`, error);
          setShowReviveConfirm(false); // Close confirm on error
          return; // Stop execution on error
       }
    } else {
      // If no points to deduct or no publicKey, just reset pet?
      // Or show error? For now, proceed with reset but log it.
      console.warn("KawaiiDevice: Cannot deduct points for revive (0 points or no public key). Resetting pet stats.");
      resetPet();
    }

    // await burnPoints(); // Removed direct call
    // resetPet(); // Moved inside successful deduction block
    
    // Hide confirmation dialog
    setShowReviveConfirm(false);

    // Leaderboard update was already removed/commented out here
  }, [
       // burnPoints, // Removed dependency
       resetPet, 
       publicKey, 
       // points, // Use userData.points instead for calculation
       userData.points, // Added dependency
       updateUserDataPoints, // Temporary dependency
       saveActivityToDatabase, // Added dependency
       setUserActivities // Added dependency
    ]); 

  // Wrap in useCallback
  const handleReviveCancel = useCallback(() => {
    setShowReviveConfirm(false);
  }, []); // No dependencies needed

  // Button navigation handler with proper integrations
  const handleButtonClick = useCallback(
    async (
      option:
        | "food"
        | "clean"
        | "doctor"
        | "play"
        | "previous"
        | "next"
        | "a"
        | "b"
    ) => {
      // Only update last interaction time when at least 3 seconds have passed since the last update
      const now = Date.now();
      if (
        now - lastInteractionUpdateRef.current >
        INTERACTION_UPDATE_THROTTLE
      ) {
        setLastInteractionTime(now);
        lastInteractionUpdateRef.current = now;
      }

      if (isDead) {
        if (option === "a") {
          // If the pet is dead and A is pressed, trigger the revive request
          if (!showReviveConfirm) {
            handleReviveRequest();
          } else {
            // If confirmation is already showing, confirm the revival
            handleReviveConfirm();
          }
          return;
        }

        if (option === "b" && showReviveConfirm) {
          // If confirmation is showing and B is pressed, cancel
          handleReviveCancel();
          return;
        }

        return;
      }

      // Handle unlock prompt navigation first
      if (showUnlockPrompt) {
        if (option === "previous" || option === "next") {
          // Toggle between yes/no options
          setUnlockConfirmSelection((prev) => (prev === "yes" ? "no" : "yes"));
          return;
        }

        if (option === "a") {
          // Confirm selection
          if (unlockConfirmSelection === "yes") {
            // Process the unlock
            const { type, name, cost /*, index*/ } = itemToUnlock;
            if (userData.points >= cost) {
              // Deduct points using PointsManager
              if (publicKey) {
                try {
                  console.log(`KawaiiDevice: Spending ${cost} points via PointsManager for unlocking ${name}`);
                  const result = await pointsManager.deductPoints(
                    publicKey,
                    cost,
                    'purchase', // Point source for unlocks
                    { itemType: type, itemName: name }
                  );
                  
                  if (result.success) {
                     console.log(`KawaiiDevice: PointsManager successful deduction. New total maybe: ${result.total}`);
                     // TODO: UI state should update based on events from PointsManager
                     // Temporary update for UI feedback:
                     updateUserDataPoints(result.total);

                     // Unlock the item - use consistent hyphenated format
                     const itemKey = `${type}-${name}`;
                     const newUnlockedItems = { ...unlockedItems, [itemKey]: true };
                     await updateUnlockedItems(newUnlockedItems);

                     // Record activity (Can stay here or move to pointsManager if desired)
                     const activityId = uuidv4();
                     const activity = {
                       id: activityId,
                       type: "unlock",
                       name: `Unlocked ${name}`,
                       points: -cost, // Record the cost
                       timestamp: Date.now(),
                     };
                     saveActivityToDatabase(activity);
                     setUserActivities((prev) => [activity, ...prev].slice(0, 10));
                  } else {
                     console.warn(`KawaiiDevice: PointsManager failed to deduct points for unlocking ${name}.`);
                     // Handle failure? Show insufficient points message?
                  }
                } catch (error) {
                  console.error(`KawaiiDevice: Error calling PointsManager for unlock deduction:`, error);
                }
              }
              // Remove direct context updates:
              // updateUserDataPoints(userData.points - cost);
              // if (publicKey) { updatePoints(-cost); }

            } else {
               // Handle insufficient points case (optional: show message)
               console.log("KawaiiDevice: Insufficient points to unlock item.");
            }
          }

          // Close prompt regardless of yes/no
          setShowUnlockPrompt(false);
          return;
        }

        if (option === "b") {
          // Cancel unlock
          setShowUnlockPrompt(false);
          return;
        }

        return; // Don't process other inputs when prompt is open
      }

      if (option === "previous" || option === "next" || option === "b") {
        // Create a cooldown state object to pass to handleButtonNavigation
        /* const cooldownState = { // Unused
          feed: isOnCooldown.feed,
          play: isOnCooldown.play,
          clean: isOnCooldown.clean,
          heal: isOnCooldown.heal
        }; */

        // Call handleButtonNavigation with just the option parameter
        handleButtonNavigation(option);
        return;
      }

      if (option === "a") {
        if (menuStack[menuStack.length - 1] === "main") {
          handleButtonNavigation("a");
        } else if (menuStack[menuStack.length - 1] === "food") {
          // Handle food selection
          if (selectedFoodItem !== null) {
            const foodItems = ["fish", "cookie", "catFood", "kibble"];
            const selectedFood = foodItems[selectedFoodItem];

            if (isItemLocked("food", selectedFood)) {
              // Show unlock prompt
              setItemToUnlock({
                type: "food",
                name: selectedFood,
                cost: premiumItems.food.costs[selectedFoodItem - 2], // -2 because first two items are free
                index: selectedFoodItem,
              });
              setUnlockConfirmSelection("no");
              setShowUnlockPrompt(true);
            } else {
              await handleInteraction("food");
            }
          }
        } else if (menuStack[menuStack.length - 1] === "play") {
          // Handle play selection
          if (selectedPlayItem !== null) {
            const playItems = ["laser", "feather", "ball", "puzzle"];
            const selectedPlay = playItems[selectedPlayItem];

            if (isItemLocked("play", selectedPlay)) {
              // Show unlock prompt
              setItemToUnlock({
                type: "play",
                name: selectedPlay,
                cost: premiumItems.play.costs[selectedPlayItem - 2],
                index: selectedPlayItem,
              });
              setUnlockConfirmSelection("no");
              setShowUnlockPrompt(true);
            } else {
              await handleInteraction("play");
            }
          }
        } else if (menuStack[menuStack.length - 1] === "clean") {
          // Handle clean selection
          if (selectedCleanItem !== null) {
            const cleanItems = ["brush", "bath", "nails", "dental"];
            const selectedClean = cleanItems[selectedCleanItem];

            if (isItemLocked("clean", selectedClean)) {
              // Show unlock prompt
              setItemToUnlock({
                type: "clean",
                name: selectedClean,
                cost: premiumItems.clean.costs[selectedCleanItem - 2],
                index: selectedCleanItem,
              });
              setUnlockConfirmSelection("no");
              setShowUnlockPrompt(true);
            } else {
              await handleInteraction("clean");
            }
          }
        } else if (menuStack[menuStack.length - 1] === "doctor") {
          // Handle doctor selection
          if (selectedDoctorItem !== null) {
            const doctorItems = ["checkup", "medicine", "vaccine", "surgery"];
            const selectedDoctor = doctorItems[selectedDoctorItem];

            if (isItemLocked("doctor", selectedDoctor)) {
              // Show unlock prompt
              setItemToUnlock({
                type: "doctor",
                name: selectedDoctor,
                cost: premiumItems.doctor.costs[selectedDoctorItem - 2],
                index: selectedDoctorItem,
              });
              setUnlockConfirmSelection("no");
              setShowUnlockPrompt(true);
            } else {
              await handleInteraction("doctor");
            }
          }
        }
      }
    },
    [
      isDead,
      menuStack,
      selectedFoodItem,
      selectedPlayItem,
      selectedCleanItem,
      selectedDoctorItem,
      handleButtonNavigation,
      handleInteraction,
      setLastInteractionTime,
      lastInteractionUpdateRef,
      showUnlockPrompt,
      unlockConfirmSelection,
      itemToUnlock,
      userData.points,
      updateUserDataPoints,
      publicKey,
      saveActivityToDatabase,
      isItemLocked,
      handleReviveRequest,
      handleReviveConfirm,
      handleReviveCancel,
      showReviveConfirm,
      premiumItems, 
      unlockedItems, 
      updateUnlockedItems, 
    ]
  );

  const renderMenuContent = () => {
    if (isDead) {
      return (
        <>
          <StatusHeader
            animatedPoints={animatedPoints}
            health={health}
            isDatabaseReady={true}
          />
          <div className="flex-grow flex flex-col items-center justify-center">
            <div>{getCatEmotion()}</div>
            <p className="text-red-500 font-bold absolute top-[50px] left-0 right-0 text-center">
              Your pet is dead
            </p>

            {showReviveConfirm ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
                <div className="bg-[#eff8cb] border-2 border-[#606845] p-4 text-center w-[80%] rounded-md" style={{boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"}}>
                  <p className="text-sm font-bold text-[#4b6130] mb-3">
                    Revive Your Pet?
                  </p>
                  <p className="text-xs mb-3">
                    This will cost <span className="font-bold text-red-500">50%</span> of your tokens.
                  </p>
                  <p className="text-xs mb-2">
                    Current points:{" "}
                    <span className="font-numbers">
                      {formatPoints(userData.points)}
                    </span>
                  </p>
                  <p className="text-xs mb-3">
                    You will keep:{" "}
                    <span className="font-numbers">
                      {formatPoints(Math.floor(userData.points / 2))}
                    </span>
                  </p>
                  <div className="flex space-x-4 justify-center mt-4">
                    <button
                      onClick={handleReviveConfirm}
                      className="bg-green-500 text-white py-1 px-4 text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={handleReviveCancel}
                      className="bg-red-500 text-white py-1 px-4 text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleReviveRequest}
                // Apply styles similar to PointsEarnedPanel buttons
                className="bg-[#304700] text-[#EBFFB7] py-1.5 px-6 text-sm mt-4 rounded-md font-pixelify hover:bg-[#709926] transition-colors"
              >
                Revive
              </button>
            )}
          </div>
        </>
      );
    }

    // Main menu - show only points and health
    if (menuStack[menuStack.length - 1] === "main") {
      return (
        <>
          <StatusHeader
            animatedPoints={animatedPoints}
            health={health}
            isDatabaseReady={true}
          />
          <div className="flex-grow flex items-center justify-center relative mb-[12px]">
            <div className="relative w-full ">{getCatEmotion()}</div>
          </div>
          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["food", "clean", "doctor", "play"].map((icon, index) => (
              <div key={index} className="transform ">
                <PixelIcon
                  icon={icon as "food" | "clean" | "doctor" | "play"}
                  isHighlighted={selectedMenuItem === index}
                  label={icon.charAt(0).toUpperCase() + icon.slice(1)}
                  cooldown={
                    cooldowns[
                      icon === "doctor"
                        ? "heal"
                        : icon === "food"
                        ? "feed"
                        : (icon as keyof typeof cooldowns)
                    ]
                  }
                  maxCooldown={
                    DEFAULT_COOLDOWNS[
                      icon === "doctor"
                        ? "heal"
                        : icon === "food"
                        ? "feed"
                        : (icon as keyof typeof DEFAULT_COOLDOWNS)
                    ]
                  }
                  isDisabled={
                    isOnCooldown[
                      icon === "doctor"
                        ? "heal"
                        : icon === "food"
                        ? "feed"
                        : (icon as keyof typeof isOnCooldown)
                    ] || isDead
                  }
                  onClick={() => {
                    setSelectedMenuItem(index);
                    handleButtonClick("a");
                  }}
                />
              </div>
            ))}
          </div>
        </>
      );
    }

    // Food page
    if (menuStack[menuStack.length - 1] === "food") {
      return (
        <>
          <StatusHeader
            animatedPoints={animatedPoints}
            health={health}
            isDatabaseReady={true}
          />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">
            Select food to feed your pet:
          </div>
          <div className="flex-grow flex items-center justify-center  mb-[12px]">
            {getCatEmotion()}
          </div>

          {/* Unlock prompt overlay */}
          {showUnlockPrompt && itemToUnlock.type === "food" && (
            <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
              <div className="bg-[#eff8cb] p-3 max-w-[80%] text-center">
                <h4 className="text-sm font-bold text-[#4b6130] mb-2">
                  Unlock Premium Item
                </h4>
                <p className="text-xs mb-2">
                  Unlock <span className="font-bold">{itemToUnlock.name}</span>{" "}
                  for <span className="font-bold">{itemToUnlock.cost}</span>{" "}
                  points?
                </p>
                <p className="text-xs mb-3">
                  This will give you{" "}
                  {premiumItems.food.benefits[itemToUnlock.index - 2]}x more
                  points!
                </p>

                <div className="flex justify-between items-center px-4 mb-1 mt-3">
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "yes"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    Yes
                  </div>
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "no"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    No
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Use ← → to select, A to confirm, B to cancel
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["fish", "cookie", "catFood", "kibble"].map((foodItem, index) => {
              const isLocked = isItemLocked("food", foodItem);

              return (
                <div key={index} className="transform  relative">
                  <PixelIcon
                    icon={foodItem as PixelIconType}
                    isHighlighted={selectedFoodItem === index}
                    label={
                      foodItem === "catFood"
                        ? "Cat Food"
                        : foodItem.charAt(0).toUpperCase() + foodItem.slice(1)
                    }
                    cooldown={cooldowns.feed}
                    maxCooldown={DEFAULT_COOLDOWNS.feed}
                    isDisabled={isOnCooldown.feed || isDead || isLocked}
                    onClick={() => {
                      if (isLocked) {
                        // Show unlock prompt
                        setItemToUnlock({
                          type: "food",
                          name: foodItem,
                          cost: premiumItems.food.costs[index - 2], // -2 because first two items are free
                          index: index,
                        });
                        setShowUnlockPrompt(true);
                      } else {
                        setSelectedFoodItem(index);
                        handleButtonClick("a");
                      }
                    }}
                  />

                  {/* Lock overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className={`absolute inset-0 ${
                          selectedFoodItem === index
                            ? "bg-black/50"
                            : "bg-black/40"
                        }`}
                      ></div>
                      <div className="z-10 flex-row items-center px-2 py-0.5 rounded">
                        <span className="font-numbers text-white text-[18px]">
                          {premiumItems.food.costs[index - 2]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // Play page
    if (menuStack[menuStack.length - 1] === "play") {
      return (
        <>
          <StatusHeader
            animatedPoints={animatedPoints}
            health={health}
            isDatabaseReady={true}
          />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">
            Choose a game to play:
          </div>
          <div className="flex-grow flex items-center justify-center  mb-[12px]">
            {getCatEmotion()}
          </div>

          {/* Unlock prompt overlay for play */}
          {showUnlockPrompt && itemToUnlock.type === "play" && (
            <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
              <div className="bg-[#eff8cb] p-3 max-w-[80%] text-center">
                <h4 className="text-sm font-bold text-[#4b6130] mb-2">
                  Unlock Premium Item
                </h4>
                <p className="text-xs mb-2">
                  Unlock <span className="font-bold">{itemToUnlock.name}</span>{" "}
                  for <span className="font-bold">{itemToUnlock.cost}</span>{" "}
                  points?
                </p>
                <p className="text-xs mb-3">
                  This will give you{" "}
                  {premiumItems.play.benefits[itemToUnlock.index - 2]}x more
                  points!
                </p>

                <div className="flex justify-between items-center px-4 mb-1 mt-3">
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "yes"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    Yes
                  </div>
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "no"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    No
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Use ← → to select, A to confirm, B to cancel
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["laser", "feather", "ball", "puzzle"].map((playItem, index) => {
              const isLocked = isItemLocked("play", playItem);

              return (
                <div key={index} className="transform  relative">
                  <PixelIcon
                    icon={playItem as PixelIconType}
                    isHighlighted={selectedPlayItem === index}
                    label={playItem.charAt(0).toUpperCase() + playItem.slice(1)}
                    cooldown={cooldowns.play}
                    maxCooldown={DEFAULT_COOLDOWNS.play}
                    isDisabled={isOnCooldown.play || isDead || isLocked}
                    onClick={() => {
                      if (isLocked) {
                        // Show unlock prompt
                        setItemToUnlock({
                          type: "play",
                          name: playItem,
                          cost: premiumItems.play.costs[index - 2], // -2 because first two items are free
                          index: index,
                        });
                        setShowUnlockPrompt(true);
                      } else {
                        setSelectedPlayItem(index);
                        handleButtonClick("a");
                      }
                    }}
                  />

                  {/* Lock overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className={`absolute inset-0 ${
                          selectedPlayItem === index
                            ? "bg-black/50"
                            : "bg-black/40"
                        }`}
                      ></div>
                      <div className="z-10 flex-row items-center px-2 py-0.5 rounded">
                        <span className="font-numbers text-white text-[18px]">
                          {premiumItems.play.costs[index - 2]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // Clean page
    if (menuStack[menuStack.length - 1] === "clean") {
      return (
        <>
          <StatusHeader
            animatedPoints={animatedPoints}
            health={health}
            isDatabaseReady={true}
          />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">
            Choose grooming method:
          </div>
          <div className="flex-grow flex items-center justify-center  mb-[12px]">
            {getCatEmotion()}
          </div>

          {/* Unlock prompt overlay for clean */}
          {showUnlockPrompt && itemToUnlock.type === "clean" && (
            <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
              <div className="bg-[#eff8cb] p-3 max-w-[80%] text-center">
                <h4 className="text-sm font-bold text-[#4b6130] mb-2">
                  Unlock Premium Item
                </h4>
                <p className="text-xs mb-2">
                  Unlock <span className="font-bold">{itemToUnlock.name}</span>{" "}
                  for <span className="font-bold">{itemToUnlock.cost}</span>{" "}
                  points?
                </p>
                <p className="text-xs mb-3">
                  This will give you{" "}
                  {premiumItems.clean.benefits[itemToUnlock.index - 2]}x more
                  points!
                </p>

                <div className="flex justify-between items-center px-4 mb-1 mt-3">
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "yes"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    Yes
                  </div>
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "no"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    No
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Use ← → to select, A to confirm, B to cancel
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["brush", "bath", "nails", "dental"].map((cleanItem, index) => {
              const isLocked = isItemLocked("clean", cleanItem);

              return (
                <div key={index} className="transform  relative">
                  <PixelIcon
                    icon={cleanItem as PixelIconType}
                    isHighlighted={selectedCleanItem === index}
                    label={
                      cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1)
                    }
                    cooldown={cooldowns.clean}
                    maxCooldown={DEFAULT_COOLDOWNS.clean}
                    isDisabled={isOnCooldown.clean || isDead || isLocked}
                    onClick={() => {
                      if (isLocked) {
                        // Show unlock prompt
                        setItemToUnlock({
                          type: "clean",
                          name: cleanItem,
                          cost: premiumItems.clean.costs[index - 2], // -2 because first two items are free
                          index: index,
                        });
                        setShowUnlockPrompt(true);
                      } else {
                        setSelectedCleanItem(index);
                        handleButtonClick("a");
                      }
                    }}
                  />

                  {/* Lock overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className={`absolute inset-0 ${
                          selectedCleanItem === index
                            ? "bg-black/50"
                            : "bg-black/40"
                        }`}
                      ></div>
                      <div className="z-10 flex-row items-center px-2 py-0.5 rounded">
                        <span className="font-numbers text-white text-[18px]">
                          {premiumItems.clean.costs[index - 2]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // Doctor page
    if (menuStack[menuStack.length - 1] === "doctor") {
      return (
        <>
          <StatusHeader
            animatedPoints={animatedPoints}
            health={health}
            isDatabaseReady={true}
          />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">
            Select treatment option:
          </div>
          <div className="flex-grow flex items-center justify-center  mb-[12px]">
            {getCatEmotion()}
          </div>

          {/* Unlock prompt overlay for doctor */}
          {showUnlockPrompt && itemToUnlock.type === "doctor" && (
            <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
              <div className="bg-[#eff8cb] p-3 max-w-[80%] text-center">
                <h4 className="text-sm font-bold text-[#4b6130] mb-2">
                  Unlock Premium Item
                </h4>
                <p className="text-xs mb-2">
                  Unlock <span className="font-bold">{itemToUnlock.name}</span>{" "}
                  for <span className="font-bold">{itemToUnlock.cost}</span>{" "}
                  points?
                </p>
                <p className="text-xs mb-3">
                  This will give you{" "}
                  {premiumItems.doctor.benefits[itemToUnlock.index - 2]}x more
                  points!
                </p>

                <div className="flex justify-between items-center px-4 mb-1 mt-3">
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "yes"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    Yes
                  </div>
                  <div
                    className={`px-3 py-1 ${
                      unlockConfirmSelection === "no"
                        ? "bg-red-500 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    No
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Use ← → to select, A to confirm, B to cancel
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["checkup", "medicine", "vaccine", "surgery"].map(
              (doctorItem, index) => {
                const isLocked = isItemLocked("doctor", doctorItem);

                return (
                  <div key={index} className="transform  relative">
                    <PixelIcon
                      icon={doctorItem as PixelIconType}
                      isHighlighted={selectedDoctorItem === index}
                      label={
                        doctorItem.charAt(0).toUpperCase() + doctorItem.slice(1)
                      }
                      cooldown={cooldowns.heal}
                      maxCooldown={DEFAULT_COOLDOWNS.heal}
                      isDisabled={isOnCooldown.heal || isDead || isLocked}
                      onClick={() => {
                        if (isLocked) {
                          // Show unlock prompt
                          setItemToUnlock({
                            type: "doctor",
                            name: doctorItem,
                            cost: premiumItems.doctor.costs[index - 2], // -2 because first two items are free
                            index: index,
                          });
                          setShowUnlockPrompt(true);
                        } else {
                          setSelectedDoctorItem(index);
                          handleButtonClick("a");
                        }
                      }}
                    />

                    {/* Lock overlay for doctor items */}
                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div
                          className={`absolute inset-0 ${
                            selectedDoctorItem === index
                              ? "bg-black/50"
                              : "bg-black/40"
                          }`}
                        ></div>
                        <div className="z-10 flex-row items-center px-2 py-0.5 rounded">
                          <span className="font-numbers text-white text-[18px]">
                            {premiumItems.doctor.costs[index - 2]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </>
      );
    }
  };

  return (
    <div className="flex w-full min-h-screen sm:p-4 items-center justify-center p-4 sm:pt-0">
      {/* Responsive layout container */}
      <div className="flex flex-col lg:flex-row w-full max-w-[1400px] mx-auto gap-6 sm:gap-6 items-stretch justify-center">
        {/* Left column - AI Pet Advisor */}
        <div className="w-full lg:w-1/4 order-2 lg:order-1 min-h-[200px] min-w-[280px] px-0">
          <AIPetAdvisor
            isDead={isDead}
            food={food}
            happiness={happiness}
            cleanliness={cleanliness}
            energy={energy}
            health={health}
            aiAdvice={aiAdvice}
            aiPersonality={aiPersonality}
            className="h-full"
          />
        </div>

        {/* Center column - Game device */}
        <div className="w-full lg:w-2/4 flex flex-col items-center justify-start order-1 lg:order-2 mx-auto">
          <div
            ref={deviceWrapperRef}
            className="flex justify-center items-center w-full h-full md:min-h-[300px] min-h-[calc(100vh-64px)] max-h-[100vh] relative"
          >
            <div
              ref={deviceContentRef}
              className="transition-transform duration-300 ease-out flex justify-center items-center"
              style={{
                transform: `scale(${deviceScale})`,
                transformOrigin: "center center",
                willChange: "transform",
              }}
            >
              <Tilt
                className="parallax-effect"
                perspective={500}
                glareEnable={false}
                scale={1.02}
                gyroscope={true}
                tiltMaxAngleX={tiltConfig.tiltMaxAngleX}
                tiltMaxAngleY={tiltConfig.tiltMaxAngleY}
                tiltEnable={tiltConfig.tiltEnable}
                tiltReverse={tiltConfig.tiltReverse}
                tiltAngleXManual={tiltConfig.tiltAngleXManual}
                tiltAngleYManual={tiltConfig.tiltAngleYManual}
                transitionSpeed={1000}
                transitionEasing="cubic-bezier(0.16, 1, 0.3, 1)"
                trackOnWindow={false}
                glareMaxOpacity={0}
                tiltAngleXInitial={0}
                tiltAngleYInitial={0}
                onLeave={() => {
                  // Instead of immediately setting to 0, animate the transition
                  if (primaryGlareRef.current && secondaryGlareRef.current) {
                    // Set longer, smoother transitions
                    primaryGlareRef.current.style.transition =
                      "all 2s cubic-bezier(0.16, 1, 0.3, 1)";
                    secondaryGlareRef.current.style.transition =
                      "all 2s cubic-bezier(0.16, 1, 0.3, 1)";

                    // Reduce opacity
                    primaryGlareRef.current.style.opacity = "0.2";
                    secondaryGlareRef.current.style.opacity = "0.1";

                    // Create a smooth animation to reset position
                    const startX = tiltPositionRef.current.tiltAngleX;
                    const startY = tiltPositionRef.current.tiltAngleY;
                    const startTime = performance.now();
                    const duration = 3000; // 3 seconds for a slower, smoother transition

                    const animateReset = (timestamp: number) => {
                      const elapsed = timestamp - startTime;
                      const progress = Math.min(elapsed / duration, 1);
                      // Use easeOutCubic for smooth deceleration
                      const easing = 1 - Math.pow(1 - progress, 3);

                      // Calculate current position
                      const currentX = startX * (1 - easing);
                      const currentY = startY * (1 - easing);

                      // Update the ref
                      tiltPositionRef.current = {
                        tiltAngleX: currentX,
                        tiltAngleY: currentY,
                      };

                      // Update the glare positions
                      if (
                        primaryGlareRef.current &&
                        secondaryGlareRef.current
                      ) {
                        const primaryX = 50 - currentY * 3;
                        const primaryY = 40 + currentX * 4;
                        primaryGlareRef.current.style.backgroundImage = `radial-gradient(circle at ${primaryX}% ${primaryY}%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 30%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 70%)`;

                        const secondaryX = 70 + currentY * 2;
                        const secondaryY = 60 - currentX * 3;
                        secondaryGlareRef.current.style.backgroundImage = `radial-gradient(circle at ${secondaryX}% ${secondaryY}%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0) 40%)`;
                      }

                      // Continue animation if not complete
                      if (progress < 1) {
                        requestAnimationFrame(animateReset);
                      } else {
                        // Reset completely at the end
                        tiltPositionRef.current = {
                          tiltAngleX: 0,
                          tiltAngleY: 0,
                        };
                      }
                    };

                    // Start the animation
                    requestAnimationFrame(animateReset);
                  }
                }}
                onEnter={() => {
                  if (primaryGlareRef.current) {
                    primaryGlareRef.current.style.transition =
                      "background-image 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in";
                    primaryGlareRef.current.style.opacity =
                      tiltConfig.tiltEnable ? "0.7" : "0.4";
                  }
                  if (secondaryGlareRef.current) {
                    secondaryGlareRef.current.style.transition =
                      "background-image 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-in";
                    secondaryGlareRef.current.style.opacity =
                      tiltConfig.tiltEnable ? "0.5" : "0.2";
                  }
                }}
                onMove={(tiltData) => {
                  // Only update if values changed significantly to improve performance
                  const xDiff = Math.abs(
                    tiltPositionRef.current.tiltAngleX - tiltData.tiltAngleX
                  );
                  const yDiff = Math.abs(
                    tiltPositionRef.current.tiltAngleY - tiltData.tiltAngleY
                  );

                  if (xDiff > 0.3 || yDiff > 0.3) {
                    // Update ref
                    tiltPositionRef.current = {
                      tiltAngleX: tiltData.tiltAngleX,
                      tiltAngleY: tiltData.tiltAngleY,
                    };

                    // Directly update DOM elements for better performance
                    if (primaryGlareRef.current) {
                      const x = 50 - tiltPositionRef.current.tiltAngleY * 3;
                      const y = 40 + tiltPositionRef.current.tiltAngleX * 4;
                      primaryGlareRef.current.style.backgroundImage = `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 30%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 70%)`;
                    }

                    if (secondaryGlareRef.current) {
                      const x = 70 + tiltPositionRef.current.tiltAngleY * 2;
                      const y = 60 - tiltPositionRef.current.tiltAngleX * 3;
                      secondaryGlareRef.current.style.backgroundImage = `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0) 40%)`;
                    }
                  }
                }}
              >
                <div className="relative w-full max-w-[398px]">
                  {/* Gamepad image - base layer */}
                  <div className="relative w-[398px] h-[514px]">
                    <Image
                      src="/assets/devices/gamepad.png"
                      alt="Game Device"
                      fill
                      className="object-contain"
                      priority
                    />

                    {/* Custom glare effect - positioned exactly like the gamepad image */}
                    <div
                      ref={primaryGlareRef}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          radial-gradient(
                            circle at ${
                              50 - tiltPositionRef.current.tiltAngleY * 3
                            }% ${40 + tiltPositionRef.current.tiltAngleX * 4}%, 
                            rgba(255, 255, 255, 0.6) 0%, 
                            rgba(255, 255, 255, 0.3) 30%,
                            rgba(255, 255, 255, 0.1) 50%,
                            rgba(255, 255, 255, 0) 70%
                          )
                        `,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        maskImage: "url(/assets/devices/gamepad.png)",
                        WebkitMaskImage: "url(/assets/devices/gamepad.png)",
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        opacity: tiltConfig.tiltEnable ? 0.7 : 0.4,
                        mixBlendMode: "screen",
                        willChange: "background-image, opacity",
                        transform: "translateZ(0)",
                        transition:
                          "background-image 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 2s ease-out",
                      }}
                    />

                    {/* Secondary reflection for depth */}
                    <div
                      ref={secondaryGlareRef}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          radial-gradient(
                            circle at ${
                              70 + tiltPositionRef.current.tiltAngleY * 2
                            }% ${60 - tiltPositionRef.current.tiltAngleX * 3}%, 
                            rgba(255, 255, 255, 0.3) 0%, 
                            rgba(255, 255, 255, 0.1) 20%,
                            rgba(255, 255, 255, 0) 40%
                          )
                        `,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        maskImage: "url(/assets/devices/gamepad.png)",
                        WebkitMaskImage: "url(/assets/devices/gamepad.png)",
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        opacity: tiltConfig.tiltEnable ? 0.5 : 0.2,
                        mixBlendMode: "screen",
                        willChange: "background-image, opacity",
                        transform: "translateZ(0)",
                        transition:
                          "background-image 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 2s ease-out",
                      }}
                    />
                  </div>

                  {/* Game screen - positioned according to SVG */}
                  <div className="absolute top-[94px] left-[76px] w-[247px] h-[272px] bg-[#eff8cb] rounded-lg overflow-hidden z-[-1]">
                    <div className="relative w-full h-full p-3 flex flex-col items-center justify-between">
                      <div className="absolute inset-0 mix-blend-multiply opacity-90 pointer-events-none" />
                      {renderMenuContent()}
                    </div>
                  </div>

                  {/* Control buttons positioned according to SVG */}
                  {/* Left button */}
                  <button
                    onClick={() => handleButtonClick("previous")}
                    className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                    style={{
                      top: "395px",
                      left: "80px",
                      width: "52px",
                      height: "52px",
                    }}
                    aria-label="Previous"
                  >
                    <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
                  </button>

                  {/* Right button */}
                  <button
                    onClick={() => handleButtonClick("next")}
                    className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                    style={{
                      top: "395px",
                      left: "142px",
                      width: "52px",
                      height: "52px",
                    }}
                    aria-label="Next"
                  >
                    <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
                  </button>

                  {/* Accept button (A) */}
                  <button
                    onClick={() => handleButtonClick("a")}
                    className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                    style={{
                      top: "395px",
                      left: "205px",
                      width: "52px",
                      height: "52px",
                    }}
                    aria-label="A"
                  >
                    <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
                  </button>

                  {/* Cancel button (B) */}
                  <button
                    onClick={() => handleButtonClick("b")}
                    className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                    style={{
                      top: "395px",
                      left: "267px",
                      width: "52px",
                      height: "52px",
                    }}
                    aria-label="B"
                  >
                    <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
                  </button>
                </div>
              </Tilt>
            </div>
          </div>
        </div>

        {/* Right column - Points Earned Panel */}
        <div className="w-full lg:w-1/4 flex justify-center order-3 min-h-[200px] min-w-[280px] px-0">
          <PointsEarnedPanel
            className="w-full h-full"
            currentPoints={userData.points}
            pointsMultiplier={walletData?.multiplier || 1.0}
            recentActivities={userActivities}
            isLoading={isActivitiesLoading}
          />
        </div>
      </div>
    </div>
  );
}
