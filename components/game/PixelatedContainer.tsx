import React from 'react';

interface PixelatedContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  bgcolor?: string;
  borderColor?: string;
  borderSize?: number;
  onClick?: () => void;
}

const PixelatedContainer: React.FC<PixelatedContainerProps> = ({
  children,
  className = "",
  style = {},
  noPadding = false,
  bgcolor = "#EBFFB7", // Default value if bgcolor is not provided
  borderColor = "#304700",
  borderSize = 5,
  onClick,
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        ...style,
        backgroundColor: bgcolor, // Use bgcolor prop instead of hardcoded color
      }}
      onClick={onClick}
    >
      {/* Edge extensions - vertical */}
      <div 
        className="absolute top-0 -left-[5px] h-full" 
        style={{
          width: `${borderSize}px`,
          left: `-${borderSize}px`,
          backgroundColor: borderColor
        }}
      />
      <div 
        className="absolute top-0 -right-[5px] h-full"
        style={{
          width: `${borderSize}px`,
          right: `-${borderSize}px`,
          backgroundColor: borderColor
        }}
      />
      
      {/* Edge extensions - horizontal */}    
      <div 
        className="absolute -top-[5px] left-0 w-full"
        style={{
          height: `${borderSize}px`,
          top: `-${borderSize}px`,
          backgroundColor: borderColor
        }}
      />
      <div 
        className="absolute -bottom-[5px] left-0 w-full"
        style={{
          height: `${borderSize}px`,
          bottom: `-${borderSize}px`,
          backgroundColor: borderColor
        }}
      />
      
      {/* Inner content */}
      <div className={`relative w-full h-full flex flex-col items-center justify-center ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>
    </div>
  );
};

export default PixelatedContainer; 