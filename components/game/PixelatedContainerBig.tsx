import React from "react";

interface PixelatedContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  bgcolor?: string; // New prop for inner content background color
}

const PixelatedContainer: React.FC<PixelatedContainerProps> = ({
  children,
  className = "",
  style = {},
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
      {/* Corner squares - outside corners (reduced by 15% from 2px to 1.5px) */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#304700]" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#304700]" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-[#304700]" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-[#304700]" />

      {/* Edge extensions - vertical (reduced by 15% from 2px to 1.5px) */}
      <div className="absolute top-[6px] -left-1.5 w-1.5 h-[calc(100%-12px)] bg-[#304700]" />
      <div className="absolute top-[6px] -right-1.5 w-1.5 h-[calc(100%-12px)] bg-[#304700]" />

      {/* Edge extensions - horizontal (reduced by 15% from 2px to 1.5px) */}
      <div className="absolute -top-1.5 left-[6px] w-[calc(100%-12px)] h-1.5 bg-[#304700]" />
      <div className="absolute -bottom-1.5 left-[6px] w-[calc(100%-12px)] h-1.5 bg-[#304700]" />

      {/* Inner content */}
      <div className={`relative `}>{children}</div>
    </div>
  );
};

export default PixelatedContainer;
