import React from 'react';
import PixelatedContainer from './PixelatedContainer';

interface CustomSliderProps {
  value: number;
  maxValue?: number;
  label?: string;
  className?: string;
  barColor?: string;
  backgroundColor?: string;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  maxValue = 100,
  label,
  className = "",
  barColor = "#a7ba75",
  backgroundColor = "#EBFFB7"
}) => {
  const percentage = Math.min(100, (value / maxValue) * 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="text-sm font-pixel mb-1 text-[#304700]">
          {label}: {Math.round(value)}/{maxValue}
        </div>
      )}
      <PixelatedContainer
        className="h-3"
        bgcolor={backgroundColor}
        borderColor="#61654a"
        borderSize={2}
        noPadding
      >
        <div className="w-full h-full bg-gray-200/20">
          <div
            className="h-full transition-all duration-300 ease-in-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: barColor
            }}
          />
        </div>
      </PixelatedContainer>
    </div>
  );
};

export default CustomSlider; 