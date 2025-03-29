import React from 'react';
import Image from 'next/image';
import { ProgressSlider } from './progress-slider';
import PixelatedContainer from '@/components/PixelatedContainer';

interface PointsEarnedPanelProps {
  currentPoints: number;
  nextPoints: number;
  pointsPerSecond: number;
  timeUntilUpdate: number;
  progress: number;
}

const TASK_REWARDS = [
  { icon: '/assets/icons/foods/food-fish.png', name: 'Feed', points: 15 },
  { icon: '/assets/icons/games/game-ball.png', name: 'Play', points: 20 },
  { icon: '/assets/icons/hygiene/hygiene-bath.png', name: 'Clean', points: 18 },
  { icon: '/assets/icons/healings/healing.png', name: 'Heal', points: 25 },
];

export const PointsEarnedPanel = ({
  currentPoints,
  nextPoints,
  pointsPerSecond,
  timeUntilUpdate,
  progress
}: PointsEarnedPanelProps) => {
  return (
    <div className="w-full">
      <PixelatedContainer noPadding>
        <div className="w-full">
          {/* Header */}
          <div className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between border-b-4 border-[#304700]">
            <span className="text-md font-bold font-sk-eliz">Points Earned</span>
            <div className="flex items-center">
              <Image
                src="/assets/icons/info.svg"
                alt="Info"
                width={24}
                height={24}
                className="text-[#304700]"
              />
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#CADA9B] p-4">
            {/* Current Points */}
            <div className="text-[24px] font-sk-eliz text-[#304700] mb-4">
              {currentPoints}
            </div>

            {/* Points Rate */}
            <div className="mb-4">
              <div className="flex justify-between text-[12px] font-sk-eliz text-[#304700] mb-2">
                <span>+ {pointsPerSecond}/sec</span>
                <span>{timeUntilUpdate} until next update</span>
              </div>
              <ProgressSlider progress={progress} />
            </div>

            {/* Points Range */}
            <div className="flex justify-between mb-8">
              <div>
                <div className="text-[12px] font-sk-eliz text-[#72795F] mb-1">Current</div>
                <div className="text-[16px] font-sk-eliz text-[#304700]">{currentPoints}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-sk-eliz text-[#72795F] mb-1">Next</div>
                <div className="text-[16px] font-sk-eliz text-[#304700]">{nextPoints}</div>
              </div>
            </div>

            {/* Task Rewards Section */}
            <div>
              <div className="text-[16px] font-sk-eliz text-[#304700] mb-4">Task Rewards</div>
              <div className="grid grid-cols-2 gap-4">
                {TASK_REWARDS.map((task, index) => (
                  <div key={index} className="border-2 border-[#304700]">
                    <div className="bg-[#ebffb7] p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 relative">
                            <Image
                              src={task.icon}
                              alt={task.name}
                              width={22}
                              height={22}
                              className="object-contain"
                              style={{
                                imageRendering: 'pixelated',
                                width: '22px',
                                height: '22px'
                              }}
                            />
                          </div>
                          <span className="text-[12px] font-sk-eliz text-[#304700]">
                            {task.name}
                          </span>
                        </div>
                        <span className="text-[12px] font-sk-eliz text-[#304700]">
                          +{task.points}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PixelatedContainer>
    </div>
  );
}; 