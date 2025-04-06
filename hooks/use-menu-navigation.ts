import { useState, useCallback, useEffect } from "react"

type MenuItems = "food" | "clean" | "doctor" | "play"
type MenuStack = Array<"main" | "food" | "clean" | "doctor" | "play">

// Add this interface to handle cooldown states
interface CooldownState {
  feed: boolean;
  play: boolean;
  clean: boolean;
  heal: boolean;
}

// Add interface for locked items
interface LockedItemsState {
  [key: string]: boolean;
}

export function useMenuNavigation() {
  const [menuStack, setMenuStack] = useState<MenuStack>(["main"])
  const [selectedMenuItem, setSelectedMenuItem] = useState<number | null>(null)
  const [selectedFoodItem, setSelectedFoodItem] = useState<number | null>(null)
  const [selectedPlayItem, setSelectedPlayItem] = useState<number | null>(null)
  const [selectedCleanItem, setSelectedCleanItem] = useState<number | null>(null)
  const [selectedDoctorItem, setSelectedDoctorItem] = useState<number | null>(null)
  const [isMenuActive, setIsMenuActive] = useState(false)
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now())

  // Array of menu items for the main menu
  const menuItemsArray: MenuItems[] = ["food", "clean", "doctor", "play"]

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
  
  const handleButtonNavigation = useCallback(
    (button: string, cooldowns: CooldownState, unlockedItems: LockedItemsState) => {
      if (button === "a") {
        const selectedItem = menuItemsArray[selectedMenuItem || 0]
        setMenuStack([...menuStack, selectedItem])
        setSelectedFoodItem(0)
        setSelectedPlayItem(0)
        setSelectedCleanItem(0)
        setSelectedDoctorItem(0)
      } else if (button === "b") {
        if (menuStack.length > 0) {
          setMenuStack(menuStack.slice(0, -1))
          if (menuStack.length === 1) {
            setSelectedMenuItem(0)
          }
        }
      } else if (menuStack.length === 0 || (menuStack.length === 1 && menuStack[0] === "main")) {
        // Main menu navigation
        if (button === "previous") {
          setSelectedMenuItem(
            selectedMenuItem === 0 ? menuItemsArray.length - 1 : selectedMenuItem! - 1
          )
        } else if (button === "next") {
          setSelectedMenuItem(
            selectedMenuItem === menuItemsArray.length - 1 ? 0 : selectedMenuItem! + 1
          )
        }
      } else if (menuStack.length > 0) {
        // Submenu navigation
        const currentMenu = menuStack[menuStack.length - 1]
        
        if (currentMenu === "food") {
          const foodItems = ["fish", "cookie", "catFood", "kibble"]
          // Only skip items on cooldown, not locked items
          if (button === "previous") {
            let newIndex = selectedFoodItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === 0 ? foodItems.length - 1 : newIndex - 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.feed || attempts >= foodItems.length) break
            } while (cooldowns.feed && attempts < foodItems.length)
            setSelectedFoodItem(newIndex)
          } else if (button === "next") {
            let newIndex = selectedFoodItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === foodItems.length - 1 ? 0 : newIndex + 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.feed || attempts >= foodItems.length) break
            } while (cooldowns.feed && attempts < foodItems.length)
            setSelectedFoodItem(newIndex)
          }
        } else if (currentMenu === "play") {
          const playItems = ["laser", "feather", "ball", "puzzle"]
          if (button === "previous") {
            let newIndex = selectedPlayItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === 0 ? playItems.length - 1 : newIndex - 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.play || attempts >= playItems.length) break
            } while (cooldowns.play && attempts < playItems.length)
            setSelectedPlayItem(newIndex)
          } else if (button === "next") {
            let newIndex = selectedPlayItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === playItems.length - 1 ? 0 : newIndex + 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.play || attempts >= playItems.length) break
            } while (cooldowns.play && attempts < playItems.length)
            setSelectedPlayItem(newIndex)
          }
        } else if (currentMenu === "clean") {
          const cleanItems = ["brush", "bath", "nails", "dental"]
          if (button === "previous") {
            let newIndex = selectedCleanItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === 0 ? cleanItems.length - 1 : newIndex - 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.clean || attempts >= cleanItems.length) break
            } while (cooldowns.clean && attempts < cleanItems.length)
            setSelectedCleanItem(newIndex)
          } else if (button === "next") {
            let newIndex = selectedCleanItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === cleanItems.length - 1 ? 0 : newIndex + 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.clean || attempts >= cleanItems.length) break
            } while (cooldowns.clean && attempts < cleanItems.length)
            setSelectedCleanItem(newIndex)
          }
        } else if (currentMenu === "doctor") {
          const doctorItems = ["checkup", "vitamins", "vaccine", "surgery"]
          if (button === "previous") {
            let newIndex = selectedDoctorItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === 0 ? doctorItems.length - 1 : newIndex - 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.heal || attempts >= doctorItems.length) break
            } while (cooldowns.heal && attempts < doctorItems.length)
            setSelectedDoctorItem(newIndex)
          } else if (button === "next") {
            let newIndex = selectedDoctorItem || 0
            let attempts = 0
            do {
              newIndex = newIndex === doctorItems.length - 1 ? 0 : newIndex + 1
              attempts++
              // Only skip if on cooldown, not if locked
              if (!cooldowns.heal || attempts >= doctorItems.length) break
            } while (cooldowns.heal && attempts < doctorItems.length)
            setSelectedDoctorItem(newIndex)
          }
        }
      }
      
      setLastInteractionTime(Date.now())
      setIsMenuActive(true)
    },
    [
      menuItemsArray,
      menuStack,
      selectedMenuItem,
      selectedFoodItem,
      selectedPlayItem,
      selectedCleanItem,
      selectedDoctorItem,
    ]
  )
  
  const resetMenu = useCallback(() => {
    setMenuStack(["main"])
    setSelectedMenuItem(null)
    setSelectedFoodItem(null)
    setSelectedPlayItem(null)
    setSelectedCleanItem(null)
    setSelectedDoctorItem(null)
    setIsMenuActive(false)
  }, [])
  
  // Close menu after inactivity
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now()
      const inactiveTime = now - lastInteractionTime
      
      if (isMenuActive && inactiveTime > 15000) { // 15 seconds of inactivity
        resetMenu()
      }
    }, 1000) // Check every second
    
    return () => clearInterval(intervalId)
  }, [isMenuActive, lastInteractionTime, resetMenu])

  return {
    menuStack,
    selectedMenuItem,
    selectedFoodItem,
    selectedPlayItem,
    selectedCleanItem,
    selectedDoctorItem,
    isMenuActive,
    handleButtonNavigation,
    resetMenu,
    setMenuStack,
    setSelectedMenuItem,
    setSelectedFoodItem,
    setSelectedPlayItem,
    setSelectedCleanItem,
    setSelectedDoctorItem
  }
} 