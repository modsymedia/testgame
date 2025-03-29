import React from 'react';
import PixelatedContainer from '@/components/PixelatedContainer';

interface ProgressSliderProps {
  progress: number; // 0 to 100
}

export const ProgressSlider = ({ progress }: ProgressSliderProps) => {
  return (
    <div className="relative w-full">
      <PixelatedContainer noPadding>
        <div className="w-full h-4 flex">
          <div 
            className="h-full bg-[#A7BA75]" 
            style={{ width: `${progress}%` }}
          />
          <div 
            className="h-full bg-[#EBFFB7]" 
            style={{ width: `${100 - progress}%` }}
          />
        </div>
      </PixelatedContainer>
    </div>
  );
}; 