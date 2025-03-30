import React from "react";
import { StatusBar } from "../ui/status-bar";
import { PixelIcon } from "../ui/pixel-icon";

interface MenuRendererProps {
  menuStack: string[];
  selectedMenuItem: number | null;
  selectedDoctorItem: number | null;
  food: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  health: number;
  points: number;
  isDead: boolean;
  getCatEmotion: () => JSX.Element;
  handleButtonClick: (option: string) => void;
}

export const MenuRenderer = ({
  menuStack,
  selectedMenuItem,
  selectedDoctorItem,
  food,
  happiness,
  cleanliness,
  energy,
  health,
  points,
  isDead,
  getCatEmotion,
  handleButtonClick
}: MenuRendererProps) => {
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
  
  if (menuStack[menuStack.length - 1] === "main") {
    return (
      <>
        <div className="flex justify-between w-full mb-2">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-black">⭐</span>
              <span className="text-xs text-black">Points: <span className="font-numbers">{Math.round(points * 100) / 100}</span></span>
            </div>
          </div>
          <div className="flex-1 ml-2">
            <StatusBar value={health} type="health" />
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center">
          {getCatEmotion()}
        </div>
        <div className="flex justify-around w-full px-2 pt-2 border-t-2 border-gray-400">
          {["food", "clean", "doctor", "play"].map((icon, index) => (
            <PixelIcon
              key={index}
              icon={icon as "food" | "clean" | "doctor" | "play"}
              isHighlighted={selectedMenuItem === index}
            />
          ))}
        </div>
      </>
    );
  }
  
  if (menuStack[menuStack.length - 1] === "doctor") {
    return (
      <>
        <div className="grid grid-cols-2 gap-2 w-full mb-2">
          <StatusBar value={food} type="food" />
          <StatusBar value={energy} type="energy" />
          <StatusBar value={happiness} type="happiness" />
          <StatusBar value={cleanliness} type="cleanliness" />
        </div>
        <div className="text-xs mb-2">Select treatment option:</div>
        <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
        <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
          <PixelIcon icon="checkup" isHighlighted={selectedDoctorItem === 0} />
          <PixelIcon icon="vitamins" isHighlighted={selectedDoctorItem === 1} />
          <PixelIcon icon="vaccine" isHighlighted={selectedDoctorItem === 2} />
          <PixelIcon icon="surgery" isHighlighted={selectedDoctorItem === 3} />
        </div>
      </>
    );
  }
  
  // Add other menu screens as needed
  return null;
}; 