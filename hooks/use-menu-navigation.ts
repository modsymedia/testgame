import { useState, useCallback, useEffect } from "react"

type MenuItems = "food" | "clean" | "doctor" | "play"
type MenuStack = Array<"main" | "food" | "clean" | "doctor" | "play">

export function useMenuNavigation() {
  const [selectedMenuItem, setSelectedMenuItem] = useState<number | null>(null)
  const [isMenuActive, setIsMenuActive] = useState(false)
  const [menuStack, setMenuStack] = useState<MenuStack>(["main"])
  const [selectedFoodItem, setSelectedFoodItem] = useState<number | null>(null)
  const [selectedPlayItem, setSelectedPlayItem] = useState<number | null>(null)
  const [selectedCleanItem, setSelectedCleanItem] = useState<number | null>(null)
  const [selectedDoctorItem, setSelectedDoctorItem] = useState<number | null>(null)
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now())
  
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
    (option: "previous" | "next" | "a" | "b") => {
      setLastInteractionTime(Date.now())
      
      if (option === "previous" || option === "next") {
        setIsMenuActive(true)
        
        if (menuStack[menuStack.length - 1] === "main") {
          setSelectedMenuItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4
          })
        } else if (menuStack[menuStack.length - 1] === "food") {
          setSelectedFoodItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4
          })
        } else if (menuStack[menuStack.length - 1] === "play") {
          setSelectedPlayItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4
          })
        } else if (menuStack[menuStack.length - 1] === "clean") {
          setSelectedCleanItem((prev) => {
            if (prev === null) return option === "previous" ? 4 : 0
            return option === "previous" ? (prev - 1 + 5) % 5 : (prev + 1) % 5
          })
        } else if (menuStack[menuStack.length - 1] === "doctor") {
          setSelectedDoctorItem((prev) => {
            if (prev === null) return option === "previous" ? 3 : 0
            return option === "previous" ? (prev - 1 + 4) % 4 : (prev + 1) % 4
          })
        }
        return
      }

      if (option === "a") {
        if (menuStack[menuStack.length - 1] === "main") {
          if (selectedMenuItem === 0) {
            // Food menu
            setMenuStack([...menuStack, "food"])
            setSelectedFoodItem(0)
          } else if (selectedMenuItem === 1) {
            // Clean menu
            setMenuStack([...menuStack, "clean"])
            setSelectedCleanItem(0)
          } else if (selectedMenuItem === 2) {
            // Doctor menu
            setMenuStack([...menuStack, "doctor"])
            setSelectedDoctorItem(0)
          } else if (selectedMenuItem === 3) {
            // Play menu
            setMenuStack([...menuStack, "play"])
            setSelectedPlayItem(0)
          }
        }
      }

      if (option === "b") {
        if (menuStack.length > 1) {
          setMenuStack((prev) => prev.slice(0, -1))
          if (menuStack[menuStack.length - 2] === "main") {
            setSelectedMenuItem(0)
            setSelectedFoodItem(null)
            setSelectedPlayItem(null)
            setSelectedCleanItem(null)
            setSelectedDoctorItem(null)
          }
        } else {
          setSelectedMenuItem(null)
          setIsMenuActive(false)
        }
      }
    },
    [menuStack, selectedMenuItem]
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
  
  return {
    selectedMenuItem,
    isMenuActive,
    menuStack,
    selectedFoodItem,
    selectedPlayItem,
    selectedCleanItem,
    selectedDoctorItem,
    lastInteractionTime,
    setLastInteractionTime,
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