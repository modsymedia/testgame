"use client";

import { useState } from "react";
import Image from "next/image";

interface StatusBarProps {
  value: number;
  type: "food" | "happiness" | "cleanliness" | "energy" | "health";
}

export function StatusBar({ value, type }: StatusBarProps) {
  const getIcon = () => {
    switch (type) {
      case "food":
        return (
          <Image
            src="/assets/icons/foods/foods.png"
            alt="Food"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        );
      case "happiness":
        return (
          <Image
            src="/assets/icons/healings/medicine.png"
            alt="Happiness"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        );
      case "cleanliness":
        return (
          <Image
            src="/assets/icons/hygiene/hygienes.png"
            alt="Cleanliness"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        );
      case "energy":
        return value <= 20 ? (
          <Image
            src="/assets/icons/healings/medicine.png"
            alt="Energy Low"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <Image
            src="/assets/icons/status/statusbar-coins(points).png"
            alt="Energy"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        );
      case "health":
        return value <= 40 ? (
          <Image
            src="/assets/icons/healings/surgery.png"
            alt="Health Critical"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        ) : value <= 70 ? (
          <Image
            src="/assets/icons/healings/vaccine.png"
            alt="Health Low"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <Image
            src="/assets/icons/healings/healing.png"
            alt="Health"
            width={24}
            height={24}
            unoptimized={true}
            style={{ imageRendering: "pixelated" }}
          />
        );
      default:
        return "(?)";
    }
  };

  const getStatus = (value: number, type: string) => {
    const labels = {
      food: "Food",
      happiness: "Mood",
      cleanliness: "Clean",
      energy: "Energy",
      health: "Health",
    };

    return (
      labels[type as keyof typeof labels] ||
      type.charAt(0).toUpperCase() + type.slice(1)
    );
  };

  return (
    <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden">
      <div
        className={`h-full ${
          value <= 20
            ? "bg-red-500"
            : value <= 60
            ? "bg-yellow-500"
            : type === "food" && value > 100
            ? "bg-orange-500"
            : "bg-green-500"
        }`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}
