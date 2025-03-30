/**
 * Cap a stat value between 0 and 100
 */
export function capStat(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

/**
 * Format points to 2 decimal places
 */
export function formatPoints(points: number): number {
  return Math.round(points * 100) / 100;
}

/**
 * Get health status text based on health value
 */
export function getHealthStatus(health: number): string {
  if (health > 80) return "Excellent";
  if (health > 60) return "Good";
  if (health > 40) return "Fair";
  if (health > 20) return "Poor";
  return "Critical";
}

/**
 * Get the appropriate healing icon path based on health status
 */
export function getHealthIcon(health: number): string {
  if (health > 80) return "/assets/icons/healings/healing.png";
  if (health > 60) return "/assets/icons/healings/medicine.png";
  if (health > 40) return "/assets/icons/healings/vaccine.png";
  return "/assets/icons/healings/surgery.png";
}

/**
 * Calculate health based on various stats
 */
export function calculateHealth(food: number, happiness: number, cleanliness: number, energy: number): number {
  let newHealth = (food * 0.4) + (happiness * 0.2) + (cleanliness * 0.2) + (energy * 0.2);
  
  // Apply penalty for overfeeding
  if (food > 100) {
    newHealth -= (food - 100) * 0.1;
  }
  
  return Math.max(newHealth, 0);
} 