"use client";

import React from "react";
import PixelatedContainer from "@/components/game/PixelatedContainer";
import Image from "next/image";

const WithdrawPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#304700] font-pixelify mb-6">Withdraw</h1>
      
      <PixelatedContainer className="p-4 mb-4">
        <div className="bg-[#ebffb7] p-4 rounded">
          <h2 className="text-xl font-bold text-[#304700] font-pixelify mb-4">Available Points</h2>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg text-[#304700] font-pixelify">Current Balance:</span>
            <span className="text-2xl font-bold text-[#304700] font-num">286</span>
          </div>
          <button className="w-full bg-[#304700] text-[#ebffb7] font-pixelify py-2 px-4 rounded">
            Withdraw All
          </button>
        </div>
      </PixelatedContainer>
      
      <PixelatedContainer className="p-4">
        <div className="bg-[#ebffb7] p-4 rounded">
          <h2 className="text-xl font-bold text-[#304700] font-pixelify mb-4">Withdrawal History</h2>
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between border-b border-[#304700] py-2 last:border-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#CADA9B] rounded-full flex items-center justify-center mr-2">
                  <Image 
                    src="/assets/icons/withdraw.svg" 
                    alt="Withdraw" 
                    width={16} 
                    height={16} 
                  />
                </div>
                <div>
                  <span className="text-sm text-[#304700] font-pixelify">Withdraw #{item}</span>
                  <p className="text-xs text-[#304700] opacity-70 font-pixelify">April {item}, 2025</p>
                </div>
              </div>
              <span className="text-lg font-bold text-[#304700] font-num">+{item * 50}</span>
            </div>
          ))}
        </div>
      </PixelatedContainer>
    </div>
  );
};

export default WithdrawPage; 