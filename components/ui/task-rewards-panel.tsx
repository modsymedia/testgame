import React from 'react';
import Image from 'next/image';
import PixelatedContainer from '@/components/PixelatedContainer';

interface TaskReward {
  icon: string;
  name: string;
  points: number;
}

const TASK_REWARDS: TaskReward[] = [
  { icon: '/assets/icons/foods/food-fish.png', name: 'Feed', points: 15 },
  { icon: '/assets/icons/games/game-ball.png', name: 'Play', points: 20 },
  { icon: '/assets/icons/hygiene/hygiene-bath.png', name: 'Clean', points: 18 },
  { icon: '/assets/icons/healings/healing.png', name: 'Heal', points: 25 },
];

export const TaskRewardsPanel = () => {
  return (
    <div className="w-full">
      <PixelatedContainer>
        <div className="w-full">
          {/* Header */}
          <div className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between border-b-4 border-[#304700] mb-4">
            <span className="text-md font-bold font-sk-eliz">Task Rewards</span>
          </div>

          {/* Body */}
          <div className="bg-[#CADA9B] p-4">
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
      </PixelatedContainer>
    </div>
  );
} 