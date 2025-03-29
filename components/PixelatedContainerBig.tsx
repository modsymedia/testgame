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
      {/* Corner squares - outside corners */}
      <div className="absolute top-0 left-0 w-2 h-2 bg-[#304700]" />
      <div className="absolute top-0 right-0 w-2 h-2 bg-[#304700]" />
      <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#304700]" />
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#304700]" />

      {/* Edge extensions - vertical */}
      <div className="absolute top-[8px] -left-2 w-2 h-[calc(100%-16px)] bg-[#304700]" />
      <div className="absolute top-[8px] -right-2 w-2 h-[calc(100%-16px)] bg-[#304700]" />

      {/* Edge extensions - horizontal */}
      <div className="absolute -top-2 left-[8px] w-[calc(100%-16px)] h-2 bg-[#304700]" />
      <div className="absolute -bottom-2 left-[8px] w-[calc(100%-16px)] h-2 bg-[#304700]" />

      {/* Inner content */}
      <div className={`relative `}>{children}</div>
    </div>
  );
};

export default PixelatedContainer;
