import React from 'react';

interface PixelatedContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  bgcolor?: string;
}

const PixelatedContainer: React.FC<PixelatedContainerProps> = ({
  children,
  className = "",
  style = {},
  noPadding = false,
  bgcolor = "#EBFFB7", // Default value if bgcolor is not provided
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        ...style,
        backgroundColor: bgcolor, // Use bgcolor prop instead of hardcoded color
      }}
    >
      {/* Edge extensions - vertical */}
      <div className="absolute top-0 -left-[6px] w-[6px] h-full bg-[#304700]" />
      <div className="absolute top-0 -right-[6px] w-[6px] h-full bg-[#304700]" />
      
      {/* Edge extensions - horizontal */}    
      <div className="absolute -top-[6px] left-0 w-full h-[6px] bg-[#304700]" />
      <div className="absolute -bottom-[6px] left-0 w-full h-[6px] bg-[#304700]" />
      
      {/* Inner content */}
      <div className={`relative w-full h-full flex items-center justify-center ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>
    </div>
  );
};

export default PixelatedContainer; 