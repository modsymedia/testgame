import React from 'react';

interface PixelatedContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
  bgcolor?: string;
  onClick?: () => void;
}

const PixelatedContainer: React.FC<PixelatedContainerProps> = ({
  children,
  className = "",
  style = {},
  noPadding = false,
  bgcolor = "#EBFFB7", // Default value if bgcolor is not provided
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
      {/* Edge extensions - vertical (reduced by 15% from 6px to 5px) */}
      <div className="absolute top-0 -left-[5px] w-[5px] h-full bg-[#304700]" />
      <div className="absolute top-0 -right-[5px] w-[5px] h-full bg-[#304700]" />
      
      {/* Edge extensions - horizontal (reduced by 15% from 6px to 5px) */}    
      <div className="absolute -top-[5px] left-0 w-full h-[5px] bg-[#304700]" />
      <div className="absolute -bottom-[5px] left-0 w-full h-[5px] bg-[#304700]" />
      
      {/* Inner content */}
      <div className={`relative w-full h-full flex flex-col items-center justify-center ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>
    </div>
  );
};

export default PixelatedContainer; 